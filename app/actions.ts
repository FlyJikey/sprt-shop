'use server';

import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { Resend } from 'resend';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Клиенты
const supabase = createClient(supabaseUrl, supabaseAnonKey);
// Админский клиент для операций с категориями и заказами (обход RLS)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const STORE_EMAIL = 'tvoy-email@example.com';

// --- СИСТЕМА БЕЗОПАСНОСТИ ---
async function verifyAdminSession() {
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) { }
      }
    }
  );

  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabaseAuth.from('profiles').select('role').eq('id', user.id).single();
  return profile && (profile.role === 'admin' || profile.role === 'employee');
}

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
  if (!(await verifyAdminSession())) return { success: false, error: 'Unauthorized' };

  try {
    const slug = generateSlug(name);
    const path = parentPath ? `${parentPath}/${slug}` : slug;
    const level = path.split('/').length;

    const { data: existing } = await supabaseAdmin.from('categories').select('id').eq('path', path).maybeSingle();
    if (existing) return { success: false, error: 'Категория уже существует' };

    const { error } = await supabaseAdmin.from('categories').insert({
      name, path, parent_path: parentPath, level, slug
    });

    if (error) throw error;
    revalidatePath('/admin/categories');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function renameCategoryV2(oldPath: string, newName: string) {
  if (!(await verifyAdminSession())) return { success: false, error: 'Unauthorized' };

  try {
    const { data: currentCat } = await supabaseAdmin.from('categories').select('parent_path').eq('path', oldPath).single();
    if (!currentCat) throw new Error('Категория не найдена');

    const newSlug = generateSlug(newName);
    const parentPath = currentCat.parent_path;
    const newPath = parentPath ? `${parentPath}/${newSlug}` : newSlug;

    if (newPath === oldPath) return { success: true };

    await supabaseAdmin.from('categories').update({ name: newName, path: newPath, slug: newSlug }).eq('path', oldPath);

    const { data: children } = await supabaseAdmin.from('categories').select('*').like('path', `${oldPath}/%`);
    if (children) {
      for (const child of children) {
        const childNewPath = child.path.replace(oldPath, newPath);
        const childNewParent = child.parent_path ? child.parent_path.replace(oldPath, newPath) : null;
        await supabaseAdmin.from('categories').update({ path: childNewPath, parent_path: childNewParent }).eq('id', child.id);
      }
    }

    const { data: productsInSub } = await supabaseAdmin.from('products').select('id, category').ilike('category', `${oldPath}/%`);
    if (productsInSub) {
      for (const p of productsInSub) {
        const newCat = p.category.replace(oldPath, newPath);
        await supabaseAdmin.from('products').update({ category: newCat }).eq('id', p.id);
      }
    }
    await supabaseAdmin.from('products').update({ category: newPath }).eq('category', oldPath);

    revalidatePath('/admin/categories');
    return { success: true };
  } catch (e: any) {
    console.error(e);
    return { success: false, error: e.message };
  }
}

export async function deleteCategoryV2(targetPath: string) {
  if (!(await verifyAdminSession())) return { success: false, error: 'Unauthorized' };

  try {
    await supabaseAdmin
      .from('products')
      .update({ category: null })
      .or(`category.eq.${targetPath},category.like.${targetPath}/%`);

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
  if (!(await verifyAdminSession())) return { success: false };

  try {
    const { data: products } = await supabaseAdmin.from('products').select('category').not('category', 'is', null);
    if (!products) return { success: true };

    const uniqueCats = Array.from(new Set(products.map(p => p.category))).filter(Boolean);

    for (const catPath of uniqueCats) {
      const parts = catPath.split('/');
      let currentPath = '';

      for (let i = 0; i < parts.length; i++) {
        const partSlug = parts[i];
        const name = partSlug.charAt(0).toUpperCase() + partSlug.slice(1);
        const parentPath = currentPath === '' ? null : currentPath;
        currentPath = currentPath === '' ? partSlug : `${currentPath}/${partSlug}`;

        const { data: existing } = await supabaseAdmin.from('categories').select('id').eq('path', currentPath).maybeSingle();
        if (!existing) {
          await supabaseAdmin.from('categories').insert({
            name, slug: partSlug, path: currentPath, parent_path: parentPath, level: i + 1
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

// --- ЛОГИКА EMAIL И ЗАКАЗОВ ---

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
  // 1. Сохраняем сообщение
  await supabaseAdmin.from('order_messages').insert([{ order_id: orderId, text, is_admin: isAdmin, sender_id: userId || null }]);

  // 2. Обновляем статус непрочитанных в заказе
  const updateData = isAdmin ? { has_unread_user: true } : { has_unread_admin: true };
  await supabaseAdmin.from('orders').update(updateData).eq('id', orderId);

  // 3. Отправляем email уведомление
  const { data: order } = await supabaseAdmin.from('orders').select('user_id').eq('id', orderId).single();
  if (order) {
    const targetEmail = isAdmin ? await getOrFixUserEmail(order.user_id) : STORE_EMAIL;
    if (targetEmail) await sendNotificationEmail(orderId, text, targetEmail, isAdmin ? 'Новое сообщение от магазина' : `Новое сообщение по заказу #${orderId}`);
  }
  revalidatePath('/admin/orders');
  return { success: true };
}

export async function markOrderMessagesRead(orderId: number, asAdmin: boolean) {
  const updateData = asAdmin ? { has_unread_admin: false } : { has_unread_user: false };
  await supabaseAdmin.from('orders').update(updateData).eq('id', orderId);
  return { success: true };
}

export async function updateOrderStatus(orderId: number, newStatus: string) {
  if (!(await verifyAdminSession())) return { success: false, error: 'Unauthorized' };

  const updateData: any = { status: newStatus };
  if (newStatus === 'ready') updateData.ready_at = new Date().toISOString();
  if (newStatus === 'done') updateData.done_at = new Date().toISOString();

  await supabaseAdmin.from('orders').update(updateData).eq('id', orderId);
  const { data: order } = await supabaseAdmin.from('orders').select('user_id').eq('id', orderId).single();
  if (order?.user_id) {
    const email = await getOrFixUserEmail(order.user_id);
    if (email) await sendNotificationEmail(orderId, `Статус: ${newStatus}`, email, `Заказ #${orderId} обновлен`);
  }
  revalidatePath('/admin/orders');
  return { success: true };
}

export async function submitOrder(formData: FormData, items: any[], total: number, userId?: string) {
  // 1. Проверяем остатки в базе данных
  const productIds = items.map(i => i.id);
  const { data: dbProducts } = await supabaseAdmin.from('products').select('id, name, stock').in('id', productIds);

  if (!dbProducts) return { success: false, error: 'Ошибка при проверке товаров' };

  const stockMap: Record<number, { stock: number, name: string }> = {};
  dbProducts.forEach(p => {
    stockMap[p.id] = { stock: p.stock ?? 99, name: p.name };
  });

  for (const item of items) {
    const dbItem = stockMap[item.id];
    if (!dbItem) return { success: false, error: `Товар "${item.name}" не найден` };
    if (dbItem.stock < item.quantity) {
      return {
        success: false,
        error: `Недостаточно товара "${dbItem.name}". Доступно: ${dbItem.stock}`
      };
    }
  }

  // 2. Списываем остатки
  for (const item of items) {
    const newStock = stockMap[item.id].stock - item.quantity;
    await supabaseAdmin.from('products').update({ stock: newStock }).eq('id', item.id);
  }

  // 3. Создаем заказ
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

// --- ИЗБРАННОЕ (НОВОЕ) ---

export async function toggleFavorite(productId: number, userId: string) {
  if (!userId) return { success: false, error: 'Unauthorized' };

  try {
    // Проверяем, есть ли уже в избранном
    const { data: existing } = await supabaseAdmin
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .maybeSingle();

    if (existing) {
      // Удаляем
      await supabaseAdmin.from('favorites').delete().eq('id', existing.id);
      return { success: true, action: 'removed' };
    } else {
      // Добавляем
      await supabaseAdmin.from('favorites').insert({ user_id: userId, product_id: productId });
      return { success: true, action: 'added' };
    }
  } catch (e: any) {
    console.error('Favorite toggle error:', e);
    return { success: false, error: e.message };
  }
}

export async function getUserFavorites(userId: string) {
  if (!userId) return [];
  const { data } = await supabaseAdmin.from('favorites').select('product_id').eq('user_id', userId);
  return data?.map(f => f.product_id) || [];
}

// --- ЛИСТ ОЖИДАНИЯ (WAITLIST) ---

export async function toggleWaitlist(productId: number, userId: string) {
  if (!userId) return { success: false, error: 'Unauthorized' };

  try {
    // Проверяем, есть ли уже в листе
    const { data: existing } = await supabaseAdmin
      .from('waitlist')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .maybeSingle();

    if (existing) {
      // Удаляем
      await supabaseAdmin.from('waitlist').delete().eq('id', existing.id);
      revalidatePath('/profile');
      return { success: true, action: 'removed' };
    } else {
      // Добавляем
      await supabaseAdmin.from('waitlist').insert({ user_id: userId, product_id: productId });
      revalidatePath('/profile');
      return { success: true, action: 'added' };
    }
  } catch (e: any) {
    console.error('Waitlist toggle error:', e);
    return { success: false, error: e.message };
  }
}

export async function getUserWaitlist(userId: string) {
  if (!userId) return [];
  const { data } = await supabaseAdmin.from('waitlist').select('product_id').eq('user_id', userId);
  return data?.map(w => w.product_id) || [];
}


// --- GETTERS ---
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

// --- СЕМАНТИЧЕСКИЙ ПОИСК (ИИ) ---
let extractor: any = null;

export async function generateSearchEmbedding(text: string) {
  try {
    const { pipeline, env } = await import('@xenova/transformers');
    // @ts-ignore
    env.token = null;
    env.allowLocalModels = false;
    env.allowRemoteModels = true;
    env.backends.onnx.wasm.numThreads = 1;
    env.backends.onnx.wasm.simd = false;
    env.backends.onnx.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.14.0/dist/';
    env.cacheDir = './.cache';

    if (!extractor) {
      extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
        // @ts-ignore
        auth_token: null
      });
    }

    const output = await extractor(text, {
      pooling: 'mean',
      normalize: true
    });

    return { success: true, vector: Array.from(output.data) };
  } catch (error: any) {
    console.error("Ошибка при генерации вектора запроса:", error);
    return { success: false, error: error.message };
  }
}