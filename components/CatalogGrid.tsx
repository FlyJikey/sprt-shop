'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import Link from 'next/link';
import AddToCart from '@/components/AddToCart';
import { Loader2 } from 'lucide-react';

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
  category: string; // <-- 1. ДОБАВИЛИ В СПИСОК ПАРАМЕТРОВ
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

    // Учитываем поиск
    if (query) {
      dbQuery = dbQuery.ilike('name', `%${query}%`);
    }

    // 2. ИСПРАВЛЕНИЕ: Учитываем категорию при подгрузке!
    // Теперь кнопка знает, что мы в "Пультах", и грузит только их
    if (category) {
       dbQuery = dbQuery.ilike('category', `${category}%`);
    }

    // Сортировка
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
            className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-4 flex flex-col border border-gray-100 h-full group"
          >
            <Link href={`/product/${product.slug}`} className="block relative aspect-square mb-4 bg-gray-50 rounded-lg overflow-hidden">
              {product.image_url && product.image_url !== '/window.svg' ? (
                  <img 
                    src={product.image_url} 
                    alt={product.name} 
                    className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300" 
                  />
              ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                    Нет фото
                  </div>
              )}
            </Link>

            <Link href={`/product/${product.slug}`} className="block flex-grow">
              <div className="text-xs text-blue-600 mb-1 font-medium tracking-wide uppercase line-clamp-1">
                {product.category || 'Товар'}
              </div>
              <h3 className="font-medium text-gray-900 line-clamp-2 hover:text-blue-600 transition-colors mb-2 text-sm leading-snug" title={product.name}>
                {product.name}
              </h3>
            </Link>

            <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
              <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-gray-900">{product.price}</span>
                  <span className="text-sm font-medium text-gray-500">₽</span>
              </div>
              <AddToCart product={product} />
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="mt-12 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-10 py-3 bg-white border border-gray-200 rounded-full font-medium text-gray-900 hover:bg-gray-50 hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-2"
          >
            {loading && <Loader2 className="animate-spin w-4 h-4 text-gray-500" />}
            {loading ? 'Загрузка...' : 'Показать еще'}
          </button>
        </div>
      )}
    </>
  );
}