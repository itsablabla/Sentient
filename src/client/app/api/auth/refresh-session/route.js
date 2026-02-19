import { NextResponse } from "next/server"


// This route is only for Auth0 environments
// This route is a no-op for self-hosted mode but kept for compatibility
export async function GET(request) {
	return NextResponse.json(
		{
			status: "ok",
			message: "Self-host mode, no refresh needed."
		},
		{
			headers: { "Cache-Control": "no-store, max-age=0" }
		}
	)
}

