'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, ChevronRight, Loader2, Package, LayoutGrid } from 'lucide-react';
import { supabase } from '@/lib/supabase-client';

interface Category {
  id: number;
  name: string;
  path: string;
  parent_path: string | null;
  level: number;
}

// --- ГЛОБАЛЬНЫЙ КЭШ ---
// Храним данные вне компонента, чтобы они не стирались при смене страниц
let cachedCategories: Category[] | null = null;
let isFetching = false;
let fetchPromise: Promise<Category[] | null> | null = null;

export default function CategoryMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>(cachedCategories || []);
  const [loading, setLoading] = useState(!cachedCategories);
  const [activeRoot, setActiveRoot] = useState<Category | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      // 1. Если есть кэш — используем сразу и выходим
      if (cachedCategories) {
        if (mounted) {
          setCategories(cachedCategories);
          setLoading(false);
        }
        return;
      }

      // 2. Если запрос уже идет (на другой вкладке/компоненте), ждем его
      if (isFetching && fetchPromise) {
         try {
           const data = await fetchPromise;
           if (mounted && data) {
             setCategories(data);
             setLoading(false);
           }
         } catch (err) {
            // Игнорируем ошибки параллельных запросов
         }
         return;
      }

      // 3. Делаем новый запрос
      isFetching = true;
      setLoading(true);

      // Создаем промис запроса, чтобы переиспользовать его
      fetchPromise = (async () => {
        try {
          const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('name');

          if (error) throw error;
          
          cachedCategories = data; // Сохраняем в кэш
          return data;
        } catch (error: any) {
          console.error('Category load error:', error.message);
          return null;
        } finally {
          isFetching = false;
        }
      })();

      // Ждем результат
      const result = await fetchPromise;
      
      if (mounted) {
        if (result) setCategories(result);
        setLoading(false);
      }
    };

    loadData();

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      mounted = false;
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 1. Корневые категории (Level 1)
  const rootCategories = categories.filter(c => !c.parent_path);

  // 2. Получение подкатегорий (Level 2)
  const getLevel2 = (rootPath: string) => {
    return categories.filter(c => c.parent_path === rootPath);
  };

  // 3. Получение детей (Level 3)
  const getLevel3 = (parentPath: string) => {
    return categories.filter(c => c.parent_path === parentPath);
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Кнопка "Каталог" */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all font-bold shadow-sm border
          ${isOpen 
             ? 'bg-black text-white border-black ring-2 ring-gray-200' 
             : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }`}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
        <span>Каталог</span>
      </button>

      {/* Выпадающее меню */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-3 w-[900px] bg-white rounded-2xl shadow-2xl border border-gray-100 flex overflow-hidden z-50 min-h-[500px] animate-in fade-in zoom-in-95 duration-200">
          
          {/* ЛЕВАЯ КОЛОНКА (Корни) */}
          <div className="w-1/3 bg-gray-50 border-r border-gray-100 overflow-y-auto max-h-[600px] py-2 custom-scrollbar">
            
            {/* --- БЛОК "ВСЕ ТОВАРЫ" --- */}
            <Link
              href="/catalog"
              onClick={() => setIsOpen(false)}
              onMouseEnter={() => setActiveRoot(null)}
              className="w-full text-left px-6 py-4 text-sm font-black uppercase tracking-widest flex items-center gap-3 transition-all text-gray-900 hover:bg-blue-50 hover:text-blue-600 border-b border-gray-100 group"
            >
              <LayoutGrid size={18} className="text-gray-400 group-hover:text-blue-600 transition-colors"/>
              Все товары
            </Link>

            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-400"/></div>
            ) : (
              rootCategories.map(cat => (
                <button
                  key={cat.id}
                  onMouseEnter={() => setActiveRoot(cat)}
                  onClick={() => setActiveRoot(cat)}
                  className={`w-full text-left px-6 py-4 text-sm font-bold flex justify-between items-center transition-all
                    ${activeRoot?.id === cat.id 
                       ? 'bg-white text-black shadow-sm border-l-4 border-black' 
                       : 'text-gray-500 hover:bg-gray-100 hover:text-black'
                    }`}
                >
                  {cat.name}
                  {activeRoot?.id === cat.id && <ChevronRight size={16} />}
                </button>
              ))
            )}
            
            {!loading && rootCategories.length === 0 && (
               <div className="p-6 text-xs text-gray-400 text-center">Категории не найдены</div>
            )}
          </div>

          {/* ПРАВАЯ КОЛОНКА */}
          <div className="flex-1 p-8 overflow-y-auto max-h-[600px] bg-white custom-scrollbar">
            {activeRoot ? (
              <div>
                <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
                   <h3 className="text-2xl font-black text-gray-900">{activeRoot.name}</h3>
                   <Link 
                     href={`/catalog?category=${encodeURIComponent(activeRoot.path)}`}
                     onClick={() => setIsOpen(false)}
                     className="text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-blue-600 border border-gray-200 px-3 py-1 rounded-full hover:border-blue-200 transition-colors"
                   >
                     Смотреть всё
                   </Link>
                </div>

                <div className="grid grid-cols-2 gap-x-8 gap-y-8">
                  {getLevel2(activeRoot.path).length > 0 ? (
                    getLevel2(activeRoot.path).map(sub => (
                      <div key={sub.id} className="break-inside-avoid">
                        <Link 
                          href={`/catalog?category=${encodeURIComponent(sub.path)}`}
                          onClick={() => setIsOpen(false)}
                          className="font-bold text-gray-900 hover:text-blue-600 block mb-2 text-lg"
                        >
                          {sub.name}
                        </Link>
                        
                        <div className="flex flex-col gap-1.5 pl-1">
                          {getLevel3(sub.path).map(child => (
                            <Link
                              key={child.id}
                              href={`/catalog?category=${encodeURIComponent(child.path)}`}
                              onClick={() => setIsOpen(false)}
                              className="text-sm text-gray-500 hover:text-blue-600 hover:translate-x-1 transition-transform"
                            >
                              {child.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 text-center py-10 text-gray-400">
                       <Package size={48} className="mx-auto mb-4 opacity-20"/>
                       <p>В этом разделе пока нет подкатегорий.</p>
                       <Link 
                         href={`/catalog?category=${encodeURIComponent(activeRoot.path)}`}
                         className="text-blue-600 font-bold hover:underline mt-2 inline-block"
                         onClick={() => setIsOpen(false)}
                       >
                         Перейти к товарам раздела
                       </Link>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-300">
                <ChevronRight size={48} className="opacity-10 mb-2"/>
                <p>Наведите на категорию слева</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}