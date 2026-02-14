'use client';

import { useState, useEffect, useRef } from 'react';
import { Check, ChevronsUpDown, Search, X } from 'lucide-react';
import { supabase } from '@/lib/supabase-client';

interface CategorySelectorProps {
  value: string;
  onChange: (value: string) => void;
}

interface Category {
  id: number;
  name: string;
  path: string;
}

export default function CategorySelector({ value, onChange }: CategorySelectorProps) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  
  const wrapperRef = useRef<HTMLDivElement>(null);

  // 1. Загрузка категорий при маунте
  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('categories')
        .select('id, name, path')
        .order('path', { ascending: true });
      
      if (data) {
        setCategories(data);
      }
      setLoading(false);
    };

    fetchCategories();
  }, []);

  // 2. Обработка клика снаружи для закрытия
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  // Фильтрация категорий
  const filteredCategories = categories.filter((c) =>
    c.path.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative" ref={wrapperRef}>
      <label className="block text-sm font-bold text-gray-700 mb-2">
        Категория
      </label>
      
      {/* Кнопка-триггер (выглядит как input) */}
      <div
        onClick={() => setOpen(!open)}
        className={`
          w-full px-4 py-3 bg-white border rounded-xl cursor-pointer flex items-center justify-between transition-all
          ${open ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200 hover:border-gray-300'}
        `}
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>
          {value || 'Выберите категорию...'}
        </span>
        <ChevronsUpDown className="w-4 h-4 text-gray-400" />
      </div>

      {/* Выпадающий список */}
      {open && (
        <div className="absolute z-50 mt-2 w-full bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden animate-fadeIn">
          {/* Поиск */}
          <div className="p-2 border-b border-gray-100 bg-gray-50">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск категории..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-colors"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          {/* Список */}
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="p-4 text-center text-sm text-gray-400">Загрузка...</div>
            ) : filteredCategories.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-400">
                Категория не найдена
              </div>
            ) : (
              filteredCategories.map((category) => (
                <div
                  key={category.id}
                  onClick={() => {
                    onChange(category.path); // Возвращаем полный путь (например "Электроника : Смартфоны")
                    setOpen(false);
                    setSearch('');
                  }}
                  className={`
                    px-4 py-3 text-sm cursor-pointer flex items-center justify-between hover:bg-blue-50 transition-colors
                    ${value === category.path ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-700'}
                  `}
                >
                  <span>{category.path}</span>
                  {value === category.path && <Check className="w-4 h-4 text-blue-600" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}