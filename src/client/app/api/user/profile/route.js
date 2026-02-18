// src/client/app/api/user/profile/route.js
import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function GET() {
	if (process.env.NEXT_PUBLIC_ENVIRONMENT === "selfhost") {
		return NextResponse.json(
			{
				sub: "self-hosted-user",
				given_name: "User",
				name: "Self-Hosted User",
				picture: "/images/half-logo-dark.svg"
			},
			{
				headers: { "Cache-Control": "no-store, max-age=0" }
			}
		)
	}

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
		data: { user },
		error
	} = await supabase.auth.getUser()

	if (error || !user) {
		return NextResponse.json(
			{ message: "Not authenticated" },
			{ status: 401 }
		)
	}

	const userProfile = {
		sub: user.id,
		given_name:
			user.user_metadata?.given_name ||
			user.user_metadata?.full_name ||
			user.email?.split("@")[0] ||
			"User",
		name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
		email: user.email,
		picture:
			user.user_metadata?.avatar_url ||
			`https://i.pravatar.cc/150?u=${user.id}`
	}

	return NextResponse.json(userProfile, {
		headers: { "Cache-Control": "no-store, max-age=0" }
	})
}
