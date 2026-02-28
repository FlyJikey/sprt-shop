import { supabase } from '@/lib/supabase-client';
import Header from '@/components/Header';
import Link from 'next/link';
import CatalogSort from '@/components/CatalogSort';
import CatalogGrid from '@/components/CatalogGrid';
import ScrollButton from '@/components/ScrollButton';
import { ChevronRight, ChevronDown, Folder } from 'lucide-react';
import { generateSearchEmbedding } from '@/app/actions';

export const revalidate = 60;

// Тип для категории из БД
type Category = {
  id: number;
  name: string;
  path: string;
  parent_path: string | null;
  level: number;
};

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; category?: string }>;
}) {
  const resolvedParams = await searchParams;
  const query = resolvedParams.q || '';
  const sort = resolvedParams.sort || 'newest';
  // categoryPath здесь - это путь (например: "elektronika/kabeli")
  const categoryPath = resolvedParams.category ? decodeURIComponent(resolvedParams.category) : '';
  const itemsPerPage = 40;

  // 1. ЗАГРУЗКА КАТЕГОРИЙ (ИЗ ТАБЛИЦЫ CATEGORIES)
  const { data: categoriesData } = await supabase
    .from('categories')
    .select('*')
    .order('name'); // Сортируем по алфавиту для красоты

  const categories = (categoriesData || []) as Category[];

  // 2. ЗАПРОС ТОВАРОВ
  let products: any[] = [];
  let count: number | null = 0;

  if (query) {
    // 1. СНАЧАЛА ТОЧНЫЙ ПОИСК (Как в админке)
    let exactQuery = supabase.from('products').select('*', { count: 'exact' }).ilike('name', `%${query}%`);
    if (categoryPath) exactQuery = exactQuery.ilike('category', `${categoryPath}%`);

    // Сортировка для точного поиска
    switch (sort) {
      case 'in_stock': exactQuery = exactQuery.order('stock', { ascending: false }); break;
      case 'price_asc': exactQuery = exactQuery.order('price', { ascending: true }); break;
      case 'price_desc': exactQuery = exactQuery.order('price', { ascending: false }); break;
      case 'name_asc': exactQuery = exactQuery.order('name', { ascending: true }); break;
      case 'newest': default: exactQuery = exactQuery.order('created_at', { ascending: false }); break;
    }

    const { data: exactData, count: exactCount } = await exactQuery.limit(itemsPerPage);

    if (exactData && exactData.length > 0) {
      products = exactData;
      count = exactCount;
    } else {
      // 2. ЕСЛИ НИЧЕГО НЕ НАШЛИ - ИСПОЛЬЗУЕМ СЕМАНТИЧЕСКИЙ ПОИСК (УМНЫЙ)
      const embedRes = await generateSearchEmbedding(query);

      if (embedRes.success && embedRes.vector) {
        const { data: semanticData } = await supabase.rpc('search_products_semantic', {
          query_embedding: embedRes.vector,
          match_threshold: 0.2, // Мягкий порог для поиска
          match_count: itemsPerPage,
          category_filter: categoryPath || null
        });

        if (semanticData && semanticData.length > 0) {
          products = semanticData;
          count = semanticData.length;

          // Применяем сортировку
          if (sort === 'price_asc') products.sort((a, b: any) => a.price - b.price);
          if (sort === 'price_desc') products.sort((a, b: any) => b.price - a.price);
          if (sort === 'name_asc') products.sort((a, b: any) => a.name.localeCompare(b.name));
        }
      }
    }
  } else {
    // === ОБЫЧНЫЙ КАТАЛОГ (Без поиска) ===
    let dbQuery = supabase.from('products').select('*', { count: 'exact' });

    if (categoryPath) {
      dbQuery = dbQuery.ilike('category', `${categoryPath}%`);
    }

    switch (sort) {
      case 'in_stock': dbQuery = dbQuery.order('stock', { ascending: false }); break;
      case 'price_asc': dbQuery = dbQuery.order('price', { ascending: true }); break;
      case 'price_desc': dbQuery = dbQuery.order('price', { ascending: false }); break;
      case 'name_asc': dbQuery = dbQuery.order('name', { ascending: true }); break;
      case 'newest': default: dbQuery = dbQuery.order('created_at', { ascending: false }); break;
    }

    const res = await dbQuery.limit(itemsPerPage);
    products = res.data || [];
    count = res.count;
  }

  // 3. ПОДГОТОВКА ДЕРЕВА ДЛЯ САЙДБАРА
  // Группируем категории по родителям для рекурсивного вывода
  const categoriesByParent: Record<string, Category[]> = {};
  categories.forEach(cat => {
    // Если parent_path null, то это корень (ключ 'root')
    const parent = cat.parent_path || 'root';
    if (!categoriesByParent[parent]) categoriesByParent[parent] = [];
    categoriesByParent[parent].push(cat);
  });

  const rootCategories = categoriesByParent['root'] || [];

  // 4. ХЛЕБНЫЕ КРОШКИ (Превращаем slug "elektronika" в Имя "Электроника")
  const breadcrumbSegments = categoryPath ? categoryPath.split('/') : [];
  const breadcrumbs = breadcrumbSegments.map((slug, index) => {
    // Восстанавливаем путь к текущему сегменту
    const currentPath = breadcrumbSegments.slice(0, index + 1).join('/');
    // Ищем категорию с таким путем, чтобы взять её Русское Имя
    const foundCat = categories.find(c => c.path === currentPath);
    return {
      name: foundCat ? foundCat.name : slug, // Если вдруг не нашли, показываем slug
      path: currentPath
    };
  });

  // Хелпер для рендера дерева в сайдбаре
  const renderCategoryNode = (cat: Category) => {
    // Проверяем, активна ли эта категория или её дети
    const isActive = categoryPath === cat.path;
    const isChildActive = categoryPath.startsWith(cat.path + '/');
    const isOpen = isActive || isChildActive; // Раскрываем, если мы внутри

    const children = categoriesByParent[cat.path] || [];
    const hasChildren = children.length > 0;

    return (
      <div key={cat.id} className="ml-2">
        <Link
          href={`/catalog?category=${encodeURIComponent(cat.path)}`}
          className={`flex items-center justify-between py-1.5 px-2 rounded-lg text-sm transition-colors ${isActive
            ? 'bg-blue-600 text-white font-bold shadow-md'
            : isChildActive
              ? 'text-blue-700 font-medium bg-blue-50'
              : 'text-gray-600 hover:bg-gray-100'
            }`}
        >
          <span>{cat.name}</span>
          {hasChildren && (
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${isActive ? 'text-white' : 'text-gray-400'}`}
            />
          )}
        </Link>

        {/* Рендерим детей, только если категория открыта */}
        {hasChildren && isOpen && (
          <div className="ml-2 pl-2 border-l border-gray-100 mt-1 space-y-0.5 animate-fadeIn">
            {children.map(renderCategoryNode)}
          </div>
        )}
      </div>
    );
  };

  // Получаем имя текущей категории для заголовка H1
  const currentCategoryName = categories.find(c => c.path === categoryPath)?.name || 'Все товары';

  return (
    <main className="min-h-screen bg-gray-50 pb-20 font-sans">
      <Header />
      <ScrollButton />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Хлебные крошки */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6 overflow-x-auto whitespace-nowrap pb-2 scrollbar-hide">
          <Link href="/" className="hover:text-blue-600 transition-colors">Главная</Link>
          <ChevronRight size={14} className="text-gray-300" />
          <Link href="/catalog" className={`hover:text-blue-600 transition-colors ${!categoryPath ? 'font-bold text-gray-900' : ''}`}>Каталог</Link>

          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.path} className="flex items-center gap-2">
              <ChevronRight size={14} className="text-gray-300" />
              <Link
                href={`/catalog?category=${encodeURIComponent(crumb.path)}`}
                className={`transition-colors ${index === breadcrumbs.length - 1 ? "font-bold text-gray-900" : "hover:text-blue-600"}`}
              >
                {crumb.name}
              </Link>
            </div>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-8">

          {/* Сайдбар (Дерево категорий) */}
          <aside className="w-full lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sticky top-24 max-h-[85vh] overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
                <h3 className="font-bold text-gray-900">Категории</h3>
                <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">{categories.length}</span>
              </div>

              <div className="space-y-1">
                <Link
                  href="/catalog"
                  className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${!categoryPath ? 'bg-black text-white font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <Folder size={16} />
                  Все товары
                </Link>

                {/* Рендерим корневые категории, остальное сделает рекурсия */}
                <div className="mt-2 space-y-1">
                  {rootCategories.map(renderCategoryNode)}
                </div>
              </div>
            </div>
          </aside>

          {/* Контент (Сетка товаров) */}
          <div className="flex-1">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                  <h1 className="text-2xl font-black text-gray-900">
                    {query ? `Поиск: «${query}»` : currentCategoryName}
                  </h1>
                  <p className="text-sm text-gray-400 mt-1">
                    Найдено {count} товаров
                  </p>
                </div>
                <CatalogSort />
              </div>
            </div>

            {products && products.length > 0 ? (
              <CatalogGrid
                key={sort + query + categoryPath}
                initialProducts={products}
                totalCount={count || 0}
                sort={sort}
                query={query}
                category={categoryPath}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-200 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <Folder size={32} className="text-gray-300" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Здесь пока пусто</h3>
                <p className="text-gray-500 mb-6 max-w-xs mx-auto">Товары в этой категории еще не добавлены или не соответствуют фильтрам.</p>
                <Link href="/catalog" className="px-6 py-2 bg-black text-white rounded-lg font-bold hover:bg-gray-800 transition-colors">
                  Сбросить фильтры
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}