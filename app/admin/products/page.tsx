import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Plus, Search, ChevronLeft, ChevronRight, Edit } from 'lucide-react';
import DeleteProductButton from '@/components/admin/DeleteProductButton';
import LimitSelector from '@/components/admin/LimitSelector';

export const revalidate = 0;

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; limit?: string }>;
}) {
  // --- 1. БЛОК ЗАЩИТЫ (Проверка роли) ---
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {}
      },
    }
  );

  const { data: { user } } = await supabaseAuth.auth.getUser();
  
  if (!user) {
    redirect('/admin/login');
  }

  const { data: profile } = await supabaseAuth
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  // Если не админ — выгоняем в заказы
  if (!profile || profile.role !== 'admin') {
    redirect('/admin/orders');
  }
  // ---------------------------------------

  const resolvedParams = await searchParams;
  const query = resolvedParams.q || '';
  const page = Number(resolvedParams.page) || 1;
  const limit = Number(resolvedParams.limit) || 20;

  let dbQuery = supabase
    .from('products')
    .select('*', { count: 'exact' });

  if (query) {
    dbQuery = dbQuery.ilike('name', `%${query}%`);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data: products, count } = await dbQuery
    .order('id', { ascending: false })
    .range(from, to);

  const totalPages = count ? Math.ceil(count / limit) : 1;

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      
      {/* Шапка */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Товары ({count || 0})</h1>
        <Link
          href="/admin/products/new"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus size={20} />
          Добавить товар
        </Link>
      </div>

      {/* Панель управления */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
        
        {/* Поиск */}
        <form className="relative flex-grow w-full md:w-auto">
          <input
            name="q"
            defaultValue={query}
            placeholder="Поиск по названию..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
          <input type="hidden" name="limit" value={limit} />
        </form>

        {/* Выбор кол-ва товаров */}
        <LimitSelector limit={limit} />
      </div>

      {/* Таблица */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold tracking-wider">
              <th className="p-4 w-16">Фото</th>
              <th className="p-4">Название</th>
              <th className="p-4 w-32">Цена</th>
              <th className="p-4 w-24">Остаток</th>
              <th className="p-4 w-24 text-right">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products?.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden border border-gray-200">
                    {product.image_url && product.image_url !== '/window.svg' ? (
                      <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-gray-400">Нет</span>
                    )}
                  </div>
                </td>
                <td className="p-4 font-medium text-gray-900">
                  <div className="line-clamp-1" title={product.name}>
                    {product.name}
                  </div>
                  <div className="text-xs text-gray-500">{product.category || 'Без категории'}</div>
                </td>
                <td className="p-4 text-gray-700">{product.price} ₽</td>
                <td className="p-4">
                   <span className={`px-2 py-1 rounded text-xs font-bold ${
                      (product.stock || 0) > 0 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                   }`}>
                      {product.stock || 0}
                   </span>
                </td>
                <td className="p-4 flex justify-end gap-2">
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <Edit className="w-5 h-5" />
                  </Link>
                  <DeleteProductButton id={product.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {(!products || products.length === 0) && (
            <div className="p-10 text-center text-gray-500">Товары не найдены</div>
        )}
      </div>

      {/* Пагинация */}
      <div className="flex justify-between items-center mt-6">
        <div className="text-sm text-gray-500">
          Страница {page} из {totalPages}
        </div>
        <div className="flex gap-2">
          {page > 1 && (
            <Link
              href={`/admin/products?q=${query}&page=${page - 1}&limit=${limit}`}
              className="flex items-center gap-1 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              <ChevronLeft size={16} /> Назад
            </Link>
          )}
          {page < totalPages && (
            <Link
              href={`/admin/products?q=${query}&page=${page + 1}&limit=${limit}`}
              className="flex items-center gap-1 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Вперед <ChevronRight size={16} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}