import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

/**
 * Auth Callback Route Handler
 * Handles both email verification and OAuth callbacks.
 * Supabase sends a `code` query param that must be exchanged server-side for a session.
 */
export async function GET(request) {
	const requestUrl = new URL(request.url)
	const code = requestUrl.searchParams.get("code")
	const next = requestUrl.searchParams.get("next") || "/chat"

	if (code) {
		let response = NextResponse.redirect(new URL(next, requestUrl.origin))

		const supabase = createServerClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL,
			process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
			{
				cookies: {
					getAll() {
						return request.cookies.getAll()
					},
					setAll(cookiesToSet) {
						cookiesToSet.forEach(({ name, value, options }) => {
							response.cookies.set(name, value, options)
						})
					}
				}
			}
		)

		const { error } = await supabase.auth.exchangeCodeForSession(code)

		if (!error) {
			return response
		}

		// PKCE verifier not found — this happens when the user clicks the
		// email verification link in a different browser/tab than the one
		// they signed up in. The email IS verified, they just need to log in.
		if (error.code === "pkce_code_verifier_not_found") {
			const loginUrl = new URL("/auth/login", requestUrl.origin)
			loginUrl.searchParams.set("verified", "true")
			return NextResponse.redirect(loginUrl)
		}

		console.error("Auth callback error:", error)
	}

	// If no code or error, redirect to login
	return NextResponse.redirect(new URL("/auth/login", requestUrl.origin))
}
