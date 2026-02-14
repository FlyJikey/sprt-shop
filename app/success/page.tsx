import Link from "next/link";
import { Check, ArrowRight, MapPin } from "lucide-react";

export default function SuccessPage() {
  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center p-6 font-sans text-black">
      
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8 border border-green-100">
          <Check size={40} className="text-green-600" strokeWidth={3} />
        </div>

        <h1 className="text-3xl font-bold mb-4">Бронь подтверждена!</h1>
        <p className="text-gray-500 mb-8 leading-relaxed">
          Ваш заказ <span className="text-black font-bold">#R-8829</span> успешно зарезервирован. 
          Товар будет ждать вас в магазине в течение 2 дней.
        </p>

        <div className="bg-[#F9F9F9] p-6 rounded-lg text-left mb-8 border border-gray-100">
            <h3 className="font-bold text-sm uppercase tracking-wider mb-2 text-gray-400">Адрес самовывоза</h3>
            <p className="font-bold text-lg">Флагманский магазин Москва</p>
            <p className="text-gray-600">Улица Петровка, 10</p>
            <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between text-sm">
                <span>Часы работы:</span>
                <span className="font-bold">10:00 - 22:00</span>
            </div>
        </div>

        <Link href="/" className="block w-full bg-black text-white h-14 rounded-none flex items-center justify-center font-bold uppercase tracking-widest hover:bg-[#C5A070] transition-all">
          Вернуться на главную
        </Link>
      </div>

    </main>
  );
}