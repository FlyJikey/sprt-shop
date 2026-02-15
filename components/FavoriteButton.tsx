'use client';

import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { toggleFavorite, getUserFavorites } from '@/app/actions';

interface FavoriteButtonProps {
  productId: number;
  className?: string;
  variant?: 'icon' | 'full'; // 'icon' - только сердце, 'full' - с текстом (если нужно)
}

export default function FavoriteButton({ productId, className = '', variant = 'icon' }: FavoriteButtonProps) {
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const favs = await getUserFavorites(user.id);
        if (favs.includes(productId)) {
          setIsFavorite(true);
        }
      }
      setLoading(false);
    };
    checkStatus();
  }, [productId]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!userId) {
      router.push('/login');
      return;
    }

    // Оптимистичное обновление
    setIsFavorite(!isFavorite);

    const res = await toggleFavorite(productId, userId);
    if (!res.success) {
      setIsFavorite(!isFavorite); // Вернуть как было при ошибке
      alert('Ошибка при обновлении избранного');
    } else {
      router.refresh(); // Обновить данные на странице (важно для страницы Избранного)
    }
  };

  if (loading) return <div className="w-6 h-6 animate-pulse bg-gray-200 rounded-full" />;

  return (
    <button
      onClick={handleToggle}
      className={`transition-all rounded-full flex items-center justify-center ${
        isFavorite 
          ? 'text-red-600 bg-red-50 hover:bg-red-100' 
          : 'text-gray-400 bg-white/80 hover:text-red-500 hover:bg-white'
      } ${className}`}
      title={isFavorite ? "Убрать из избранного" : "В избранное"}
    >
      <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
      {variant === 'full' && <span className="ml-2 text-sm font-medium">В избранное</span>}
    </button>
  );
}