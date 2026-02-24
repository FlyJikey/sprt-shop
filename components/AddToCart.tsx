'use client';

import { useCart } from '@/app/store';
import { useEffect, useState } from 'react';
import NotifyButton from './NotifyButton';

interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  image_url: string | null;
  unit?: string | null;
  stock: number | null;
}

export default function AddToCart({ product }: { product: Product }) {
  const { addItem, items, updateQuantity } = useCart();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!product.stock || product.stock <= 0) {
    return (
      <NotifyButton productId={product.id} />
    );
  }

  if (!mounted) {
    return (
      <button
        className="w-full mt-2 bg-spartak text-white py-2 rounded-md transition-colors font-medium text-sm opacity-80"
      >
        В корзину
      </button>
    );
  }

  const cartItem = items.find((item) => item.id === product.id);

  if (cartItem) {
    return (
      <div className="flex items-center justify-between mt-2 border border-spartak rounded-md overflow-hidden bg-white">
        <button
          onClick={() => updateQuantity(product.id, Math.max(0, cartItem.quantity - 1))}
          className="px-3 py-2 text-spartak hover:bg-red-50 font-bold transition-colors"
        >
          -
        </button>
        <span className="text-gray-900 font-medium px-2 text-sm">{cartItem.quantity}</span>
        <button
          onClick={() => updateQuantity(product.id, cartItem.quantity + 1)}
          disabled={cartItem.quantity >= (product.stock || 0)}
          className={`px-3 py-2 font-bold transition-colors ${cartItem.quantity >= (product.stock || 0)
            ? 'text-gray-300 cursor-not-allowed'
            : 'text-spartak hover:bg-red-50'
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
      className="w-full mt-2 bg-spartak text-white py-2 rounded-md hover:bg-opacity-90 transition-all font-medium text-sm"
    >
      В корзину
    </button>
  );
}