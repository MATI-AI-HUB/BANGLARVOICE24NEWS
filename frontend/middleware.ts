import ratelimit from "@/lib/rate-limit";\n// frontend/middleware.ts
// Protects /admin routes based on Supabase Auth and User Role

import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Initialize Supabase Client
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser()

  // If accessing admin route without login -> redirect to login
  if (request.nextUrl.pathname.startsWith('/admin') && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectedFrom', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // If logged in but not admin -> check profile role
  if (request.nextUrl.pathname.startsWith('/admin') && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const allowedRoles = ['admin', 'chief_editor', 'desk_editor']
    
    if (!profile || !allowedRoles.includes(profile.role)) {
      // Not authorized -> redirect to home or forbidden page
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return supabaseResponse
}

// Match only requests to admin routes
export const config = {
  matcher: ['/admin/:path*'],
}
