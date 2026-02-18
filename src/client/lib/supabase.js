// src/client/lib/supabase.js
import { createBrowserClient } from "@supabase/ssr"

const isSelfHost = process.env.NEXT_PUBLIC_ENVIRONMENT === "selfhost"

// Create the Supabase browser client (or null in selfhost mode)
export const supabase = isSelfHost
	? null
	: createBrowserClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL,
			process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
		)

/**
 * Get the Authorization header for backend API calls.
 * In selfhost mode, uses a static token.
 * In Supabase mode, uses the session access token.
 */
export async function getBackendAuthHeader() {
	if (isSelfHost) {
		const tokenRes = await fetch("/api/auth/token")
		if (!tokenRes.ok) return null
		const { accessToken } = await tokenRes.json()
		return accessToken ? `Bearer ${accessToken}` : null
	}

	if (!supabase) return null

	const {
		data: { session }
	} = await supabase.auth.getSession()
	if (!session?.access_token) return null
	return `Bearer ${session.access_token}`
}

/**
 * Get user session data (replaces auth0.getSession / useUser).
 */
export async function getSupabaseUser() {
	if (isSelfHost) {
		return {
			sub: "self-hosted-user",
			name: "Self-Hosted User",
			email: "selfhost@example.com",
			picture: "/images/half-logo-dark.svg"
		}
	}

	if (!supabase) return null

	const {
		data: { user },
		error
	} = await supabase.auth.getUser()
	if (error || !user) return null

	return {
		sub: user.id,
		name:
			user.user_metadata?.full_name ||
			user.user_metadata?.name ||
			user.email?.split("@")[0] ||
			"User",
		given_name:
			user.user_metadata?.given_name ||
			user.user_metadata?.full_name ||
			"User",
		email: user.email,
		picture:
			user.user_metadata?.avatar_url ||
			`https://i.pravatar.cc/150?u=${user.id}`
	}
}
