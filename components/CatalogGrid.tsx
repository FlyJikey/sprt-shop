'use client';
import { getProxyImageUrl } from "@/lib/proxy-image";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import Link from 'next/link';
import AddToCart from '@/components/AddToCart';
import { Loader2 } from 'lucide-react';
import FavoriteButton from '@/components/FavoriteButton';

import Image from 'next/image';

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

  // Восстанавливаем стейт из кэша после маунта, чтобы избежать ошибки гидратации
  useEffect(() => {
    const cacheKey = `catalog-state-${sort}-${query}-${category}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);

        // Проверяем, что первый товар в кэше совпадает с первым товаром с сервера
        // Это защитит от устаревшего кэша, если логика поиска или БД изменилась
        const firstItemMatches = (initialProducts.length === 0 && (!parsed.products || parsed.products.length === 0)) ||
          (initialProducts.length > 0 && parsed.products && parsed.products.length > 0 && parsed.products[0].id === initialProducts[0].id);

        if (parsed && Array.isArray(parsed.products) && parsed.products.length >= initialProducts.length && firstItemMatches) {
          // Если в кэше больше товаров (пользователь подгружал страницы), восстанавливаем их
          if (parsed.products.length > initialProducts.length) {
            setProducts(parsed.products);
            setPage(parsed.page || 1);
          }
          if (parsed.scrollY) {
            window.sessionStorage.setItem('restore_scroll', parsed.scrollY.toString());
          }
        } else if (!firstItemMatches) {
          // Если кэш устарел (первый элемент не совпадает), удаляем его
          sessionStorage.removeItem(cacheKey);
        }
      } catch (e) {
        console.error("Cache parsing error", e);
      }
    }
  }, [sort, query, category, initialProducts]);

  const [loading, setLoading] = useState(false);
  const hasMore = products.length < totalCount;

  // Восстановление скролла после рендеринга восстановленных товаров
  useEffect(() => {
    const scrollY = window.sessionStorage.getItem('restore_scroll');
    if (scrollY) {
      // Имитируем небольшую задержку, чтобы браузер успел отрендерить DOM перед перемоткой
      setTimeout(() => {
        window.scrollTo({ top: parseInt(scrollY, 10), behavior: 'instant' });
        window.sessionStorage.removeItem('restore_scroll');
      }, 50);
    }
  }, []);

  // Сохраняем состояние при изменениях товаров, загрузочной страницы или скролла
  useEffect(() => {
    const handleScroll = () => {
      // Игнорируем скролл во время загрузки (когда он скачет) или если мы навигируемся
      if (typeof window === 'undefined') return;

      const cacheKey = `catalog-state-${sort}-${query}-${category}`;
      const state = {
        products,
        page,
        scrollY: window.scrollY
      };
      // Используем RequestAnimationFrame для дебаунса частого скролла (чтобы не убить производительность)
      sessionStorage.setItem(cacheKey, JSON.stringify(state));
    };

    let scrollTimeout: NodeJS.Timeout;
    const throttledScroll = () => {
      if (!scrollTimeout) {
        scrollTimeout = setTimeout(() => {
          handleScroll();
          scrollTimeout = undefined as any;
        }, 300); // Сохраняем не чаще 3 раз в секунду
      }
    };

    window.addEventListener('scroll', throttledScroll);

    // Принудительно сохраняем стейт при монтировании/обновлении товаров
    handleScroll();

    return () => {
      window.removeEventListener('scroll', throttledScroll);
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, [products, page, sort, query, category]);


  const loadMore = async () => {
    setLoading(true);
    const nextPage = page + 1;
    const itemsPerPage = 40;

    const from = (nextPage - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;

    let dbQuery = supabase.from('products').select('id, slug, name, price, image_url, category, stock');

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
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {products.map((product, index) => (
          <div
            key={product.id}
            className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 p-3 sm:p-5 flex flex-col border border-gray-100 h-full group relative"
          >
            {/* Фото товара */}
            <Link href={`/product/${product.slug}`} className="block relative aspect-square mb-3 sm:mb-4 bg-gray-50 rounded-xl overflow-hidden">
              {product.image_url ? (
                <Image
                  src={getProxyImageUrl(product.image_url)}
                  alt={product.name}
                  fill
                  priority={index < 4}
                  loading={index < 4 ? undefined : "lazy"}
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover mix-blend-multiply group-hover:scale-110 transition-transform duration-500"
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
            <Link href={`/product/${product.slug}`} className="block flex-grow mb-2 sm:mb-4">
              <div className="text-[9px] sm:text-[10px] text-red-600 mb-1 sm:mb-1.5 font-bold tracking-widest uppercase line-clamp-1 opacity-80">
                {product.category || 'Товар'}
              </div>
              <h3 className="font-semibold text-gray-800 line-clamp-3 sm:line-clamp-2 group-hover:text-red-700 transition-colors text-xs sm:text-sm leading-snug sm:leading-relaxed" title={product.name}>
                {product.name}
              </h3>
            </Link>

            {/* Блок цены и покупки */}
            <div className="mt-auto pt-3 sm:pt-4 border-t border-gray-50 space-y-2 sm:space-y-3">
              <div className="flex items-baseline gap-1 sm:gap-1.5">
                <span className="text-lg sm:text-2xl font-black text-gray-900 tracking-tight">
                  {/* Исправление: принудительная русская локаль */}
                  {Math.round(product.price).toLocaleString('ru-RU')}
                </span>
                <span className="text-xs sm:text-sm font-bold text-gray-400 uppercase">₽</span>
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
