import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { pipeline, env } from '@xenova/transformers';

// --- КОНФИГУРАЦИЯ ОКРУЖЕНИЯ ИИ ---
// Отключаем поиск токенов в системных переменных, чтобы избежать ошибок "Unauthorized"
env.token = null; 
env.allowLocalModels = false;
env.allowRemoteModels = true;
// Указываем путь к кэшу, чтобы модель не скачивалась каждый раз при перезапуске (опционально)
env.cacheDir = './.cache';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Рекомендуется использовать SERVICE_ROLE_KEY для серверных операций обновления
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Переменная для хранения модели в памяти (singleton)
let extractor: any = null;

export async function POST(req: Request) {
  try {
    const { productId, text } = await req.json();

    if (!productId || !text) {
      return NextResponse.json({ error: 'Недостаточно данных для генерации вектора' }, { status: 400 });
    }

    // 1. Инициализация модели (загружается один раз при первом запросе)
    if (!extractor) {
      console.log("💿 Загрузка ИИ-модели (MiniLM-L6-v2)...");
      extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
        // @ts-ignore
        auth_token: null 
      });
    }

    // 2. Генерация вектора
    // Мы нормализуем вектор сразу, чтобы поиск через cosine similarity (косинусное сходство) был точнее
    console.log(`🧠 Обработка текста для товара ID: ${productId}`);
    
    const output = await extractor(text, { 
      pooling: 'mean', 
      normalize: true 
    });

    // Преобразуем объект тензора в обычный массив чисел
    const vector = Array.from(output.data);

    // 3. Валидация размерности (MiniLM всегда выдает 384)
    if (vector.length !== 384) {
      throw new Error(`Ошибка размерности: ожидалось 384, получено ${vector.length}`);
    }

    // 4. Запись в базу данных
    const { error: dbError } = await supabase
      .from('products')
      .update({ embedding: vector })
      .eq('id', productId);

    if (dbError) {
      console.error("ошибка Supabase:", dbError.message);
      return NextResponse.json({ error: `Ошибка БД: ${dbError.message}` }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Вектор успешно сгенерирован и сохранен',
      dimensions: vector.length 
    });

  } catch (error: any) {
    console.error("Критическая ошибка Embed роута:", error.message);
    return NextResponse.json({ 
      error: error.message || 'Внутренняя ошибка сервера' 
    }, { status: 500 });
  }
}