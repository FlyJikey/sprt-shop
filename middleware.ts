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
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
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

  // 3. Инициализируем клиента ТОЛЬКО если маршрут требует защиты или мы обновляем сессию
  // Но для скорости мы можем обновлять сессию только на определенных маршрутах, либо просто получить пользователя

  const isLoginPage = request.nextUrl.pathname.startsWith('/admin/login')
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')
  const isProfileRoute = request.nextUrl.pathname.startsWith('/profile')
  const isCheckoutRoute = request.nextUrl.pathname.startsWith('/checkout')

  // Оптимизация: делаем запрос к auth API только если это критичные маршруты
  // Для публичного каталога это сэкономит время загрузки
  if (isAdminRoute || isProfileRoute || isCheckoutRoute) {
    const { data: { user } } = await supabase.auth.getUser()

    if (isAdminRoute && !isLoginPage) {
      if (!user) {
        const loginUrl = request.nextUrl.clone()
        loginUrl.pathname = '/admin/login'
        return NextResponse.redirect(loginUrl)
      }
      // Роль (admin/employee) будет проверена в app/admin/layout.tsx (Node.js runtime)
      // Edge runtime плохо справляется с прямыми запросами к БД (supabase.from)
    }

    if (isLoginPage && user) {
      // Если залогинен и идет на страницу входа — редирект в админку
      const adminUrl = request.nextUrl.clone()
      adminUrl.pathname = '/admin'
      return NextResponse.redirect(adminUrl)
    }

    if ((isProfileRoute || isCheckoutRoute) && !user) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      return NextResponse.redirect(loginUrl)
    }
  }
  // Для публичных страниц (главная, каталог) НЕ делаем запросов к auth — экономим ~200ms

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