import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ИСПРАВЛЕНИЕ: Используем createBrowserClient для работы с куками (нужно для Next.js App Router)
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);