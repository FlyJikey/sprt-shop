"use client";

import React, { useState, useEffect, Suspense } from "react";
import Header from "@/components/Header";
import { useCart } from "../store";
import Link from "next/link";
import { ArrowLeft, MapPin, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { submitOrder } from "../actions";
import { supabase } from "@/lib/supabase";

// --- ВНУТРЕННИЙ КОМПОНЕНТ С ЛОГИКОЙ ---
function CheckoutContent() {
  const { items, clearCart } = useCart();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUserId(data.user.id);
    });
  }, []);

  const totalPrice = items.reduce((sum, item) => {
    return sum + item.price * item.quantity;
  }, 0);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const formData = new FormData(e.currentTarget);
    const firstName = formData.get("first_name") as string;
    const lastName = formData.get("last_name") as string;

    // Combine name for action
    formData.set("name", `${firstName} ${lastName}`);

    try {
      const result = await submitOrder(formData, items, totalPrice, userId || undefined);

      if (result.success) {
        clearCart();
        router.push("/success");
      } else {
        setErrorMsg(result.error || "Произошла ошибка при оформлении заказа. Попробуйте еще раз.");
        setLoading(false);
      }
    } catch (err) {
      setErrorMsg("Ошибка соединения. Пожалуйста, проверьте интернет.");
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-white font-sans text-black">
        <Header />
        <div className="p-10 text-center py-32">
          <h1 className="text-2xl font-bold mb-4">Корзина пуста</h1>
          <p className="text-gray-500 mb-8">Вы уже оформили заказ или удалили все товары.</p>
          <Link
            href="/catalog"
            className="inline-block bg-black text-white px-8 py-3 uppercase text-sm font-bold tracking-widest hover:bg-[#C5A070] transition-colors"
          >
            Вернуться в каталог
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white pb-20 font-sans text-black">
      <Header />

      <div className="max-w-[1000px] mx-auto px-6 py-10">
        <Link href="/cart" className="inline-flex items-center text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-black mb-8">
          <ArrowLeft size={14} className="mr-2" /> Назад в корзину
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">
          <div>
            <h1 className="text-3xl font-bold mb-2">Оформление брони</h1>
            <p className="text-gray-500 text-sm mb-8">Заполните данные для резервирования товара.</p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {errorMsg && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm mb-6 border border-red-100">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-700">Имя</label>
                  <input name="first_name" required type="text" className="w-full border-b border-gray-300 py-2 outline-none focus:border-[#C5A070] transition-colors bg-transparent placeholder:text-gray-300" placeholder="Иван" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-700">Фамилия</label>
                  <input name="last_name" required type="text" className="w-full border-b border-gray-300 py-2 outline-none focus:border-[#C5A070] transition-colors bg-transparent placeholder:text-gray-300" placeholder="Иванов" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700">Email</label>
                <input name="email" required type="email" className="w-full border-b border-gray-300 py-2 outline-none focus:border-[#C5A070] transition-colors bg-transparent placeholder:text-gray-300" placeholder="ivan@example.com" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700">Телефон</label>
                <input name="phone" required type="tel" className="w-full border-b border-gray-300 py-2 outline-none focus:border-[#C5A070] transition-colors bg-transparent placeholder:text-gray-300" placeholder="+7 (999) 000-00-00" />
              </div>

              <div className="bg-[#F9F9F9] p-6 rounded-lg mt-8 border border-gray-100">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <MapPin size={18} className="text-[#9C2730]" /> Забрать в магазине
                </h3>
                <p className="text-sm text-gray-600 mb-2">Флагманский магазин "Спартак"</p>
                <p className="text-sm text-gray-500">Оплата при получении товара</p>
                <div className="flex items-center gap-2 mt-4 text-xs font-bold text-green-700 bg-green-50 w-fit px-3 py-1 rounded-full">
                  <Clock size={12} /> Готов к выдаче через 2 часа
                </div>
              </div>

              <button
                disabled={loading}
                type="submit"
                className="w-full bg-black text-white h-14 font-bold uppercase tracking-widest hover:bg-[#C5A070] transition-all mt-8 disabled:opacity-70 disabled:cursor-wait"
              >
                {loading ? "Обработка..." : "Забронировать"}
              </button>
              <p className="text-[10px] text-gray-400 text-center mt-4 px-4 leading-relaxed">
                Нажимая кнопку, вы соглашаетесь с{" "}
                <Link href="/about/privacy" className="underline hover:text-black">Политикой конфиденциальности</Link>,{" "}
                <Link href="/about/terms" className="underline hover:text-black">Пользовательским соглашением</Link> и{" "}
                соглашаетесь на обработку персональных данных в соответствии с ФЗ №152-ФЗ.
                Оплата производится при получении в магазине.
              </p>
            </form>
          </div>

          <div className="bg-[#FAFAFA] p-8 h-fit border border-gray-100">
            <h3 className="font-bold text-lg mb-6 pb-4 border-b border-gray-200">Состав заказа</h3>

            <div className="space-y-4 mb-6">
              {items.map(item => (
                <div key={item.id} className="flex justify-between items-start text-sm">
                  <span className="text-gray-600">{item.name} <span className="text-xs text-gray-400">x{item.quantity}</span></span>
                  <span className="font-bold">{item.price} ₽</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between text-xl font-bold border-t border-gray-200 pt-6">
              <span>Итого</span>
              <span>{totalPrice.toLocaleString()} ₽</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// --- ВАЖНО: ГЛАВНЫЙ ЭКСПОРТ (ОБЕРТКА) ---
export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <CheckoutContent />
    </Suspense>
  );
}