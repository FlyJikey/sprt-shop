import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // 1. Создаем начальный ответ
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 2. Инициализируем Supabase клиент для сервера
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // Обновляем куки в запросе
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          // Обновляем куки в ответе
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // 3. Получаем пользователя
  const { data: { user } } = await supabase.auth.getUser()

  // --- ЛОГИКА ЗАЩИТЫ АДМИНКИ ---
  const isLoginPage = request.nextUrl.pathname.startsWith('/admin/login');
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');

  // Если мы идем в админку, И это НЕ страница логина
  if (isAdminRoute && !isLoginPage) {
    // Если пользователя нет — редирект на вход
    if (!user) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    // (Опционально) Дополнительная проверка email, если вы хотите пускать только себя
    // if (user.email !== 'tvoy-email@example.com') {
    //    return NextResponse.redirect(new URL('/', request.url))
    // }
  }

  // Если пользователь УЖЕ авторизован и пытается зайти на страницу логина — перекинем его сразу в админку
  if (isLoginPage && user) {
     return NextResponse.redirect(new URL('/admin', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Исключаем статические файлы, чтобы middleware не срабатывал на картинки и шрифты
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}