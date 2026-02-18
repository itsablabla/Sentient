// src/client/app/api/auth/token/route.js
import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/**
 * API route to securely get a token for authenticating with backend services.
 * - In Supabase mode, gets the user's access token from their session.
 * - In selfhost mode, returns the static self-host token.
 */
export async function GET() {
	if (process.env.NEXT_PUBLIC_ENVIRONMENT === "selfhost") {
		const token = process.env.SELF_HOST_AUTH_TOKEN
		if (!token) {
			return NextResponse.json(
				{ message: "SELF_HOST_AUTH_TOKEN not configured" },
				{ status: 500 }
			)
		}
		return NextResponse.json(
			{ accessToken: token },
			{
				headers: { "Cache-Control": "no-store, max-age=0" }
			}
		)
	}

	try {
		const cookieStore = await cookies()
		const supabase = createServerClient(
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

		const {
			data: { session },
			error
		} = await supabase.auth.getSession()

		if (error || !session?.access_token) {
			return NextResponse.json(
				{ message: "Not authenticated or access token is missing" },
				{ status: 401 }
			)
		}

		return NextResponse.json(
			{ accessToken: session.access_token },
			{
				headers: { "Cache-Control": "no-store, max-age=0" }
			}
		)
	} catch (error) {
		console.error("Error in /api/auth/token:", error)
		return NextResponse.json(
			{ message: "Internal Server Error", error: error.message },
			{ status: 500 }
		)
	}
}
