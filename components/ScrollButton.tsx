'use client';

import { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

export default function ScrollButton() {
  const [direction, setDirection] = useState<'up' | 'down'>('down');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      // Высота всего документа
      const scrollHeight = document.documentElement.scrollHeight;
      // Высота экрана
      const clientHeight = document.documentElement.clientHeight;
      // Текущая прокрутка
      const scrollTop = window.scrollY;

      // Если прокрутили больше 300px вниз -> предлагаем вернуться ВВЕРХ
      if (scrollTop > 300) {
        setDirection('up');
        setIsVisible(true);
      } 
      // Если мы почти наверху, но страница длинная -> предлагаем ВНИЗ
      else if (scrollTop < 300 && scrollHeight > clientHeight * 2) {
        setDirection('down');
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollTo = () => {
    if (direction === 'up') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    }
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={scrollTo}
      className={`
        fixed bottom-8 right-8 z-50 p-3 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110
        ${direction === 'up' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-white text-gray-800 border border-gray-200 hover:bg-gray-50'}
      `}
      title={direction === 'up' ? "Наверх" : "Вниз"}
    >
      {direction === 'up' ? <ArrowUp size={24} /> : <ArrowDown size={24} />}
    </button>
  );
}