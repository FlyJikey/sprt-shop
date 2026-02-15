'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import Link from 'next/link';
import AddToCart from '@/components/AddToCart';
import { Loader2 } from 'lucide-react';
import FavoriteButton from '@/components/FavoriteButton';

interface Product {
  id: number;
  slug: string;
  name: string;
  price: number;
  image_url: string;
  category: string;
  stock: number;
}

interface CatalogGridProps {
  initialProducts: Product[];
  totalCount: number;
  sort: string;
  query: string;
  category: string;
}

export default function CatalogGrid({ initialProducts, totalCount, sort, query, category }: CatalogGridProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const hasMore = products.length < totalCount;

  const loadMore = async () => {
    setLoading(true);
    const nextPage = page + 1;
    const itemsPerPage = 40;
    
    const from = (nextPage - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;

    let dbQuery = supabase.from('products').select('*');

    if (query) {
      dbQuery = dbQuery.ilike('name', `%${query}%`);
    }

    if (category) {
       dbQuery = dbQuery.ilike('category', `${category}%`);
    }

    switch (sort) {
      case 'price_asc': 
        dbQuery = dbQuery.order('price', { ascending: true }).order('id', { ascending: true }); 
        break;
      case 'price_desc': 
        dbQuery = dbQuery.order('price', { ascending: false }).order('id', { ascending: true }); 
        break;
      case 'name_asc': 
        dbQuery = dbQuery.order('name', { ascending: true }).order('id', { ascending: true }); 
        break;
      case 'newest':
      default: 
        dbQuery = dbQuery.order('id', { ascending: false }); 
        break;
    }

    const { data } = await dbQuery.range(from, to);

    if (data) {
      setProducts((prev) => {
        const existingIds = new Set(prev.map(p => p.id));
        const uniqueNew = data.filter(p => !existingIds.has(p.id));
        return [...prev, ...uniqueNew];
      });
      setPage(nextPage);
    }
    setLoading(false);
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 p-5 flex flex-col border border-gray-100 h-full group relative"
          >
            {/* Фото товара */}
            <Link href={`/product/${product.slug}`} className="block relative aspect-square mb-4 bg-gray-50 rounded-xl overflow-hidden">
              {product.image_url && product.image_url !== '/window.svg' ? (
                  <img 
                    src={product.image_url} 
                    alt={product.name} 
                    className="w-full h-full object-contain p-2 mix-blend-multiply group-hover:scale-110 transition-transform duration-500" 
                  />
              ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs italic">
                    Фото ожидается
                  </div>
              )}
              
              {/* НОВАЯ КНОПКА ИЗБРАННОГО ЧЕРЕЗ КОМПОНЕНТ */}
              <div className="absolute top-2 right-2 z-10">
                <FavoriteButton productId={product.id} className="p-2 shadow-sm" />
              </div>
            </Link>

            {/* Описание */}
            <Link href={`/product/${product.slug}`} className="block flex-grow mb-4">
              <div className="text-[10px] text-red-600 mb-1.5 font-bold tracking-widest uppercase line-clamp-1 opacity-80">
                {product.category || 'Товар'}
              </div>
              <h3 className="font-semibold text-gray-800 line-clamp-2 group-hover:text-red-700 transition-colors text-sm leading-relaxed" title={product.name}>
                {product.name}
              </h3>
            </Link>

            {/* Блок цены и покупки */}
            <div className="mt-auto pt-4 border-t border-gray-50 space-y-3">
              <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-gray-900 tracking-tight">
                    {/* Исправление: принудительная русская локаль */}
                    {Math.round(product.price).toLocaleString('ru-RU')}
                  </span>
                  <span className="text-sm font-bold text-gray-400 uppercase">₽</span>
              </div>
              <AddToCart product={product} />
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="mt-16 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-12 py-4 bg-white border-2 border-gray-100 rounded-2xl font-bold text-gray-900 hover:border-red-600 hover:text-red-600 hover:shadow-lg transition-all flex items-center gap-3 active:scale-95"
          >
            {loading && <Loader2 className="animate-spin w-5 h-5 text-red-600" />}
            {loading ? 'Загружаем...' : 'Показать еще товары'}
          </button>
        </div>
      )}
    </>
  );
}