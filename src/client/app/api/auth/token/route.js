import { NextResponse } from "next/server"


/**
 * API route to securely get a token for authenticating with backend services.
 * - In Auth0 mode, it gets the user's access token from their session.
 * - In selfhost mode, it returns the static self-host token.
 */
export async function GET() {
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

