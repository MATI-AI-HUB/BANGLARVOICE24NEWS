import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ALLOWED_ROLES = ['admin', 'chief_editor', 'desk_editor']

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const requestHeaders = new Headers(request.headers)
  requestHeaders.delete('x-deployment-id')
  requestHeaders.delete('x-ff-3d-visuals')
  const deploymentId = process.env.VERCEL_DEPLOYMENT_ID
  const visualsFlag = request.cookies.get('ff_3d_visuals')?.value
  if (deploymentId) requestHeaders.set('x-deployment-id', deploymentId)
  if (visualsFlag === '0' || visualsFlag === '1') {
    requestHeaders.set('x-ff-3d-visuals', visualsFlag)
  }
  const decorate = (response: NextResponse) => {
    if (deploymentId) response.headers.set('x-deployment-id', deploymentId)
    if (visualsFlag === '0' || visualsFlag === '1') {
      response.headers.set('x-ff-3d-visuals', visualsFlag)
    }
    return response
  }
  const isApiRoute = path.startsWith('/api/admin')
  const isAdminRoute = isApiRoute || path === '/admin' || path.startsWith('/admin/')

  if (!isAdminRoute) {
    return decorate(NextResponse.next({ request: { headers: requestHeaders } }))
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    if (isApiRoute) {
      return decorate(NextResponse.json(
        { error: 'auth_unconfigured' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      ))
    }
    return decorate(redirectToLogin(request, path, 'auth_unconfigured'))
  }

  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } })

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
          })
          requestHeaders.set('cookie', request.cookies.toString())
          supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } })
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    })

    let user = (await supabase.auth.getUser()).data.user

    if (!user) {
      const authHeader = request.headers.get('authorization') || ''
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7).trim()
        const { data } = await supabase.auth.getUser(token)
        user = data.user
      }
    }

    if (!user) {
      if (isApiRoute) {
        return decorate(NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401, headers: { 'Cache-Control': 'no-store' } },
        ))
      }
      return decorate(redirectToLogin(request, path))
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
      if (isApiRoute) {
        return decorate(NextResponse.json(
          { error: 'Forbidden' },
          { status: 403, headers: { 'Cache-Control': 'no-store' } },
        ))
      }
      return decorate(NextResponse.redirect(new URL('/', request.url)))
    }

    return decorate(supabaseResponse)
  } catch {
    if (isApiRoute) {
      return decorate(NextResponse.json(
        { error: 'auth_unavailable' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      ))
    }
    return decorate(redirectToLogin(request, path, 'auth_unavailable'))
  }
}

function redirectToLogin(request: NextRequest, path: string, reason?: string) {
  const loginUrl = request.nextUrl.clone()
  loginUrl.pathname = '/login'
  loginUrl.search = ''
  loginUrl.searchParams.set('redirectedFrom', path)
  if (reason) loginUrl.searchParams.set('error', reason)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
