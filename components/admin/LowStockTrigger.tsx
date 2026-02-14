'use client';

import { useState } from 'react';
import { AlertTriangle, X, Loader2, Package } from 'lucide-react';
import { supabase } from '@/lib/supabase-client';
import Image from 'next/image';

interface Props {
  count: number;
}

export default function LowStockTrigger({ count }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Функция загрузки списка при открытии
  const handleOpen = async () => {
    setIsOpen(true);
    if (items.length === 0) { // Грузим только 1 раз
      setLoading(true);
      const { data } = await supabase
        .from('products')
        .select('id, name, stock, price, image_url')
        .gt('stock', 0)
        .lt('stock', 3)
        .order('stock', { ascending: true }); // Сначала самые редкие
      
      setItems(data || []);
      setLoading(false);
    }
  };

  return (
    <>
      {/* ПЛИТКА (КНОПКА) */}
      <div 
        onClick={handleOpen}
        className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md hover:border-orange-200 transition-all group"
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider group-hover:text-orange-500 transition-colors">Заканчиваются</p>
            <h3 className="text-3xl font-black text-gray-900 mt-2">{count}</h3>
          </div>
          <div className="p-3 bg-orange-50 rounded-xl group-hover:bg-orange-100 transition-colors">
            <AlertTriangle className="w-6 h-6 text-orange-500" />
          </div>
        </div>
        <p className="text-xs text-orange-500 font-bold underline decoration-dotted underline-offset-4">
          Показать список
        </p>
      </div>

      {/* МОДАЛЬНОЕ ОКНО */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
            
            {/* Шапка окна */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <AlertTriangle className="text-orange-500" />
                Товары на исходе
                <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs">{items.length || count}</span>
              </h2>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Список */}
            <div className="overflow-y-auto p-0">
              {loading ? (
                <div className="p-10 flex justify-center text-gray-400">
                  <Loader2 className="animate-spin" size={32} />
                </div>
              ) : items.length === 0 ? (
                <div className="p-10 text-center text-gray-400">Список пуст</div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase sticky top-0">
                    <tr>
                      <th className="px-6 py-3">Фото</th>
                      <th className="px-6 py-3">Название</th>
                      <th className="px-6 py-3">Цена</th>
                      <th className="px-6 py-3 text-right">Остаток</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3 w-16">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                             {item.image_url ? (
                               <Image src={item.image_url} alt="" width={40} height={40} className="object-cover w-full h-full" />
                             ) : <Package size={16} className="text-gray-300"/>}
                          </div>
                        </td>
                        <td className="px-6 py-3 font-medium text-gray-900">{item.name}</td>
                        <td className="px-6 py-3 text-gray-500">{item.price} ₽</td>
                        <td className="px-6 py-3 text-right">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                            {item.stock} шт.
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            {/* Подвал окна */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 text-right">
              <button 
                onClick={() => setIsOpen(false)}
                className="px-6 py-2 bg-black text-white rounded-lg text-sm font-bold hover:bg-gray-800 transition-colors"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}