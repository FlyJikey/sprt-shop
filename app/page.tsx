import Header from '@/components/Header';
import HomePageClient from '@/components/HomePageClient';
import { createClient } from '@supabase/supabase-js';

export const revalidate = 0;

const PRODUCTS_PER_PAGE = 8;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default async function HomePage() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Выполняем запросы параллельно для скорости
  const [
    { data: navLinks },
    { data: gridItems },
    { data: products },
    { data: banners }
  ] = await Promise.all([
    supabase.from('nav_links').select('*').order('sort_order'),
    supabase.from('grid_categories').select('*').order('sort_order'),
    supabase.from('products').select('*').order('id', { ascending: true }).range(0, PRODUCTS_PER_PAGE - 1),
    supabase.from('hero_banners').select('*').order('sort_order', { ascending: true })
  ]);

  return (
    <main className="min-h-screen bg-white font-sans pb-20">
      <Header />
      <HomePageClient
        initialNavLinks={navLinks || []}
        initialGridItems={gridItems || []}
        initialProducts={products || []}
        totalInitialProducts={products?.length || 0}
        initialBanners={banners || []}
      />
    </main>
  );
}