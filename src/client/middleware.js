import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function middleware(request) {
	const { pathname } = request.nextUrl

	// Redirect root to /chat
	if (pathname === "/") {
		const url = request.nextUrl.clone()
		url.pathname = "/chat"
		return NextResponse.redirect(url)
	}

	// In self-host mode, skip all auth checks
	if (process.env.NEXT_PUBLIC_ENVIRONMENT === "selfhost") {
		return NextResponse.next()
	}

	// Create a Supabase client for the middleware
	let response = NextResponse.next({
		request: {
			headers: request.headers
		}
	})

	const supabase = createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
		{
			cookies: {
				getAll() {
					return request.cookies.getAll()
				},
				setAll(cookiesToSet) {
					cookiesToSet.forEach(({ name, value, options }) =>
						request.cookies.set(name, value)
					)
					response = NextResponse.next({
						request: {
							headers: request.headers
						}
					})
					cookiesToSet.forEach(({ name, value, options }) =>
						response.cookies.set(name, value, options)
					)
				}
			}
		}
	)

	// Refresh the session (important for token refresh)
	const {
		data: { user }
	} = await supabase.auth.getUser()

	// Public paths that don't require authentication
	const publicPaths = ["/auth/login", "/auth/signup", "/auth/callback"]
	const isPublicPath = publicPaths.some((path) => pathname.startsWith(path))

	if (!user && !isPublicPath) {
		const url = request.nextUrl.clone()
		url.pathname = "/auth/login"
		return NextResponse.redirect(url)
	}

	return response
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except for:
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico, sitemap.xml, robots.txt (metadata files)
		 * - Public assets
		 */
		"/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|images|icons|sw.js|manifest.json).*)"
	]
}
