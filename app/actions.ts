'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { Resend } from 'resend';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Обязательно нужен для Админки

// Клиенты
const supabase = createClient(supabaseUrl, supabaseAnonKey);
// Админский клиент для операций с категориями (обход RLS)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const STORE_EMAIL = 'tvoy-email@example.com'; // ВПИШИ СВОЙ EMAIL

// --- ХЕЛПЕРЫ ---
function generateSlug(text: string) {
  return text.toLowerCase().trim()
    .replace(/а/g, 'a').replace(/б/g, 'b').replace(/в/g, 'v').replace(/г/g, 'g')
    .replace(/д/g, 'd').replace(/е/g, 'e').replace(/ё/g, 'e').replace(/ж/g, 'zh')
    .replace(/з/g, 'z').replace(/и/g, 'i').replace(/й/g, 'y').replace(/к/g, 'k')
    .replace(/л/g, 'l').replace(/м/g, 'm').replace(/н/g, 'n').replace(/о/g, 'o')
    .replace(/п/g, 'p').replace(/р/g, 'r').replace(/с/g, 's').replace(/т/g, 't')
    .replace(/у/g, 'u').replace(/ф/g, 'f').replace(/х/g, 'h').replace(/ц/g, 'c')
    .replace(/ч/g, 'ch').replace(/ш/g, 'sh').replace(/щ/g, 'sch').replace(/ь/g, '')
    .replace(/ы/g, 'y').replace(/ъ/g, '').replace(/э/g, 'e').replace(/ю/g, 'yu')
    .replace(/я/g, 'ya').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

// --- УПРАВЛЕНИЕ КАТЕГОРИЯМИ (V2 - Слэши) ---

export async function createCategory(name: string, parentPath: string | null) {
  try {
    const slug = generateSlug(name);
    // Новый формат пути: parent/slug
    const path = parentPath ? `${parentPath}/${slug}` : slug;
    const level = path.split('/').length;

    // Проверка дублей
    const { data: existing } = await supabaseAdmin.from('categories').select('id').eq('path', path).maybeSingle();
    if (existing) return { success: false, error: 'Категория уже существует' };

    const { error } = await supabaseAdmin.from('categories').insert({
      name,
      path,
      parent_path: parentPath, // Важно для дерева
      level,
      slug
    });

    if (error) throw error;
    revalidatePath('/admin/categories');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function renameCategoryV2(oldPath: string, newName: string) {
  try {
    // 1. Узнаем родителя
    const { data: currentCat } = await supabaseAdmin.from('categories').select('parent_path').eq('path', oldPath).single();
    if (!currentCat) throw new Error('Категория не найдена');

    const newSlug = generateSlug(newName);
    const parentPath = currentCat.parent_path;
    const newPath = parentPath ? `${parentPath}/${newSlug}` : newSlug;

    if (newPath === oldPath) return { success: true };

    // 2. Обновляем саму категорию
    await supabaseAdmin.from('categories').update({ name: newName, path: newPath, slug: newSlug }).eq('path', oldPath);

    // 3. Обновляем все подкатегории (path и parent_path)
    // Находим детей
    const { data: children } = await supabaseAdmin.from('categories').select('*').like('path', `${oldPath}/%`);
    if (children) {
      for (const child of children) {
        const childNewPath = child.path.replace(oldPath, newPath);
        const childNewParent = child.parent_path ? child.parent_path.replace(oldPath, newPath) : null;
        await supabaseAdmin.from('categories').update({ path: childNewPath, parent_path: childNewParent }).eq('id', child.id);
      }
    }

    // 4. Обновляем товары (ссылки на категории)
    // Товары в подпапках
    const { data: productsInSub } = await supabaseAdmin.from('products').select('id, category').ilike('category', `${oldPath}/%`);
    if (productsInSub) {
      for (const p of productsInSub) {
        const newCat = p.category.replace(oldPath, newPath);
        await supabaseAdmin.from('products').update({ category: newCat }).eq('id', p.id);
      }
    }
    // Товары в самой папке
    await supabaseAdmin.from('products').update({ category: newPath }).eq('category', oldPath);

    revalidatePath('/admin/categories');
    return { success: true };
  } catch (e: any) {
    console.error(e);
    return { success: false, error: e.message };
  }
}

export async function deleteCategoryV2(targetPath: string) {
  try {
    // 1. Сначала отвязываем товары (делаем NULL), НЕ УДАЛЯЕМ ИХ!
    // Ищем точное совпадение или вложенные
    await supabaseAdmin
      .from('products')
      .update({ category: null })
      .or(`category.eq.${targetPath},category.like.${targetPath}/%`);

    // 2. Удаляем категорию и все подкатегории
    const { error } = await supabaseAdmin
      .from('categories')
      .delete()
      .or(`path.eq.${targetPath},path.like.${targetPath}/%`);

    if (error) throw error;

    revalidatePath('/admin/categories');
    return { success: true };
  } catch (e: any) {
    console.error('Delete error:', e);
    return { success: false, error: e.message };
  }
}

export async function syncCategories() {
  // Эта функция восстанавливает категории из товаров (если вдруг удалили лишнее)
  // Но теперь она создает их правильно, со слэшами
  try {
    const { data: products } = await supabaseAdmin.from('products').select('category').not('category', 'is', null);
    if (!products) return { success: true };

    const uniqueCats = Array.from(new Set(products.map(p => p.category))).filter(Boolean);

    for (const catPath of uniqueCats) {
      // catPath: "elektronika/telefony"
      const parts = catPath.split('/'); 
      let currentPath = '';

      for (let i = 0; i < parts.length; i++) {
        const partSlug = parts[i];
        // Делаем имя красивым (первая буква заглавная)
        const name = partSlug.charAt(0).toUpperCase() + partSlug.slice(1);
        
        const parentPath = currentPath === '' ? null : currentPath;
        currentPath = currentPath === '' ? partSlug : `${currentPath}/${partSlug}`;

        // Если такой категории нет - создаем
        const { data: existing } = await supabaseAdmin.from('categories').select('id').eq('path', currentPath).maybeSingle();
        if (!existing) {
           await supabaseAdmin.from('categories').insert({
             name, 
             slug: partSlug,
             path: currentPath,
             parent_path: parentPath,
             level: i + 1
           });
        }
      }
    }
    revalidatePath('/admin/categories');
    return { success: true };
  } catch (e) {
    return { success: false };
  }
}

// --- ЛОГИКА EMAIL И ЗАКАЗОВ (ОСТАВЛЯЕМ КАК БЫЛО) ---

async function getOrFixUserEmail(userId: string) {
  if (!userId) return null;
  const { data: profile } = await supabaseAdmin.from('profiles').select('email').eq('id', userId).single();
  if (profile?.email) return profile.email;

  const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (userData?.user?.email) {
      const foundEmail = userData.user.email;
      await supabaseAdmin.from('profiles').update({ email: foundEmail }).eq('id', userId);
      return foundEmail;
  }
  return null;
}

async function sendNotificationEmail(orderId: number, text: string, to: string, subject: string) {
  if (!resend) return;
  try {
    await resend.emails.send({
      from: 'SPARTAK Shop <onboarding@resend.dev>',
      to, subject,
      html: `<h2>${subject}</h2><p>Заказ <b>#${orderId}</b></p><p>${text}</p>`
    });
  } catch (err) { console.error('Email error:', err); }
}

export async function sendOrderMessage(orderId: number, text: string, isAdmin: boolean = false, userId?: string) {
  await supabaseAdmin.from('order_messages').insert([{ order_id: orderId, text, is_admin: isAdmin, sender_id: userId || null }]);
  const { data: order } = await supabaseAdmin.from('orders').select('user_id').eq('id', orderId).single();
  if (order) {
    const targetEmail = isAdmin ? await getOrFixUserEmail(order.user_id) : STORE_EMAIL;
    if (targetEmail) await sendNotificationEmail(orderId, text, targetEmail, isAdmin ? 'Новое сообщение' : 'Вопрос от клиента');
  }
  revalidatePath('/admin/orders');
  return { success: true };
}

export async function updateOrderStatus(orderId: number, newStatus: string) {
  await supabaseAdmin.from('orders').update({ status: newStatus }).eq('id', orderId);
  const { data: order } = await supabaseAdmin.from('orders').select('user_id').eq('id', orderId).single();
  if (order?.user_id) {
    const email = await getOrFixUserEmail(order.user_id);
    if (email) await sendNotificationEmail(orderId, `Статус: ${newStatus}`, email, `Заказ #${orderId} обновлен`);
  }
  revalidatePath('/admin/orders');
  return { success: true };
}

export async function submitOrder(formData: FormData, items: any[], total: number, userId?: string) {
  const { data: order, error } = await supabaseAdmin.from('orders').insert([{ 
    customer_name: formData.get('name'), customer_phone: formData.get('phone'), 
    customer_comment: formData.get('comment'), total_price: total, user_id: userId || null 
  }]).select().single();
  if (error || !order) return { success: false };
  
  const orderItems = items.map(item => ({ 
    order_id: order.id, product_id: item.id, product_name: item.name, quantity: item.quantity, price: item.price 
  }));
  await supabaseAdmin.from('order_items').insert(orderItems);
  
  if (userId) await getOrFixUserEmail(userId);
  revalidatePath('/admin/orders');
  return { success: true, orderId: order.id };
}

// --- GETTERS (Обычные запросы) ---
export async function getOrderMessages(orderId: number) {
  const { data } = await supabase.from('order_messages').select('*').eq('order_id', orderId).order('created_at', { ascending: true });
  return data || [];
}
export async function getOrderItems(orderId: number) {
  const { data } = await supabase.from('order_items').select('*, products(*)').eq('order_id', orderId);
  return data || [];
}
export async function getProductsByCategory(category: string) {
  const { data } = await supabase.from('products').select('*').ilike('category', `${category}%`).limit(50);
  return data || [];
}