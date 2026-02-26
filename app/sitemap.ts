import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sprt-shop.vercel.app';

    // 1. Статичные маршруты
    const staticRoutes: MetadataRoute.Sitemap = [
        { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
        { url: `${baseUrl}/catalog`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
        { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
        { url: `${baseUrl}/about/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
        { url: `${baseUrl}/about/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
        { url: `${baseUrl}/about/returns`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
        { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    ];

    // 2. Все категории
    const { data: categories } = await supabase.from('categories').select('path, updated_at');
    const categoryRoutes: MetadataRoute.Sitemap = (categories || []).map((cat) => ({
        url: `${baseUrl}/catalog?category=${cat.path}`,
        lastModified: cat.updated_at ? new Date(cat.updated_at) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
    }));

    // 3. Все товары
    const { data: products } = await supabase.from('products').select('slug, updated_at');
    const productRoutes: MetadataRoute.Sitemap = (products || []).map((product) => ({
        url: `${baseUrl}/product/${product.slug}`,
        lastModified: product.updated_at ? new Date(product.updated_at) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.6,
    }));

    return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
