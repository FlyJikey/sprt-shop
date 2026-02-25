require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  const { data: nav } = await supabase.from('nav_links').select('*').order('sort_order');
  console.log('Nav Links:');
  nav.forEach(n => console.log(`  id: ${n.id}, label: ${n.label}, sort_order: ${n.sort_order}`));
  
  const { data: grid } = await supabase.from('grid_categories').select('*').order('sort_order');
  console.log('\nGrid Categories:');
  grid.forEach(g => console.log(`  id: ${g.id}, label: ${g.label}, sort_order: ${g.sort_order}`));
}
check();
