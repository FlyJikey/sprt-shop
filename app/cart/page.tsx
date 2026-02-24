'use client';

import Header from '@/components/Header';
import { useCart } from '@/app/store';
import Link from 'next/link';
import { Trash2, Minus, Plus, X, CheckCircle, UserCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client'; // Для проверки сессии
import { submitOrder } from '@/app/actions';
import Image from 'next/image';

export default function CartPage() {
  const { items, removeItem, updateQuantity, clearCart } = useCart();
  const [mounted, setMounted] = useState(false);

  // Состояния для оформления
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderCompleteId, setOrderCompleteId] = useState<number | null>(null);

  // Данные пользователя для автозаполнения
  const [userProfile, setUserProfile] = useState<{ id: string, full_name: string, phone: string } | null>(null);

  useEffect(() => {
    setMounted(true);
    checkUser();
  }, []);

  // Функция проверки: залогинен ли юзер?
  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (prof) {
        setUserProfile({
          id: user.id,
          full_name: prof.full_name || '',
          phone: prof.phone || ''
        });
      }
    }
  };

  if (!mounted) return null;

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCheckout = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);

    // Передаем FormData, товары, итог и ID пользователя (если есть)
    const result = await submitOrder(formData, items, total, userProfile?.id);

    setIsSubmitting(false);

    if (result.success) {
      clearCart();
      setOrderCompleteId(result.orderId);
      setIsCheckoutOpen(false);
    } else {
      alert('Ошибка: ' + result.message);
    }
  };

  // ЭКРАН УСПЕХА
  if (orderCompleteId) {
    return (
      <main className="min-h-screen bg-white">
        <Header />
        <div className="flex flex-col items-center justify-center pt-20 px-4 text-center">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
            <CheckCircle size={40} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Заказ оформлен!</h1>
          <p className="text-gray-500 mb-8 max-w-md">
            Ваш заказ <span className="font-bold text-gray-900">#{orderCompleteId}</span> принят в обработку.
          </p>
          <div className="flex gap-4">
            <Link href="/catalog" className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition">
              В каталог
            </Link>
            {userProfile && (
              <Link href="/profile" className="bg-gray-100 text-gray-700 px-8 py-3 rounded-lg hover:bg-gray-200 transition">
                В личный кабинет
              </Link>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Корзина</h1>

        {items.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-xl text-gray-500 mb-4">Тут пока ничего нет</p>
            <Link href="/catalog" className="text-blue-600 hover:underline">Вернуться к покупкам</Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-100">
              {items.map((item) => (
                <div key={item.id} className="p-6 flex flex-col sm:flex-row items-center gap-6">
                  <div className="w-20 h-20 bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden border relative">
                    {item.image_url ? <Image src={item.image_url} alt={item.name} fill sizes="80px" className="object-contain p-1" /> : <span className="text-[10px] text-gray-400">Нет фото</span>}
                  </div>
                  <div className="flex-grow text-center sm:text-left">
                    <h3 className="font-bold text-gray-900">{item.name}</h3>
                    <p className="text-sm text-gray-500">{item.price} ₽ / шт.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-gray-50">-</button>
                    <span className="w-6 text-center font-bold">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-gray-50">+</button>
                  </div>
                  <div className="text-right font-bold text-lg min-w-[100px]">{item.price * item.quantity} ₽</div>
                  <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={20} /></button>
                </div>
              ))}
            </div>

            <div className="p-6 bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-sm text-gray-500">Бесплатный самовывоз из магазина</div>
              <div className="flex items-center gap-8">
                <div className="text-2xl font-black text-gray-900">Итого: {total} ₽</div>
                <button
                  onClick={() => setIsCheckoutOpen(true)}
                  className="bg-blue-600 text-white px-10 py-4 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-100"
                >
                  Оформить заказ
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* МОДАЛЬНОЕ ОКНО ОФОРМЛЕНИЯ */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 flex justify-between items-center border-b">
              <h2 className="text-xl font-bold">Данные для заказа</h2>
              <button onClick={() => setIsCheckoutOpen(false)}><X /></button>
            </div>

            <form onSubmit={handleCheckout} className="p-6 space-y-4">
              {userProfile && (
                <div className="bg-green-50 p-3 rounded-lg flex items-center gap-2 text-green-700 text-sm mb-2">
                  <UserCheck size={18} />
                  <span>Вы вошли как <b>{userProfile.full_name}</b>. Данные подставлены автоматически.</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Имя получателя</label>
                <input
                  name="name" required
                  defaultValue={userProfile?.full_name || ''}
                  className="w-full p-3 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Телефон</label>
                <input
                  name="phone" type="tel" required
                  defaultValue={userProfile?.phone || ''}
                  className="w-full p-3 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Комментарий</label>
                <textarea
                  name="comment" rows={2}
                  className="w-full p-3 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <button
                type="submit" disabled={isSubmitting}
                className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {isSubmitting ? 'Отправка...' : `Подтвердить заказ на ${total} ₽`}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}