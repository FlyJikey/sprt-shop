'use client';
import { getProxyImageUrl } from "@/lib/proxy-image";

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase-client';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface Banner {
  id: number;
  image_url: string;
  title: string;
  description: string;
  button_text: string;
  button_link: string;
  text_color: string;
  image_position?: string;
  image_scale?: number;
}

export default function HeroSlider({ initialBanners }: { initialBanners: Banner[] }) {
  const [banners, setBanners] = useState<Banner[]>(initialBanners);
  const [current, setCurrent] = useState(0);

  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentTranslate, setCurrentTranslate] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Обновляем баннеры, только если они изменились сверху (обычно не нужно для SSR, но для безопасности)
  useEffect(() => {
    if (initialBanners && initialBanners.length > 0) {
      setBanners(initialBanners);
    }
  }, [initialBanners]);

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => nextSlide(), 5000);
  };

  useEffect(() => {
    if (banners.length > 1) resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [current, banners.length]);

  const nextSlide = () => setCurrent(prev => (prev === banners.length - 1 ? 0 : prev + 1));
  const prevSlide = () => setCurrent(prev => (prev === 0 ? banners.length - 1 : prev - 1));

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    setStartX(clientX);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    setCurrentTranslate(clientX - startX);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (currentTranslate < -100) nextSlide();
    else if (currentTranslate > 100) prevSlide();
    setCurrentTranslate(0);
    resetTimer();
  };

  if (!banners || banners.length === 0) {
    return (
      <div className="relative h-[500px] w-full overflow-hidden rounded-[3rem] bg-gray-50 animate-pulse border-4 border-white shadow-2xl shadow-gray-200" />
    );
  }

  return (
    <div
      className="relative h-[500px] w-full overflow-hidden rounded-[3rem] cursor-grab active:cursor-grabbing select-none group shadow-2xl shadow-gray-200 border-4 border-white"
      onMouseDown={handleTouchStart} onMouseMove={handleTouchMove} onMouseUp={handleTouchEnd}
      onMouseLeave={() => isDragging && handleTouchEnd()}
      onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
    >
      <div
        className="flex h-full transition-transform duration-700 cubic-bezier(0.4, 0, 0.2, 1)"
        style={{ transform: `translateX(calc(-${current * 100}% + ${currentTranslate}px))`, transition: isDragging ? 'none' : 'transform 0.7s ease-out' }}
      >
        {banners.map((banner, index) => (
          <div key={banner.id} className="min-w-full h-full relative overflow-hidden bg-gray-900">
            {/* ФОН С ЗУМОМ И ПРАВИЛЬНЫМИ МИНИАТЮРАМИ */}
            <Image
              src={getProxyImageUrl(banner.image_url)}
              alt={banner.title || 'Slide'}
              fill
              priority={index === 0}
              sizes="100vw"
              className="object-cover pointer-events-none transition-transform duration-1000"
              style={{
                objectFit: (banner.image_scale || 100) < 100 ? 'contain' : 'cover',
                objectPosition: banner.image_position || '50% 50%',
                transform: `scale(${(banner.image_scale || 100) / 100})`,
                transformOrigin: banner.image_position || '50% 50%'
              }}
              draggable={false}
            />
            <div className="absolute inset-0 bg-black/30" />

            <div className="relative z-10 h-full flex flex-col justify-center px-12 md:px-24 max-w-4xl pointer-events-none">
              <h2
                style={{ color: banner.text_color || '#fff' }}
                className="text-5xl md:text-7xl font-black leading-[0.9] mb-6 tracking-tighter drop-shadow-2xl"
                dangerouslySetInnerHTML={{ __html: banner.title || '' }}
              />
              <p
                style={{ color: banner.text_color || '#ddd' }}
                className="text-lg md:text-xl font-bold mb-10 opacity-80 drop-shadow-md whitespace-pre-line max-w-xl"
              >
                {banner.description}
              </p>

              {banner.button_text && (
                <Link href={banner.button_link || '/catalog'} className="pointer-events-auto w-max">
                  <button className="bg-white text-black px-10 py-5 font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-600 hover:text-white transition-all flex items-center gap-3 rounded-2xl shadow-2xl">
                    {banner.button_text} <ArrowRight size={20} />
                  </button>
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Навигация */}
      <div className="absolute bottom-10 right-12 z-20 flex gap-4">
        {banners.map((_, idx) => (
          <button
            key={idx} onClick={() => { setCurrent(idx); resetTimer(); }}
            className={`h-1.5 rounded-full transition-all duration-500 ${current === idx ? 'w-12 bg-white' : 'w-4 bg-white/30 hover:bg-white/50'}`}
          />
        ))}
      </div>

      <button onClick={(e) => { e.stopPropagation(); prevSlide(); resetTimer(); }} className="absolute left-8 top-1/2 -translate-y-1/2 z-20 bg-white/10 hover:bg-white/30 p-5 rounded-full text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all hidden md:block">
        <ChevronLeft size={32} />
      </button>
      <button onClick={(e) => { e.stopPropagation(); nextSlide(); resetTimer(); }} className="absolute right-8 top-1/2 -translate-y-1/2 z-20 bg-white/10 hover:bg-white/30 p-5 rounded-full text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all hidden md:block">
        <ChevronRight size={32} />
      </button>
    </div>
  );
}
