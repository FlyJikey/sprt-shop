import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseStringPromise } from 'xml2js';
import crypto from 'crypto';

export const maxDuration = 60; 
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

const ONEC_USER = process.env.ONEC_USERNAME || 'admin';
const ONEC_PASS = process.env.ONEC_PASSWORD || 'admin';

function transliterate(word: string): string {
  if (!word) return '';
  const converter: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e', 'ж': 'zh', 'з': 'z',
    'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r',
    'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
    'ь': '', 'ы': 'y', 'ъ': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
  };
  const result = word.toLowerCase().split('').map(char => converter[char] || char).join('');
  return result.replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

// Вспомогательная функция для проверки авторизации 1С
function checkBasicAuth(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return false;
  try {
    const auth = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
    return auth[0] === ONEC_USER && auth[1] === ONEC_PASS;
  } catch (e) {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('mode');

  if (mode === 'checkauth') {
    // Требуем от 1С логин и пароль, если они не переданы или неверны
    if (!checkBasicAuth(req)) {
      return new NextResponse('Auth required', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="1C Exchange"' }
      });
    }

    const sessionId = crypto.randomUUID();
    const responseText = `success\nPHPSESSID\n${sessionId}`;
    
    const response = new NextResponse(responseText, { 
      headers: { 'Content-Type': 'text/plain; charset=utf-8' } 
    });
    
    // Обязательно ставим куку в заголовки ответа, 1С часто полагается именно на это
    response.cookies.set('PHPSESSID', sessionId);
    
    return response;
  }
  
  if (mode === 'init') {
    return new NextResponse(`zip=no\nfile_limit=100000000`, { 
      headers: { 'Content-Type': 'text/plain; charset=utf-8' } 
    });
  }
  
  return new NextResponse('success', { 
    headers: { 'Content-Type': 'text/plain; charset=utf-8' } 
  });
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('mode');
  const filename = searchParams.get('filename') || '';

  if (mode === 'file') {
    try {
      console.log(`[1C] === НАЧАЛО ЗАГРУЗКИ ФАЙЛА: ${filename} ===`);
      
      // В Next.js App Router 1С может присылать данные в разных кодировках
      // Получаем сырой текст из тела запроса
      const xmlData = await req.text();
      
      console.log(`[1C] Длина полученного XML: ${xmlData.length} символов`);

      const result = await parseStringPromise(xmlData, { 
        explicitArray: false, 
        ignoreAttrs: true 
      });

      console.log('[1C] Структура JSON:', JSON.stringify(result).substring(0, 500) + '...');

      const isImport = filename.includes('import') || result?.КоммерческаяИнформация?.Каталог;
      const isOffers = filename.includes('offers') || result?.КоммерческаяИнформация?.ПакетПредложений;

      if (isImport) {
        await processImportFile(result);
      } else if (isOffers) {
        await processOffersFile(result);
      } else {
        console.log('[1C] ⚠️ Непонятный тип файла. Не Import и не Offers.');
      }

      return new NextResponse('success', { 
        headers: { 'Content-Type': 'text/plain; charset=utf-8' } 
      });
    } catch (e: any) {
      console.error('[1C] ❌ ОШИБКА:', e);
      return new NextResponse(`failure\n${e.message}`, { status: 500 });
    }
  }

  if (mode === 'import') {
    return new NextResponse('success', { 
      headers: { 'Content-Type': 'text/plain; charset=utf-8' } 
    });
  }

  return new NextResponse('success', { 
    headers: { 'Content-Type': 'text/plain; charset=utf-8' } 
  });
}

async function processImportFile(json: any) {
  let rawProducts = json?.КоммерческаяИнформация?.Каталог?.Товары?.Товар;
  
  if (!rawProducts) {
    console.log('[1C] ⚠️ Внимание: Прямой путь к товарам не найден. Проверяем структуру...');
    if (json?.КоммерческаяИнформация?.Каталог?.Товары) {
       console.log('[1C] Папка "Товары" есть, но внутри пусто или массив.');
    } else {
       console.log('[1C] Папка "Товары" вообще не найдена!');
    }
    return;
  }

  const items = Array.isArray(rawProducts) ? rawProducts : [rawProducts];
  console.log(`[1C] ✅ Найдено товаров для обработки: ${items.length}`);

  const productsToUpsert: any[] = [];
  const BATCH_SIZE = 500; 

  for (const item of items) {
    const name = item.Наименование;
    const externalId = item.Ид;

    if (name && externalId) {
      const shortId = externalId.split('-')[0]; 
      const slug = `${transliterate(name)}-${shortId}`;

      productsToUpsert.push({
        name: name,
        external_id: externalId,
        slug: slug,
        description: item.Описание || '',
        embedding: null, 
        category: null,
        updated_at: new Date().toISOString()
      });
    } else {
      console.log('[1C] ⚠️ Пропущен товар (нет имени или ID):', item);
    }
  }

  for (let i = 0; i < productsToUpsert.length; i += BATCH_SIZE) {
    const batch = productsToUpsert.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('products')
      .upsert(batch, { onConflict: 'external_id' });

    if (error) {
      console.error(`[1C] ❌ Ошибка записи в БД:`, error.message);
    } else {
      console.log(`[1C] ✅ Успешно записано в БД: ${batch.length} шт.`);
    }
  }
}

async function processOffersFile(json: any) {
  const rawOffers = json?.КоммерческаяИнформация?.ПакетПредложений?.Предложения?.Предложение;
  if (!rawOffers) {
    console.log('[1C] ⚠️ Предложения не найдены в offers.xml');
    return;
  }

  const items = Array.isArray(rawOffers) ? rawOffers : [rawOffers];
  console.log(`[1C] ✅ Найдено предложений: ${items.length}`);

  const updatePromises = items.map((item: any) => {
    const externalId = item.Ид;
    const quantity = parseInt(item.Количество || '0');
    let price = 0;
    if (item.Цены?.Цена) {
      const priceData = Array.isArray(item.Цены.Цена) ? item.Цены.Цена[0] : item.Цены.Цена;
      price = parseFloat(priceData.ЦенаЗаЕдиницу || '0');
    }

    if (!externalId) return null;

    return supabase
      .from('products')
      .update({ price, stock: quantity, updated_at: new Date().toISOString() })
      .eq('external_id', externalId);
  }).filter((p: any) => p !== null);

  const CHUNK_SIZE = 50;
  for (let i = 0; i < updatePromises.length; i += CHUNK_SIZE) {
    await Promise.all(updatePromises.slice(i, i + CHUNK_SIZE));
    console.log(`[1C] Обновлено: ${Math.min(i + CHUNK_SIZE, updatePromises.length)}`);
  }
}