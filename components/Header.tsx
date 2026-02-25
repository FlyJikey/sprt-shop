'use client';

import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { ShoppingCart, Search, Menu, X, User, Heart, Bell, LayoutGrid } from 'lucide-react';
import { useCart } from '@/app/store';
import { supabase } from '@/lib/supabase-client';
import CategoryMenu from './CategoryMenu';

function HeaderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { items } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(searchParams.get('q') || '');
  const [categories, setCategories] = useState<any[]>([]);

  // Состояние пользователя
  const [user, setUser] = useState<any>(null);
  const [hasNotification, setHasNotification] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    // 1. Загружаем категории (для мобильного меню)
    const fetchCategories = async () => {
      const { data } = await supabase.from('categories').select('*').is('parent_path', null).order('name');
      if (data) setCategories(data);
    };
    fetchCategories();

    // 2. Проверяем пользователя при загрузке
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser(user);
      if (user) {
        const { data } = await supabase
          .from('waitlist')
          .select('id, products(stock)')
          .eq('user_id', user.id);

        if (data) {
          const available = data.some((item: any) => (item.products?.stock || 0) > 0);
          setHasNotification(available);
          if (available && pathname === '/') {
            const notified = sessionStorage.getItem('waitlist_notified');
            if (!notified) {
              sessionStorage.setItem('waitlist_notified', 'true');
              setTimeout(() => setShowToast(true), 1500);
            }
          }
        }
      }
    });

    // 3. Следим за изменениями (вход/выход)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      router.push(`/catalog?q=${encodeURIComponent(searchValue.trim())}`);
    } else {
      router.push('/catalog');
    }
    setIsMenuOpen(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <header className="bg-white sticky top-0 z-40 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-20">

          {/* Логотип и Каталог */}
          <div className="flex-shrink-0 flex items-center gap-12 lg:gap-16">
            <Link
              href="/"
              className="text-3xl font-serif font-black text-spartak tracking-widest uppercase hover:opacity-80 transition"
              style={{ color: '#9C2730' }}
            >
              СПАРТАК
            </Link>

            {/* Десктопное меню категорий */}
            <div className="hidden md:block">
              <CategoryMenu />
            </div>
          </div>

          {/* Поиск (Desktop) */}
          {/* ml-4: Минимальный отступ от кнопки каталога (притягиваем влево) */}
          <div className="hidden md:flex flex-1 max-w-xl ml-4">
            <form onSubmit={handleSearch} className="w-full relative">
              <input
                type="text"
                placeholder="Поиск товаров..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-transparent hover:bg-white hover:border-gray-200 focus:bg-white border focus:border-blue-600 rounded-xl outline-none transition-all"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
              />
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            </form>
          </div>

          {/* Иконки: Профиль, Избранное, Корзина */}
          <div className="flex items-center gap-4 sm:gap-6 ml-auto">

            {/* --- ИКОНКА ПРОФИЛЯ --- */}
            {user ? (
              <Link
                href="/profile"
                className="flex flex-col items-center gap-1 text-gray-600 hover:text-red-600 transition-all group"
                title="Личный кабинет"
              >
                <div className="relative">
                  <User className="h-6 w-6 group-hover:scale-105 transition-transform" />
                  {hasNotification && (
                    <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-red-600 border border-white"></span>
                  )}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider mt-0.5">Профиль</span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="flex flex-col items-center gap-1 text-gray-600 hover:text-red-600 transition-all group"
              >
                <User className="h-6 w-6 group-hover:scale-105 transition-transform" />
                <span className="text-[10px] font-bold uppercase tracking-wider mt-0.5">Войти</span>
              </Link>
            )}

            {/* --- ИКОНКА ИЗБРАННОГО --- */}
            <Link
              href={user ? "/profile?tab=favorites" : "/login"}
              className="flex flex-col items-center gap-1 text-gray-600 hover:text-red-600 transition-all group"
              title="Избранное"
            >
              <Heart className="h-6 w-6 group-hover:scale-105 transition-transform" />
              <span className="text-[10px] font-bold uppercase tracking-wider mt-0.5">Избранное</span>
            </Link>

            {/* --- ИКОНКА КОРЗИНЫ --- */}
            <Link
              href="/cart"
              className="relative flex flex-col items-center gap-1 text-gray-600 hover:text-red-600 transition-all group"
            >
              <div className="relative">
                <ShoppingCart className="h-6 w-6 group-hover:scale-105 transition-transform" />
                {totalItems > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-white">
                    {totalItems}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider mt-0.5">Корзина</span>
            </Link>

            {/* Мобильный бургер */}
            <button
              className="md:hidden p-2 text-gray-600"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
            </button>
          </div>
        </div>

        {/* Мобильный поиск */}
        <div className="md:hidden px-4 pb-4">
          <form onSubmit={handleSearch} className="w-full relative">
            <input
              type="text"
              placeholder="Поиск товаров..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-transparent hover:bg-white hover:border-gray-200 focus:bg-white border focus:border-blue-600 rounded-xl outline-none transition-all"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          </form>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 absolute w-full left-0 shadow-xl p-4 space-y-4 h-[calc(100vh-140px)] overflow-y-auto">

          <div className="pt-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Каталог</p>
            <Link
              href="/catalog"
              className="flex items-center gap-3 p-3 text-lg font-bold text-gray-900 border-b border-gray-50 mb-2 hover:bg-gray-50 rounded-lg"
              onClick={() => setIsMenuOpen(false)}
            >
              <LayoutGrid size={20} className="text-gray-400" />
              Все товары
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/catalog?category=${encodeURIComponent(cat.path)}`}
                className="block p-3 text-lg font-medium text-gray-800 hover:bg-gray-50 rounded-lg"
                onClick={() => setIsMenuOpen(false)}
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Toast Уведомление о поступлении товара */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-white border border-gray-100 shadow-2xl rounded-3xl p-4 flex gap-4 items-start max-w-sm animate-in slide-in-from-bottom-5">
          <div className="bg-red-50 text-red-600 p-3 rounded-2xl">
            <Bell size={24} />
          </div>
          <div className="flex-1 mt-1">
            <h4 className="font-black text-gray-900 text-sm mb-1 uppercase tracking-tighter">Товар поступил!</h4>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">Товар из вашего <span className="font-bold text-gray-700">листа ожидания</span> снова в наличии.</p>
            <div className="flex gap-2">
              <Link href="/profile?tab=waitlist" onClick={() => setShowToast(false)} className="bg-spartak text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-red-700 active:scale-95 transition-all shadow-md">
                Перейти
              </Link>
              <button onClick={() => setShowToast(false)} className="text-[10px] text-gray-400 font-bold uppercase tracking-widest px-3 hover:text-gray-900 transition-colors">
                Скрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export default function Header() {
  return (
    <Suspense fallback={<header className="bg-white sticky top-0 z-40 border-b border-gray-100 h-20" />}>
      <HeaderContent />
    </Suspense>
  );
}