import Header from '@/components/Header';
import HomePageClient from '@/components/HomePageClient';
import { createClient } from '@supabase/supabase-js';

const PRODUCTS_PER_PAGE = 8;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default async function HomePage() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data: navLinks } = await supabase.from('nav_links').select('*').order('sort_order');
  const { data: gridItems } = await supabase.from('grid_categories').select('*').order('sort_order');
  const { data: products } = await supabase.from('products').select('*').order('id', { ascending: true }).range(0, PRODUCTS_PER_PAGE - 1);

  return (
    <main className="min-h-screen bg-white font-sans pb-20">
      <Header />
      <HomePageClient
        initialNavLinks={navLinks || []}
        initialGridItems={gridItems || []}
        initialProducts={products || []}
        totalInitialProducts={products?.length || 0}
      />
    </main>
  );
}