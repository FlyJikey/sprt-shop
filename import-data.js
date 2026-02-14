const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// --- НАСТРОЙКИ ---
const FILES_TO_IMPORT = [
  'radio.csv',
  'sport.csv'
];

const DEFAULT_CATEGORY = 'Каталог';

// Индексы колонок (Считаем от 0)
// В твоем файле: 
// 0 - Наименование
// 5 - Остаток
// 7 - Розничная цена
const COL_NAME = 0;
const COL_STOCK = 5;
const COL_PRICE = 7; 
// ----------------

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Ошибка: Не найдены ключи в .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function transliterate(word) {
  const converter = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e', 'ж': 'zh', 'з': 'z',
    'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r',
    'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
    'ь': '', 'ы': 'y', 'ъ': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
  };
  return word.toLowerCase().split('').map(char => converter[char] || char).join('')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Функция для очистки русских чисел ( "1 650,00" -> 1650.00 )
function parseRusNumber(str) {
  if (!str) return 0;
  // Убираем пробелы (разделители тысяч) и меняем запятую на точку
  const clean = str.replace(/\s/g, '').replace(',', '.');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

async function importData() {
  console.time('Время выполнения');
  
  console.log('🗑️  Очистка старых данных...');
  await supabase.from('products').delete().neq('id', 0);
  await supabase.from('categories').delete().neq('id', 0);

  console.log(`📂 Создаем категорию "${DEFAULT_CATEGORY}"...`);
  await supabase.from('categories').upsert({
    name: DEFAULT_CATEGORY,
    path: transliterate(DEFAULT_CATEGORY),
    level: 1,
    parent_path: null,
    created_at: new Date()
  }, { onConflict: 'name' });

  const productsMap = new Map();

  for (const filename of FILES_TO_IMPORT) {
    const filePath = path.join(process.cwd(), filename);
    
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  Файл не найден: ${filename}`);
      continue;
    }

    console.log(`\n📄 Читаем файл: ${filename}`);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const rows = fileContent.split('\n');

    let importedCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i].trim();
      if (!row) continue;

      // ВАЖНО: Разделяем по точке с запятой (;)
      const columns = row.split(';');

      // Если колонок меньше 8, значит это не строка с товаром
      if (columns.length < 8) continue;

      // 1. Обработка Цены (Колонка 7)
      const priceRaw = columns[COL_PRICE];
      const price = parseRusNumber(priceRaw);

      // 2. Обработка Имени (Колонка 0)
      let name = columns[COL_NAME]?.trim();
      // Убираем лишние кавычки ("Имя" -> Имя)
      if (name) name = name.replace(/^"|"$/g, '').replace(/""/g, '"').trim();

      // Фильтр мусора: пропускаем строки без цены, без имени или заголовки
      if (!name || price <= 0 || name.includes('Номенклатура') || name.includes('Склад ')) {
        continue;
      }

      // 3. Обработка Остатка (Колонка 5)
      const stockRaw = columns[COL_STOCK];
      const stock = parseRusNumber(stockRaw);

      if (!productsMap.has(name)) {
        const slug = transliterate(name) + '-' + Math.floor(Math.random() * 100000);
        
        productsMap.set(name, {
          name: name,
          slug: slug,
          price: price,
          unit: 'шт',
          stock: stock,
          category: DEFAULT_CATEGORY,
          image_url: null,
          description: ''
        });
        importedCount++;
      }
    }
    console.log(`   ✅ Успешно обработано: ${importedCount} позиций`);
  }

  const allProducts = Array.from(productsMap.values());
  if (allProducts.length === 0) {
      console.log('\n❌ Товары не найдены. Возможно, индексы колонок не совпадают.');
      return;
  }

  console.log(`\n📦 Итого к загрузке в Supabase: ${allProducts.length} товаров...`);

  const BATCH_SIZE = 500;
  let totalUploaded = 0;

  for (let i = 0; i < allProducts.length; i += BATCH_SIZE) {
    const batch = allProducts.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('products').insert(batch);
    
    if (error) {
      console.error(`❌ Ошибка загрузки батча:`, error.message);
    } else {
      totalUploaded += batch.length;
      process.stdout.write(`\r🚀 Прогресс: ${totalUploaded} / ${allProducts.length}`);
    }
  }

  console.log('\n\n🏁 Готово! База данных обновлена.');
  console.timeEnd('Время выполнения');
}

importData();