import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import {
  Users,
  ShoppingCart,
  RussianRuble,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  Bell
} from 'lucide-react';
import LowStockTrigger from '@/components/admin/LowStockTrigger';

export default async function AdminDashboard() {
  // 1. Инициализация клиента для проверки АВТОРИЗАЦИИ (Cookies)
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) { }
      },
    }
  );

  // 2. Получаем текущего пользователя
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/admin/login');
  }

  // 3. Получаем роль пользователя
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  // --- ЛОГИКА ДОСТУПА ---
  // Если это сотрудник, ему нечего делать на дашборде с выручкой.
  // Отправляем его сразу работать с заказами.
  if (profile && profile.role === 'employee') {
    redirect('/admin/orders');
  }

  // 4. Инициализация Админ-клиента для СТАТИСТИКИ (Service Role)
  // Используется только если мы остались на странице (т.е. мы Админ)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: stats, error } = await supabaseAdmin.rpc('get_admin_stats');

  if (error) {
    console.error('Stats error:', error);
    return <div className="p-8 text-red-500">Ошибка загрузки статистики: {error.message}</div>;
  }

  // 5. Получаем общее количество записей в листе ожидания (только тех товаров, которых нет в наличии)
  const { count: waitlistCount } = await supabaseAdmin
    .from('waitlist')
    .select('id, products!inner(stock)', { count: 'exact', head: true })
    .lte('products.stock', 0);

  const totalDeals = stats.completed_orders || 1;
  const averageCheck = stats.revenue / totalDeals;

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen font-sans">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Обзор магазина</h1>
        <span className="text-sm text-gray-400 font-medium">
          Всего товаров: {stats.total_products}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">

        {/* 1. ВЫРУЧКА */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Общая выручка</p>
              <h3 className="text-2xl font-black text-gray-900 mt-2">
                {formatMoney(stats.revenue)}
              </h3>
            </div>
            <div className="p-3 bg-yellow-50 rounded-xl">
              <RussianRuble className="w-6 h-6 text-[#C5A070]" />
            </div>
          </div>
          <p className="text-[10px] text-gray-400">Статусы: processing, done</p>
        </div>

        {/* 2. СРЕДНИЙ ЧЕК */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Средний чек</p>
              <h3 className="text-2xl font-black text-gray-900 mt-2">
                {formatMoney(averageCheck)}
              </h3>
            </div>
            <div className="p-3 bg-green-50 rounded-xl">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-[10px] text-gray-400">~{Math.round(totalDeals)} сделок</p>
        </div>

        {/* 3. АКТИВНЫЕ ЗАКАЗЫ (ССЫЛКА) */}
        <Link
          href="/admin/orders"
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group relative block"
        >
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowRight size={16} className="text-blue-500" />
          </div>

          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider group-hover:text-blue-600 transition-colors">В работе</p>
              <h3 className="text-3xl font-black text-gray-900 mt-2">{stats.active_orders}</h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          {stats.active_orders > 0 ? (
            <div className="text-xs text-orange-600 font-bold bg-orange-50 inline-block px-2 py-1 rounded-md">
              Требуют обработки
            </div>
          ) : (
            <div className="text-xs text-gray-400 font-bold">Очередь пуста</div>
          )}
        </Link>

        {/* НОВЫЙ БЛОК: ЛИСТ ОЖИДАНИЯ (ССЫЛКА) */}
        <Link
          href="/admin/waitlist"
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md hover:border-pink-200 transition-all group relative block"
        >
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowRight size={16} className="text-pink-500" />
          </div>

          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider group-hover:text-pink-600 transition-colors">Лист ожидания</p>
              <h3 className="text-3xl font-black text-gray-900 mt-2">{waitlistCount || 0}</h3>
            </div>
            <div className="p-3 bg-pink-50 rounded-xl group-hover:bg-pink-100 transition-colors">
              <Bell className="w-6 h-6 text-pink-500" />
            </div>
          </div>
          {(waitlistCount || 0) > 0 ? (
            <div className="text-xs text-pink-600 font-bold bg-pink-50 inline-block px-2 py-1 rounded-md">
              Ждут поступления
            </div>
          ) : (
            <div className="text-xs text-gray-400 font-bold">Заявок нет</div>
          )}
        </Link>

        {/* 4. КЛИЕНТЫ */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Клиенты</p>
              <h3 className="text-3xl font-black text-gray-900 mt-2">{stats.total_clients}</h3>
            </div>
            <div className="p-3 bg-purple-50 rounded-xl">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <p className="text-[10px] text-gray-400">В базе данных</p>
        </div>

        {/* 5. НЕТ В НАЛИЧИИ */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Нет в наличии</p>
              <h3 className="text-3xl font-black text-gray-900 mt-2">{stats.out_of_stock}</h3>
            </div>
            <div className="p-3 bg-red-50 rounded-xl">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <p className="text-xs text-red-500 font-bold">Остаток 0 шт.</p>
        </div>

        {/* 6. ЗАКАНЧИВАЮТСЯ */}
        <LowStockTrigger count={stats.low_stock} />

      </div>
    </div>
  );
}