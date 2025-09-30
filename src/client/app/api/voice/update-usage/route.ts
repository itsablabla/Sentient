import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@lib/api-utils"

const appServerUrl =
	process.env.NEXT_PUBLIC_ENVIRONMENT === "selfhost"
		? process.env.INTERNAL_APP_SERVER_URL
		: process.env.NEXT_PUBLIC_APP_SERVER_URL

export const POST = withAuth(async function POST(
	request: NextRequest,
	{ authHeader }: { authHeader: HeadersInit }
): Promise<NextResponse> {
	try {
		const { duration_seconds } = await request.json()
		if (typeof duration_seconds !== "number" || duration_seconds < 0) {
			return NextResponse.json(
				{ error: "Invalid duration" },
				{ status: 400 }
			)
		}
		const response = await fetch(`${appServerUrl}/voice/update-usage`, {
			method: "POST",
			headers: { "Content-Type": "application/json", ...authHeader },
			body: JSON.stringify({ duration_seconds })
		})

		const data = await response.json()
		if (!response.ok) {
			throw new Error(data.detail || "Failed to update voice usage")
		}
		return NextResponse.json(data)
	} catch (error) {
		const err = error as Error
		console.error("API Error in /voice/update-usage:", err)
		return NextResponse.json({ error: err.message }, { status: 500 })
	}
})

