import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

const isSelfHost = process.env.NEXT_PUBLIC_ENVIRONMENT === "selfhost"

/**
 * Create a Supabase server client for use in API Route Handlers.
 * Uses cookies from the incoming request for session management.
 */
async function createSupabaseRouteClient() {
	const cookieStore = await cookies()
	return createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
		{
			cookies: {
				getAll() {
					return cookieStore.getAll()
				}
			}
		}
	)
}

/**
 * A higher-order function to wrap API route handlers with authentication checks.
 * It verifies the user's session and creates the backend auth header.
 * @param {function} handler The API route handler function to wrap. It will receive `(request, { authHeader, userId, ...params })`
 * @returns {function} The wrapped handler function.
 */
export function withAuth(handler) {
	if (isSelfHost) {
		return async function (request, params) {
			// In selfhost mode, use a static token from the internal auth endpoint
			const tokenRes = await fetch(
				`${process.env.NEXT_PUBLIC_APP_BASE_URL || "http://localhost:3000"}/api/auth/token`
			)
			if (!tokenRes.ok) {
				return NextResponse.json(
					{ error: "Could not create self-host auth header" },
					{ status: 500 }
				)
			}
			const { accessToken } = await tokenRes.json()
			const authHeader = accessToken
				? { Authorization: `Bearer ${accessToken}` }
				: null

			if (!authHeader) {
				return NextResponse.json(
					{ error: "Could not create self-host auth header" },
					{ status: 500 }
				)
			}
			return handler(request, {
				...params,
				authHeader,
				userId: "self-hosted-user"
			})
		}
	}

	return async function (request, params) {
		const supabase = await createSupabaseRouteClient()

		const {
			data: { user },
			error
		} = await supabase.auth.getUser()

		if (error || !user?.id) {
			return NextResponse.json(
				{ error: "Not authenticated" },
				{ status: 401 }
			)
		}

		// Get the session to extract the access token for backend calls
		const {
			data: { session }
		} = await supabase.auth.getSession()

		if (!session?.access_token) {
			return NextResponse.json(
				{ error: "Could not create auth header" },
				{ status: 500 }
			)
		}

		const authHeader = { Authorization: `Bearer ${session.access_token}` }

		return handler(request, {
			...params,
			authHeader,
			userId: user.id
		})
	}
}

