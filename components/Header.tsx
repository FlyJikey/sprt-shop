'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ShoppingCart, Search, Menu, X, User, LogOut } from 'lucide-react';
import { useCart } from '@/app/store';
import { supabase } from '@/lib/supabase-client';
import CategoryMenu from './CategoryMenu';

export default function Header() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(searchParams.get('q') || '');
  const [navLinks, setNavLinks] = useState<any[]>([]);
  
  // Состояние пользователя
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // 1. Загружаем навигационные ссылки (верхнее меню)
    const fetchNav = async () => {
        const { data } = await supabase.from('nav_links').select('*').order('sort_order');
        if (data) setNavLinks(data);
    };
    fetchNav();

    // 2. Проверяем пользователя при загрузке
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
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
        {/* Убрали justify-between, чтобы элементы шли подряд слева направо */}
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
          {/* ml-8: отступ от каталога. ml-auto (на иконках ниже) отодвинет всё остальное вправо */}
          <div className="hidden md:flex flex-1 max-w-xl ml-8 lg:ml-12">
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

          {/* Иконки: Профиль и Корзина */}
          {/* ml-auto прижимает этот блок к правому краю */}
          <div className="flex items-center gap-2 sm:gap-4 ml-auto">
            
            {/* --- ИКОНКА ПРОФИЛЯ --- */}
            {user ? (
              <div className="hidden sm:flex items-center gap-2">
                 <Link 
                  href="/profile" 
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all flex flex-col items-center"
                  title="Личный кабинет"
                >
                    <User className="h-6 w-6" />
                </Link>
              </div>
            ) : (
              <Link 
                href="/login" 
                className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-700 hover:text-blue-600 transition-colors"
              >
                  Войти
              </Link>
            )}

            {/* --- ИКОНКА КОРЗИНЫ --- */}
            <Link href="/cart" className="relative p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all">
                <ShoppingCart className="h-6 w-6" />
                {totalItems > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white ring-2 ring-white">
                    {totalItems}
                    </span>
                )}
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
      </div>

      {/* Мобильное меню */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 absolute w-full left-0 shadow-xl p-4 space-y-4 h-[calc(100vh-80px)] overflow-y-auto">
          
          <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder="Поиск..."
                className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-600"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
              />
              <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
          </form>

          <div className="border-t border-gray-100 pt-4">
             <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Меню</p>
             {navLinks.map((link) => (
                <Link 
                  key={link.id} 
                  href={link.href} 
                  className="block p-3 text-lg font-medium text-gray-800 hover:bg-gray-50 rounded-lg"
                  onClick={() => setIsMenuOpen(false)}
                >
                    {link.label}
                </Link>
             ))}
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Аккаунт</p>
            {user ? (
               <>
                 <Link 
                   href="/profile" 
                   className="flex items-center gap-3 p-3 bg-blue-50 text-blue-700 rounded-xl font-bold mb-2"
                   onClick={() => setIsMenuOpen(false)}
                 >
                   <User size={20} />
                   Личный кабинет
                 </Link>
                 <button 
                    onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                    className="flex items-center gap-3 p-3 text-red-500 hover:bg-red-50 rounded-xl font-medium w-full"
                 >
                   <LogOut size={20} />
                   Выйти
                 </button>
               </>
            ) : (
                <Link 
                href="/login" 
                className="flex items-center justify-center p-3 bg-black text-white rounded-xl font-bold"
                onClick={() => setIsMenuOpen(false)}
              >
                Войти / Регистрация
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}