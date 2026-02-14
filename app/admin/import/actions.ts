'use server';

import { createClient } from '@supabase/supabase-js';

// Подключение
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Отсутствуют ключи SUPABASE в .env.local');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

type ProductImportData = {
  name: string;
  slug: string;
  price: number;
  stock: number;
  category: string;
  unit: string;
  image_url: string | null;
  description: string;
};

// Очистка базы (используется только в режиме "Полная замена")
export async function clearDatabase() {
  const { error: pError } = await supabase.from('products').delete().neq('id', 0);
  if (pError) throw new Error('Ошибка очистки товаров: ' + pError.message);

  const { error: cError } = await supabase.from('categories').delete().neq('id', 0);
  if (cError) throw new Error('Ошибка очистки категорий: ' + cError.message);

  return { success: true };
}

// Загрузка товаров
export async function upsertBatch(products: ProductImportData[]) {
  // Используем upsert: 
  // 1. Если товара нет -> создаст.
  // 2. Если товар есть (совпало name) -> обновит поля.
  const { error } = await supabase
    .from('products')
    .upsert(products, { onConflict: 'name' });
      
  if (error) return { error: error.message };

  return { success: true };
}

// Создание категории (если нет)
export async function createCategoryIfNeeded(categoryName: string, categoryPath: string) {
  const { error } = await supabase
    .from('categories')
    .upsert({ 
        name: categoryName, 
        path: categoryPath,
        level: 1 
    }, { onConflict: 'name' });

  return { error };
}