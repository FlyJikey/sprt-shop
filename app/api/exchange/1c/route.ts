import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseStringPromise } from 'xml2js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

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
  const type = searchParams.get('type');

  console.log(`\n[1C] 🔵 Входящий GET-запрос: type=${type}, mode=${mode}`);

  if (mode === 'checkauth') {
    if (!checkBasicAuth(req)) {
      console.log('[1C] 🔴 Ошибка авторизации: 1С не передала пароль или он неверный.');
      return new NextResponse('Auth required', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="1C Exchange"' }
      });
    }

    console.log('[1C] 🟢 Авторизация успешна. Выдаем PHPSESSID.');
    const sessionId = crypto.randomUUID();
    const responseText = `success\nPHPSESSID\n${sessionId}`;

    const response = new NextResponse(responseText, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
    response.cookies.set('PHPSESSID', sessionId);
    return response;
  }

  if (mode === 'init') {
    console.log('[1C] 🟡 Инициализация (init). Сообщаем 1С, что zip отключен, и ждем файлы.');
    return new NextResponse(`zip=no\nfile_limit=100000000`, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }

  console.log(`[1C] ⚪ Пропущен неизвестный GET запрос (mode=${mode})`);
  return new NextResponse('success', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('mode');
  const filename = searchParams.get('filename') || '';

  console.log(`\n[1C] 🟣 Входящий POST-запрос: mode=${mode}, filename=${filename}`);

  if (mode === 'file') {
    try {
      console.log(`[1C] ⏳ Читаем содержимое файла ${filename}...`);
      const xmlData = await req.text();

      console.log(`[1C] 📏 Размер файла ${filename}: ${xmlData.length} символов`);

      // ВРЕМЕННО Сохраняем файл во временную директорию (Vercel поддерживает запись только в /tmp)
      if (filename) {
        try {
          fs.writeFileSync(path.join('/tmp', filename), xmlData);
          console.log(`[1C] 💾 Файл ${filename} сохранен в /tmp для анализа.`);
        } catch (err: any) {
          console.log(`[1C] ⚠️ Не удалось сохранить файл локально, продолжаем без сохранения: ${err.message}`);
        }
      }

      if (xmlData.length === 0) {
        console.log('[1C] ⚠️ Тревога: 1С прислала абсолютно пустой файл!');
        return new NextResponse('success', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }

      const result = await parseStringPromise(xmlData, {
        explicitArray: false,
        ignoreAttrs: true
      });

      const isImport = filename.includes('import') || result?.КоммерческаяИнформация?.Каталог;
      const isOffers = filename.includes('offers') || result?.КоммерческаяИнформация?.ПакетПредложений;

      if (isImport) {
        console.log(`[1C] 📦 Распознан файл ТОВАРОВ (import). Начинаем запись в БД...`);
        await processImportFile(result);
      } else if (isOffers) {
        console.log(`[1C] 💰 Распознан файл ЦЕН И ОСТАТКОВ (offers). Обновляем БД...`);
        await processOffersFile(result);
      } else {
        console.log('[1C] ⚠️ Файл не распознан. Это не товары и не цены.');
      }

      console.log(`[1C] ✅ Обработка файла ${filename} успешно завершена! Отвечаем 1С "success".`);
      return new NextResponse('success', {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    } catch (e: any) {
      console.error(`[1C] ❌ КРИТИЧЕСКАЯ ОШИБКА при обработке файла ${filename}:`, e.message);
      return new NextResponse(`failure\n${e.message}`, { status: 500 });
    }
  }

  if (mode === 'import') {
    console.log(`[1C] 🏁 Финиш: 1С прислала команду завершения загрузки (mode=import).`);
    return new NextResponse('success', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }

  console.log(`[1C] ⚪ Пропущен неизвестный POST запрос (mode=${mode})`);
  return new NextResponse('success', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}

async function processImportFile(json: any) {
  let rawProducts = json?.КоммерческаяИнформация?.Каталог?.Товары?.Товар;

  if (!rawProducts) {
    console.log('[1C] ⚠️ Внимание: Прямой путь к товарам в XML не найден. Проверяем структуру...');
    return;
  }

  const items = Array.isArray(rawProducts) ? rawProducts : [rawProducts];
  console.log(`[1C] 📋 Найдено товаров для парсинга: ${items.length} шт.`);

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
    }
  }

  for (let i = 0; i < productsToUpsert.length; i += BATCH_SIZE) {
    const batch = productsToUpsert.slice(i, i + BATCH_SIZE);

    // 1. Пытаемся сохранить всю партию разом
    const { error } = await supabase
      .from('products')
      .upsert(batch, { onConflict: 'external_id' });

    if (error) {
      if (error.message.includes('products_name_key') || error.message.includes('duplicate key')) {
        console.log(`[1C] ⚠️ Партия из ${batch.length} товаров отклонена из-за дубликата имени. Запускаем поштучное сохранение...`);

        // 2. Спасательная шлюпка: сохраняем по одному
        let successCount = 0;
        for (const product of batch) {
          const { error: singleError } = await supabase
            .from('products')
            .upsert(product, { onConflict: 'external_id' });

          if (singleError) {
            console.log(`[1C] ❌ Пропущен товар-дубликат: "${product.name}" (Имя уже занято или дублируется в выгрузке)`);
          } else {
            successCount++;
          }
        }
        console.log(`[1C] 🛠 Спасено уникальных товаров из проблемной партии: ${successCount} из ${batch.length}`);
      } else {
        console.error(`[1C] ❌ Ошибка Supabase при записи товаров:`, error.message);
      }
    } else {
      console.log(`[1C] 💾 Успешно сохранено в Supabase разом: ${batch.length} товаров.`);
    }
  }
}

async function processOffersFile(json: any) {
  const rawOffers = json?.КоммерческаяИнформация?.ПакетПредложений?.Предложения?.Предложение;
  if (!rawOffers) {
    console.log('[1C] ⚠️ Предложения не найдены в файле offers.');
    return;
  }

  const items = Array.isArray(rawOffers) ? rawOffers : [rawOffers];
  console.log(`[1C] 📋 Найдено предложений (цен/остатков) для обновления: ${items.length} шт.`);

  if (items.length > 0) {
    // Временно выводим структуру первого товара в консоль, чтобы понять, где лежат цены
    console.log('[1C] 🔍 Пример первого предложения от 1С:', JSON.stringify(items[0], null, 2));
  }

  const updatePromises = items.map((item: any) => {
    const externalId = item.Ид;
    const quantity = parseInt(item.Количество || '0');

    let price = 0;
    // Более гибкий поиск цены
    if (item.Цены?.Цена) {
      const priceArray = Array.isArray(item.Цены.Цена) ? item.Цены.Цена : [item.Цены.Цена];
      // Пытаемся взять первую попавшуюся цену (обычно она одна, если выгружается только розничная)
      const priceData = priceArray[0];
      price = parseFloat(priceData?.ЦенаЗаЕдиницу || priceData?.Значение || '0');
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
    console.log(`[1C] 💾 Обновлено цен/остатков: ${Math.min(i + CHUNK_SIZE, updatePromises.length)}`);
  }
}