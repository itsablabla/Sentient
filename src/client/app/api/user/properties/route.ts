import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@lib/api-utils"

const appServerUrl =
	process.env.NEXT_PUBLIC_ENVIRONMENT === "selfhost"
		? process.env.INTERNAL_APP_SERVER_URL
		: process.env.NEXT_PUBLIC_APP_SERVER_URL

export const GET = withAuth(async function GET(
	request: NextRequest,
	{ authHeader }: { authHeader: HeadersInit }
): Promise<NextResponse> {
	try {
		const response = await fetch(`${appServerUrl}/api/user/properties`, {
			method: "GET",
			headers: { "Content-Type": "application/json", ...authHeader },
			cache: "no-store"
		})

		const data = await response.json()
		if (!response.ok) {
			throw new Error(
				data.detail || "Failed to fetch user properties from backend"
			)
		}

		return NextResponse.json(data, {
			headers: { "Cache-Control": "no-store, max-age=0" }
		})
	} catch (error) {
		const err = error as Error
		console.error("API Error in /user/properties:", err)
		return NextResponse.json(
			{ message: "Internal Server Error", error: err.message },
			{ status: 500 }
		)
	}
})
