export function getProxyImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  // Replace the blocked Supabase domain with our Next.js rewrite proxy path
  return url.replace(
    'https://vzkrdedngnnneudksypj.supabase.co/storage/v1/object/public',
    '/supabase-storage'
  );
}
