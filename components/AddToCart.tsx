'use client';

import { useCart } from '@/app/store';
import { useEffect, useState } from 'react';

// Интерфейс товара, который приходит из Каталога
interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  image_url: string | null;
  unit?: string | null;
  stock: number | null; // Важно: добавляем поле stock
}

export default function AddToCart({ product }: { product: Product }) {
  const { addItem, items, updateQuantity } = useCart();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Если товара нет в наличии (0 или null) — показываем серую кнопку
  // Делаем это СРАЗУ, чтобы пользователь видел статус
  if (!product.stock || product.stock <= 0) {
    return (
      <button
        disabled
        className="w-full mt-2 bg-gray-100 text-gray-400 py-2 rounded-md font-medium text-sm cursor-not-allowed border border-gray-200"
      >
        Нет в наличии
      </button>
    );
  }

  // Ждем загрузки клиента для работы с корзиной
  if (!mounted) {
    return (
      <button
        className="w-full mt-2 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors font-medium text-sm"
      >
        В корзину
      </button>
    );
  }

  const cartItem = items.find((item) => item.id === product.id);

  if (cartItem) {
    return (
      <div className="flex items-center justify-between mt-2 border border-blue-600 rounded-md overflow-hidden bg-white">
        <button
          onClick={() => updateQuantity(product.id, Math.max(0, cartItem.quantity - 1))}
          className="px-3 py-2 text-blue-600 hover:bg-blue-50 font-bold"
        >
          -
        </button>
        <span className="text-gray-900 font-medium px-2 text-sm">{cartItem.quantity}</span>
        <button
          onClick={() => updateQuantity(product.id, cartItem.quantity + 1)}
          // Не даем добавить больше, чем есть на складе
          disabled={cartItem.quantity >= (product.stock || 0)}
          className={`px-3 py-2 font-bold ${
             cartItem.quantity >= (product.stock || 0) 
             ? 'text-gray-300 cursor-not-allowed' 
             : 'text-blue-600 hover:bg-blue-50'
          }`}
        >
          +
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        addItem({
          ...product,
          image_url: product.image_url || undefined,
          unit: product.unit || undefined
        });
      }}
      className="w-full mt-2 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors font-medium text-sm"
    >
      В корзину
    </button>
  );
}