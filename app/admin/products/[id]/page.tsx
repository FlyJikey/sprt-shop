import { supabase } from '@/lib/supabase'; // Серверный клиент
import { notFound } from 'next/navigation';
import ProductForm from '@/app/admin/products/[id]/product-form';// Клиентская форма (создадим ниже)

export const revalidate = 0;

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  
  // Если создаем новый товар (id = 'new')
  if (resolvedParams.id === 'new') {
    return <ProductForm initialData={null} />;
  }

  // Если редактируем существующий
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', resolvedParams.id)
    .single();

  if (!product) {
    return notFound(); // Показывает 404, если товара нет
  }

  return <ProductForm initialData={product} />;
}