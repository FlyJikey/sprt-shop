import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { Bell, AlertCircle, LayoutGrid, Eye } from 'lucide-react';
import Image from 'next/image';

// Отключаем кэширование, чтобы всегда видеть свежие заявки
export const dynamic = 'force-dynamic';

export default async function AdminWaitlistPage() {
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
    if (!user) {
        redirect('/admin/login');
    }

    const { data: profile } = await supabaseAuth
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'employee')) {
        redirect('/');
    }

    // Обход RLS для получения всей статистики
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Получаем все записи листа ожидания вместе с данными о товарах
    const { data: waitlistData, error } = await supabaseAdmin
        .from('waitlist')
        .select(`
      id,
      product_id,
      products (
        id,
        name,
        slug,
        stock,
        price,
        price,
        image_url
      )
    `)
        .lte('products.stock', 0);

    if (error) {
        return <div className="p-8 text-red-500">Ошибка загрузки данных: {error.message}</div>;
    }

    // Группируем данные: сколько раз добавили каждый товар
    const productStats: Record<number, { count: number, product: any }> = {};
    let totalRequests = 0;

    if (waitlistData) {
        for (const item of waitlistData) {
            if (!item.products) continue; // Товар мог быть удален

            totalRequests++;
            const pId = item.product_id;

            if (!productStats[pId]) {
                productStats[pId] = {
                    count: 0,
                    product: item.products
                };
            }
            productStats[pId].count += 1;
        }
    }

    // Превращаем в массив и сортируем по популярности (где больше всего запросов)
    const sortedStats = Object.values(productStats).sort((a, b) => b.count - a.count);

    return (
        <div className="max-w-7xl mx-auto font-sans">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-3">
                        <Bell className="text-pink-500" size={32} />
                        Лист ожидания
                    </h1>
                    <p className="text-gray-500 mt-2 text-sm">
                        Аналитика товаров, которые клиенты очень хотят купить, но их сейчас нет в наличии.
                    </p>
                </div>

                <div className="bg-white px-6 py-4 rounded-2xl shadow-sm border border-gray-100 flex gap-8">
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Всего заявок</p>
                        <p className="text-2xl font-black text-gray-900 leading-none mt-1">{totalRequests}</p>
                    </div>
                    <div className="w-px bg-gray-100"></div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Уникальных товаров</p>
                        <p className="text-2xl font-black text-pink-600 leading-none mt-1">{sortedStats.length}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                {sortedStats.length === 0 ? (
                    <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center">
                        <div className="bg-gray-50 p-6 rounded-full inline-flex mb-4">
                            <Bell size={48} className="text-gray-300" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Заявок пока нет</h3>
                        <p className="max-w-sm mx-auto">
                            Когда покупатели нажмут «Уведомить о поступлении» на странице товара, которого нет в наличии, он появится в этом списке.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Товар</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Заявок (Спрос)</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Остаток сейчас</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Статус</th>
                                    <th className="p-4 w-16"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {sortedStats.map(({ count, product }) => {
                                    const imageUrl = product.image_url;
                                    const inStock = (product.stock || 0) > 0;

                                    return (
                                        <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="p-4">
                                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                                    <div className="h-12 w-12 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                                                        {imageUrl ? (
                                                            <Image src={imageUrl} alt={product.name} fill className="object-cover" sizes="48px" />
                                                        ) : (
                                                            <LayoutGrid size={20} className="text-gray-400" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <Link href={`/product/${product.slug}`} target="_blank" className="font-bold text-gray-900 hover:text-blue-600 transition-colors line-clamp-2 text-sm">
                                                            {product.name}
                                                        </Link>
                                                        <div className="text-xs font-medium text-gray-500 mt-1">
                                                            {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(product.price || 0)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="p-4 text-center align-middle">
                                                <div className="inline-flex items-center justify-center min-w-[3rem] px-3 py-1.5 bg-pink-50 text-pink-700 font-black rounded-lg text-lg">
                                                    {count}
                                                </div>
                                            </td>

                                            <td className="p-4 text-center align-middle">
                                                <span className={`text-sm font-bold ${inStock ? 'text-green-600' : 'text-gray-500'}`}>
                                                    {product.stock || 0} шт.
                                                </span>
                                            </td>

                                            <td className="p-4 text-right align-middle">
                                                {inStock ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                                        Уже в наличии
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-100">
                                                        <AlertCircle size={12} />
                                                        Требуется закупка
                                                    </span>
                                                )}
                                            </td>

                                            <td className="p-4 text-center align-middle">
                                                <Link
                                                    href={`/product/${product.slug}`}
                                                    target="_blank"
                                                    title="Посмотреть товар"
                                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all inline-block"
                                                >
                                                    <Eye size={20} />
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
