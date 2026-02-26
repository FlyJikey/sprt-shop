import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sprt-shop.vercel.app';

    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/admin/', '/checkout/', '/api/'],
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
