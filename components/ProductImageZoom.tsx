'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { ZoomIn, X } from 'lucide-react';

interface ProductImageZoomProps {
    src: string;
    alt: string;
}

export default function ProductImageZoom({ src, alt }: ProductImageZoomProps) {
    const [isLensActive, setIsLensActive] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [lensPos, setLensPos] = useState({ x: 50, y: 50 });
    const [fullscreenZoom, setFullscreenZoom] = useState(1);
    const [fullscreenPan, setFullscreenPan] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const isPanningRef = useRef(false);
    const lastPanRef = useRef({ x: 0, y: 0 });

    const ZOOM_FACTOR = 2.5;

    // --- HOVER ZOOM (десктоп) ---
    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setLensPos({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
    }, []);

    const handleMouseEnter = useCallback(() => setIsLensActive(true), []);
    const handleMouseLeave = useCallback(() => setIsLensActive(false), []);

    // --- FULLSCREEN MODAL ---
    const openFullscreen = useCallback(() => {
        setIsFullscreen(true);
        setFullscreenZoom(1);
        setFullscreenPan({ x: 0, y: 0 });
        document.body.style.overflow = 'hidden';
    }, []);

    const closeFullscreen = useCallback(() => {
        setIsFullscreen(false);
        document.body.style.overflow = '';
    }, []);

    // Масштабирование колёсиком в полноэкранном режиме
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        setFullscreenZoom(prev => {
            const next = prev - e.deltaY * 0.002;
            return Math.max(1, Math.min(5, next));
        });
    }, []);

    // Перетаскивание (drag) в полноэкранном режиме
    const handlePanStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        isPanningRef.current = true;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        lastPanRef.current = { x: clientX, y: clientY };
    }, []);

    const handlePanMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (!isPanningRef.current) return;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const dx = clientX - lastPanRef.current.x;
        const dy = clientY - lastPanRef.current.y;
        lastPanRef.current = { x: clientX, y: clientY };
        setFullscreenPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    }, []);

    const handlePanEnd = useCallback(() => {
        isPanningRef.current = false;
    }, []);

    // Двойной тап/клик для зума мобильных
    const handleDoubleClick = useCallback(() => {
        setFullscreenZoom(prev => prev > 1 ? 1 : 2.5);
        setFullscreenPan({ x: 0, y: 0 });
    }, []);

    return (
        <>
            {/* Основной контейнер фото */}
            <div
                ref={containerRef}
                className="relative w-full h-full cursor-zoom-in overflow-hidden rounded-2xl"
                onMouseMove={handleMouseMove}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={openFullscreen}
            >
                {/* Основное фото */}
                <Image
                    src={src}
                    alt={alt}
                    fill
                    className="object-cover"
                    priority
                    sizes="(max-width: 768px) 100vw, 50vw"
                />

                {/* Линза увеличения при наведении (только десктоп) */}
                {isLensActive && (
                    <div
                        className="hidden md:block absolute inset-0 pointer-events-none"
                        style={{
                            backgroundImage: `url(${src})`,
                            backgroundSize: `${ZOOM_FACTOR * 100}%`,
                            backgroundPosition: `${lensPos.x}% ${lensPos.y}%`,
                            backgroundRepeat: 'no-repeat',
                            opacity: 1,
                        }}
                    />
                )}

                {/* Иконка лупы */}
                <div className="absolute bottom-3 right-3 bg-white/80 backdrop-blur-sm rounded-full p-2 shadow-sm pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity">
                    <ZoomIn size={18} className="text-gray-600" />
                </div>
            </div>

            {/* Полноэкранный просмотр */}
            {isFullscreen && (
                <div
                    className="fixed inset-0 z-50 bg-black/95 backdrop-blur-lg flex items-center justify-center"
                    onWheel={handleWheel}
                    onMouseDown={handlePanStart}
                    onMouseMove={handlePanMove}
                    onMouseUp={handlePanEnd}
                    onMouseLeave={handlePanEnd}
                    onTouchStart={handlePanStart}
                    onTouchMove={handlePanMove}
                    onTouchEnd={handlePanEnd}
                    onDoubleClick={handleDoubleClick}
                >
                    {/* Кнопка закрытия */}
                    <button
                        onClick={(e) => { e.stopPropagation(); closeFullscreen(); }}
                        className="absolute top-6 right-6 z-50 bg-white/10 hover:bg-white/20 text-white rounded-full p-3 transition-all backdrop-blur-sm"
                    >
                        <X size={24} />
                    </button>

                    {/* Подсказки */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 text-white/50 text-xs font-medium tracking-wider uppercase select-none">
                        <span className="hidden md:inline">Колёсико мыши для зума • Перетаскивание для перемещения</span>
                        <span className="md:hidden">Двойной тап для зума • Перетаскивайте для перемещения</span>
                    </div>

                    {/* Индикатор зума */}
                    {fullscreenZoom > 1 && (
                        <div className="absolute top-6 left-6 z-50 bg-white/10 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-sm font-bold">
                            {Math.round(fullscreenZoom * 100)}%
                        </div>
                    )}

                    {/* Фото */}
                    <div
                        className="relative select-none"
                        style={{
                            width: '85vmin',
                            height: '85vmin',
                            transform: `scale(${fullscreenZoom}) translate(${fullscreenPan.x / fullscreenZoom}px, ${fullscreenPan.y / fullscreenZoom}px)`,
                            transition: isPanningRef.current ? 'none' : 'transform 0.15s ease-out',
                            cursor: fullscreenZoom > 1 ? 'grab' : 'zoom-in',
                        }}
                    >
                        <Image
                            src={src}
                            alt={alt}
                            fill
                            className="object-contain rounded-lg pointer-events-none"
                            sizes="85vmin"
                            quality={95}
                            draggable={false}
                        />
                    </div>
                </div>
            )}
        </>
    );
}
