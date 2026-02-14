"use client";

import { ArrowLeft, Phone, Mail, MapPin, Printer, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function OrderDetailPage() {
  const params = useParams(); // Получаем ID заказа из URL (например R-8829)
  const orderId = params.id;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
         <div className="flex items-center gap-4">
            <Link href="/admin/orders" className="p-2 bg-white rounded-lg border border-gray-200 hover:bg-gray-50">
               <ArrowLeft size={20} />
            </Link>
            <div>
               <h1 className="text-2xl font-bold flex items-center gap-3">
                 Заказ #{orderId} 
                 <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase">Новый</span>
               </h1>
               <p className="text-gray-500 text-sm">Создан 09.02.2026 в 14:30</p>
            </div>
         </div>
         
         <div className="flex gap-3">
            <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-gray-50">
               <Printer size={18} /> Печать накладной
            </button>
            <button className="bg-[#C5A070] text-white px-6 py-2 rounded-lg font-bold hover:bg-[#b08d55] flex items-center gap-2">
               <CheckCircle size={18} /> Подтвердить заказ
            </button>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         
         {/* ЛЕВАЯ КОЛОНКА: Товары */}
         <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
               <div className="px-6 py-4 border-b border-gray-100 font-bold bg-gray-50">Состав заказа</div>
               <div className="p-6">
                  {/* Товар 1 */}
                  <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-100 last:border-0 last:mb-0 last:pb-0">
                     <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-xs text-gray-400">Фото</span>
                     </div>
                     <div className="flex-1">
                        <h3 className="font-bold">iPhone 15 Pro</h3>
                        <p className="text-sm text-gray-500">Цвет: Natural Titanium</p>
                     </div>
                     <div className="text-right">
                        <p className="font-bold">$999.00</p>
                        <p className="text-sm text-gray-500">x1 шт.</p>
                     </div>
                  </div>
                  {/* Товар 2 */}
                  <div className="flex items-center gap-4">
                     <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-xs text-gray-400">Фото</span>
                     </div>
                     <div className="flex-1">
                        <h3 className="font-bold">Silicone Case MagSafe</h3>
                        <p className="text-sm text-gray-500">Цвет: Black</p>
                     </div>
                     <div className="text-right">
                        <p className="font-bold">$49.00</p>
                        <p className="text-sm text-gray-500">x1 шт.</p>
                     </div>
                  </div>
               </div>
               <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t border-gray-100">
                  <span className="font-bold text-gray-600">Итого к оплате:</span>
                  <span className="font-bold text-xl">$1,048.00</span>
               </div>
            </div>

            {/* История действий (Логи) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
               <h3 className="font-bold mb-4">История заказа</h3>
               <div className="space-y-4 border-l-2 border-gray-200 ml-2 pl-4">
                  <div className="relative">
                     <div className="absolute -left-[21px] top-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white"></div>
                     <p className="text-sm font-bold">Новый заказ создан</p>
                     <p className="text-xs text-gray-400">09.02.2026 14:30</p>
                  </div>
               </div>
            </div>
         </div>

         {/* ПРАВАЯ КОЛОНКА: Клиент */}
         <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
               <h3 className="font-bold mb-4 border-b border-gray-100 pb-2">Данные клиента</h3>
               
               <div className="space-y-4">
                  <div className="flex items-start gap-3">
                     <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold">ИИ</div>
                     <div>
                        <p className="font-bold text-sm">Иван Иванов</p>
                        <p className="text-xs text-gray-500">Новый клиент</p>
                     </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                     <Phone size={16} className="text-gray-400" />
                     <a href="tel:+79990000000" className="hover:text-[#C5A070]">+7 (999) 000-00-00</a>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                     <Mail size={16} className="text-gray-400" />
                     <a href="mailto:ivan@mail.ru" className="hover:text-[#C5A070]">ivan@mail.ru</a>
                  </div>
               </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
               <h3 className="font-bold mb-4 border-b border-gray-100 pb-2">Доставка</h3>
               <div className="flex items-start gap-3">
                  <MapPin size={20} className="text-[#C5A070] mt-1" />
                  <div>
                     <p className="font-bold text-sm">Самовывоз</p>
                     <p className="text-xs text-gray-500 mt-1">Магазин на Петровке, 10</p>
                  </div>
               </div>
            </div>

            <button className="w-full py-3 border border-red-200 text-red-600 rounded-lg font-bold hover:bg-red-50 flex items-center justify-center gap-2">
               <XCircle size={18} /> Отменить заказ
            </button>
         </div>

      </div>
    </div>
  );
}