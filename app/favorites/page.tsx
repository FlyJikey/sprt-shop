'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';
import CatalogGrid from '@/components/CatalogGrid';
import Header from '@/components/Header'; // <--- Импортируем Header
import { Loader2, Heart } from 'lucide-react';

export default function FavoritesPage() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      // Получаем избранное
      const { data: favorites } = await supabase
        .from('favorites')
        .select('product_id, products(*)')
        .eq('user_id', user.id);

      if (favorites) {
        // Извлекаем только данные продуктов из связи
        const mappedProducts = favorites
          .map((f: any) => f.products)
          .filter(Boolean); // Убираем null если товар был удален
        setProducts(mappedProducts);
      }
      setLoading(false);
    };

    fetchData();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-white">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
           <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white font-sans pb-20">
      {/* Добавляем шапку сюда */}
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8 border-b border-gray-100 pb-6">
          <Heart className="w-8 h-8 text-red-600 fill-current" />
          <h1 className="text-3xl font-black text-gray-900 uppercase tracking-widest">
            Избранное
          </h1>
          <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-bold">
            {products.length}
          </span>
        </div>

        {products.length > 0 ? (
          // Мы передаем пустой sort/query/cat, так как здесь просто список
          <CatalogGrid 
            initialProducts={products} 
            totalCount={products.length} 
            sort="newest" 
            query="" 
            category="" 
          />
        ) : (
          <div className="text-center py-20 bg-gray-50 rounded-3xl border border-gray-100">
            <div className="flex justify-center mb-6">
               <Heart className="w-16 h-16 text-gray-200" />
            </div>
            <p className="text-xl text-gray-500 font-bold mb-2">Ваш список избранного пуст</p>
            <p className="text-gray-400 mb-8">Добавляйте товары, чтобы не потерять их</p>
            <button 
              onClick={() => router.push('/catalog')}
              className="px-8 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition shadow-lg hover:shadow-red-200"
            >
              Перейти в каталог
            </button>
          </div>
        )}
      </div>
    </main>
  );
}