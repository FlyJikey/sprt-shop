import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Suspense } from 'react';
import Header from '@/components/Header';
import AddToCart from '@/components/AddToCart';
import RelatedProductsWrapper from '@/components/RelatedProductsWrapper';
import FavoriteButton from '@/components/FavoriteButton';
import { ArrowLeft, Check, AlertCircle, Package } from 'lucide-react';

export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('ОШИБКА: Проверьте ключи Supabase в .env.local');
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const { data: product } = await supabaseAdmin.from('products').select('name').eq('slug', decodedSlug).single();
  return { title: product ? `${product.name} | Магазин` : 'Товар не найден' };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  try {
    const { data: product, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('slug', decodedSlug)
      .single();

    if (error || !product) return notFound();

    return (
      <main className="min-h-screen bg-gray-50 pb-20 font-sans">
        <Header />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          <div className="mb-6">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-black transition-colors">
              <ArrowLeft size={16} /> Назад к каталогу
            </Link>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-10 mb-16">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16">

              {/* Фото */}
              <div className="bg-gray-50 rounded-2xl aspect-square relative flex items-center justify-center border border-gray-100 p-8">
                {/* Кнопка избранного в углу фото */}
                <div className="absolute top-4 right-4 z-10">
                  <FavoriteButton productId={product.id} className="w-12 h-12 shadow-sm bg-white" />
                </div>

                {product.image_url ? (
                  <div className="relative w-full h-full">
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      fill
                      className="object-contain"
                      priority
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-gray-300 gap-2">
                    <Package size={48} />
                    <span className="text-sm">Нет фото</span>
                  </div>
                )}
              </div>

              {/* Инфо */}
              <div className="flex flex-col">
                <div className="mb-4">
                  <span className="text-xs font-bold text-red-600 uppercase tracking-widest bg-red-50 px-3 py-1.5 rounded-lg">
                    {product.category || 'Без категории'}
                  </span>
                </div>

                <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-4 leading-tight">
                  {product.name}
                </h1>

                <div className="flex items-center gap-4 mb-8">
                  {product.stock > 0 ? (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm font-bold">
                      <Check size={16} /> В наличии: {product.stock} шт.
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm font-bold">
                      <AlertCircle size={16} /> Нет в наличии
                    </div>
                  )}
                  <div className="text-xs text-gray-400 font-mono">Арт: {product.id}</div>
                </div>

                <div className="flex items-baseline gap-2 mb-8">
                  <span className="text-4xl font-black text-gray-900">{product.price}</span>
                  <span className="text-2xl font-bold text-gray-400">₽</span>
                  <span className="text-xl font-bold text-gray-400">/ {product.unit || 'шт'}</span>
                </div>

                <div className="w-full max-w-sm mb-10 flex gap-4">
                  <div className="flex-grow">
                    <AddToCart product={product} />
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-8 mt-auto">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Описание</h3>
                  <div className="text-gray-600 leading-relaxed text-sm whitespace-pre-wrap">
                    {product.description || 'Описание отсутствует.'}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <Suspense fallback={
            <div className="mt-20 py-10 flex justify-center text-gray-300 font-bold tracking-widest uppercase">
              Анализируем похожие товары...
            </div>
          }>
            <RelatedProductsWrapper productId={product.id} embedding={product.embedding} />
          </Suspense>

        </div>
      </main>
    );

  } catch (error: any) {
    return <div className="p-20 text-center text-red-500">Ошибка: {error.message}</div>;
  }
}