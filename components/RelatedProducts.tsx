"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Package, Sparkles, ChevronDown } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  image_url: string | null;
}

interface RelatedProductsProps {
  products: Product[];
}

export default function RelatedProducts({ products }: RelatedProductsProps) {
  const [visibleCount, setVisibleCount] = useState(8); // Сразу показываем 8 штук (2 ряда по 4)

  const showMore = () => {
    setVisibleCount((prev) => prev + 8); // Добавляем еще 8 (или сколько осталось)
  };

  // Если товаров нет, ничего не рисуем
  if (!products || products.length === 0) return null;

  return (
    <div className="mt-20">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-[#9C2730]/10 rounded-lg">
          <Sparkles className="text-[#9C2730]" size={20} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Вам может понравиться</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.slice(0, visibleCount).map((related) => (
          <Link
            key={related.id}
            href={`/product/${related.slug}`}
            className="group flex flex-col bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
          >
            {/* Картинка */}
            <div className="aspect-square bg-gray-50 rounded-xl mb-4 relative flex items-center justify-center overflow-hidden">
              {related.image_url ? (
                <Image
                  src={related.image_url}
                  alt={related.name}
                  fill
                  className="object-contain p-4 group-hover:scale-110 transition-transform duration-500"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              ) : (
                <Package className="text-gray-300" size={32} />
              )}
            </div>

            {/* Инфо */}
            <div className="mt-auto">
              <h3 className="font-bold text-gray-900 text-sm leading-snug mb-2 line-clamp-2 group-hover:text-[#C5A070] transition-colors">
                {related.name}
              </h3>
              <div className="font-black text-lg text-gray-900">
                {related.price} ₽
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Кнопка "Показать еще" (появляется только если есть скрытые товары) */}
      {visibleCount < products.length && (
        <div className="mt-10 flex justify-center">
          <button
            onClick={showMore}
            className="flex items-center gap-2 px-8 py-3 bg-white border border-gray-200 rounded-full font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
          >
            Показать еще <ChevronDown size={18} />
          </button>
        </div>
      )}
    </div>
  );
}