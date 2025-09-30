// src/client/app/api/user/profile/route.js
import { NextRequest, NextResponse } from "next/server"
import { auth0 } from "@lib/auth0"
import { UserProfile } from "@/types"

export async function GET(request: NextRequest): Promise<NextResponse> {
	if (process.env.NEXT_PUBLIC_ENVIRONMENT === "selfhost") {
		return NextResponse.json(
			{
				sub: "self-hosted-user",
				given_name: "User",
				name: "Self-Hosted User",
				picture: "/images/half-logo-dark.svg" // A default picture
			},
			{
				headers: { "Cache-Control": "no-store, max-age=0" }
			}
		)
	}

	const session = await auth0.getSession()

	if (!session?.user) {
		return NextResponse.json(
			{ message: "Not authenticated" },
			{ status: 401 }
		)
	}

	// The user profile comes directly from the session token.
	// We ensure `given_name` is provided for the UI.
	const userProfile: UserProfile = {
		sub: session.user.sub,
		name: session.user.name || "User",
		given_name: session.user.given_name || session.user.name || "User",
		picture:
			session.user.picture ||
			`https://i.pravatar.cc/150?u=${session.user.sub}`
	}

	return NextResponse.json(userProfile, {
		headers: { "Cache-Control": "no-store, max-age=0" }
	})
}
