import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);



// --- СПИСОК РАЗРЕШЕННЫХ КОРНЕВЫХ КАТЕГОРИЙ ---
// Это гарантия того, что у тебя будет порядок, а не хаос.
const ROOT_CATEGORIES = [
  "Электроника",
  "Компьютеры и сети",
  "Бытовая техника",
  "Инструменты",
  "Хозтовары",
  "Автотовары",
  "Спорт и отдых",
  "Музыкальные инструменты",
  "Одежда и обувь",
  "Велозапчасти",
  "Разное"
];

// Функция транслитерации (Делает ссылки: "Музыка" -> "muzyka")
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

export async function POST(req: Request) {
  try {
    const { productId, name, description } = await req.json();

    if (!productId || !name) {
      return NextResponse.json({ error: 'Нет данных о товаре' }, { status: 400 });
    }

    // 1. ПРОМПТ
    const prompt = `
      Товар: "${name}". Описание: "${description ? description.slice(0, 100) : ''}".
      
      Твоя задача: Построить путь категорий.
      Правило 1: Первая категория ДОЛЖНА быть строго из этого списка: ${ROOT_CATEGORIES.join(", ")}.
      Правило 2: Если товар не подходит никуда, выбери "Разное".
      Правило 3: Формат ответа строго через " > ": Главная > Подкатегория > Точная категория.
      
      Пример: Музыкальные инструменты > Гитары > Электрогитары
      Пример: Электроника > Кабели и адаптеры > Кабели питания
      
      Ответ только текст категории.
    `;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1, // Строгость
      max_tokens: 50,
    });

    const aiResponse = completion.choices[0].message.content?.trim();
    if (!aiResponse) throw new Error("AI вернул пустой ответ");

    // Разбиваем ответ: ["Электроника", "Кабели", "USB"]
    // Убираем лишние кавычки и точки
    const categories = aiResponse.split('>').map(c => c.trim().replace(/['".]/g, ''));

    let currentPath = "";
    let parentPath: string | null = null;

    // 2. ЦИКЛ СОЗДАНИЯ (Идем сверху вниз)
    for (let i = 0; i < categories.length; i++) {
      const catName = categories[i]; // Например: "Кабели"
      const catSlug = generateSlug(catName); // "kabeli"

      // Формируем полный путь: "elektronika/kabeli"
      // Если это корень, то путь = слаг. Если нет - родитель/слаг
      const fullPath: string = parentPath ? `${parentPath}/${catSlug}` : catSlug;

      // Проверяем, есть ли такая папка (по полному пути)
      const { data: existingCat } = await supabase
        .from('categories')
        .select('id')
        .eq('path', fullPath)
        .maybeSingle();

      if (!existingCat) {
        // Создаем
        console.log(`Создаю категорию: [${catName}] путь: [${fullPath}]`);
        await supabase.from('categories').insert({
          name: catName,       // Человеческое имя: "Кабели"
          slug: catSlug,       // Слаг: "kabeli"
          path: fullPath,      // Полный ID: "elektronika/kabeli"
          parent_path: parentPath, // Родитель: "elektronika"
          level: i + 1
        });
        // Небольшая задержка, чтобы база успела
        await new Promise(r => setTimeout(r, 200));
      }

      // Текущий путь становится родителем для следующего круга
      parentPath = fullPath;
      currentPath = fullPath;
    }

    // 3. ПРИСВАИВАЕМ ТОВАРУ ПУТЬ
    // В поле category мы пишем ПОЛНЫЙ ПУТЬ (elektronika/kabeli/usb), чтобы фильтры работали
    const { error } = await supabase
      .from('products')
      .update({ category: currentPath })
      .eq('id', productId);

    if (error) throw error;

    await supabase.from('ai_history').insert({
      product_id: productId,
      action_type: 'categorize',
      ai_result: aiResponse,
      status: 'success'
    });

    return NextResponse.json({ success: true, category: aiResponse });

  } catch (error: any) {
    console.error('Categorize Error:', error);

    // Пытаемся сохранить ошибку в историю (если есть id)
    try {
      const pid = await req.json().then(b => b.productId).catch(() => null);
      if (pid) {
        await supabase.from('ai_history').insert({
          product_id: pid,
          action_type: 'categorize',
          ai_result: error.message || 'Unknown error',
          status: 'error'
        });
      }
    } catch (e) { /* Игнорируем ошибки логирования */ }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}