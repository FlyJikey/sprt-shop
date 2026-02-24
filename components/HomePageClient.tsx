'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import { useCart } from '@/app/store';
import { ShoppingCart, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import DynamicIcon from '@/components/DynamicIcon';
import HeroSlider from '@/components/HeroSlider';
import FavoriteButton from '@/components/FavoriteButton';

const PRODUCTS_PER_PAGE = 8;

interface HomePageClientProps {
    initialNavLinks: any[];
    initialGridItems: any[];
    initialProducts: any[];
    totalInitialProducts: number;
}

export default function HomePageClient({
    initialNavLinks,
    initialGridItems,
    initialProducts,
    totalInitialProducts
}: HomePageClientProps) {
    const [products, setProducts] = useState<any[]>(initialProducts);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(totalInitialProducts === PRODUCTS_PER_PAGE);
    const [loadingProducts, setLoadingProducts] = useState(false);

    const { addItem } = useCart();

    const loadProducts = async (pageIndex: number) => {
        setLoadingProducts(true);
        const from = pageIndex * PRODUCTS_PER_PAGE;
        const to = from + PRODUCTS_PER_PAGE - 1;

        const { data } = await supabase
            .from('products')
            .select('*')
            .order('id', { ascending: true })
            .range(from, to);

        if (data) {
            if (data.length < PRODUCTS_PER_PAGE) setHasMore(false);
            setProducts(prev => (pageIndex === 0 ? data : [...prev, ...data]));
        }
        setLoadingProducts(false);
    };

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        loadProducts(nextPage);
    };

    return (
        <>
            <div className="border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex items-center gap-8 py-4 overflow-x-auto no-scrollbar">
                        {initialNavLinks.length > 0 ? (
                            initialNavLinks.map((link) => (
                                <Link
                                    key={link.id}
                                    href={link.href}
                                    className="text-sm font-bold text-gray-600 hover:text-black uppercase tracking-wide whitespace-nowrap transition-colors"
                                >
                                    {link.label}
                                </Link>
                            ))
                        ) : (
                            ['Electronics', 'Home', 'Appliances', 'Music', 'Sports'].map((item, i) => (
                                <span key={i} className="text-sm font-bold text-gray-300 uppercase cursor-not-allowed">{item}</span>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 mt-8 space-y-16">

                <HeroSlider />

                <section>
                    {initialGridItems.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                            {initialGridItems.map((item) => (
                                <Link
                                    key={item.id}
                                    href={item.href}
                                    className="group flex flex-col items-center justify-center text-center p-8 bg-white border border-gray-100 rounded-xl hover:shadow-xl hover:border-transparent transition-all duration-300 h-48"
                                >
                                    <div className="w-12 h-12 mb-5 text-[#c5a678] group-hover:text-black transition-colors">
                                        <DynamicIcon
                                            name={item.icon_name}
                                            imageUrl={item.custom_image_url}
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                    <span className="font-bold text-sm text-gray-800 uppercase tracking-wide group-hover:text-blue-600 transition-colors">
                                        {item.label}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 border border-dashed border-gray-200 rounded-xl">
                            <p className="text-gray-400">Добавьте категории в админке</p>
                        </div>
                    )}
                </section>

                <section>
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Все товары</h2>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {products.map((p, index) => (
                            <div key={p.id} className="group flex flex-col bg-white border border-gray-100 hover:border-gray-200 hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden relative">

                                {/* Фото область (клик ведет на товар) */}
                                <div className="aspect-square bg-gray-50 relative flex items-center justify-center p-4 sm:p-6">

                                    {/* КНОПКА ИЗБРАННОГО */}
                                    <div className="absolute top-3 right-3 z-20">
                                        <FavoriteButton productId={p.id} className="p-2 shadow-sm" />
                                    </div>

                                    <Link href={`/product/${p.slug}`} className="absolute inset-0 z-0">
                                        {p.image_url ? (
                                            <Image
                                                src={p.image_url}
                                                alt={p.name}
                                                fill
                                                priority={index < 4}
                                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                                className="object-contain p-3 sm:p-4 group-hover:scale-105 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <ImageIcon className="text-gray-200" size={40} />
                                            </div>
                                        )}
                                    </Link>

                                    {/* Кнопка корзины (поверх ссылки, z-10) */}
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            addItem(p);
                                        }}
                                        className="absolute bottom-2 sm:bottom-4 right-2 sm:right-4 z-10 bg-black text-white w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:bg-blue-600 shadow-xl"
                                    >
                                        <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </button>
                                </div>

                                {/* Инфо область */}
                                <Link href={`/product/${p.slug}`} className="p-3 sm:p-5 flex flex-col flex-grow group/info">
                                    <div className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 sm:mb-2 group-hover/info:text-blue-500 transition-colors">
                                        {p.category}
                                    </div>
                                    <h3 className="font-bold text-xs sm:text-sm text-gray-900 leading-snug line-clamp-3 sm:line-clamp-2 mb-2 sm:mb-4 flex-grow group-hover/info:text-blue-600 transition-colors" title={p.name}>
                                        {p.name}
                                    </h3>
                                    <div className="text-base sm:text-lg font-black text-gray-900">
                                        {Math.round(p.price).toLocaleString('ru-RU')} ₽
                                    </div>
                                </Link>
                            </div>
                        ))}
                    </div>

                    {hasMore && (
                        <div className="mt-16 text-center">
                            <button
                                onClick={handleLoadMore}
                                disabled={loadingProducts}
                                className="px-12 py-4 border-2 border-gray-900 text-gray-900 font-black uppercase text-xs tracking-widest hover:bg-gray-900 hover:text-white transition-all disabled:opacity-50"
                            >
                                {loadingProducts ? 'Загрузка...' : 'Показать еще товары'}
                            </button>
                        </div>
                    )}
                </section>

            </div>
        </>
    );
}
