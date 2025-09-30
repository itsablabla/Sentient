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
	const { searchParams } = new URL(request.url)
	const query = searchParams.get("q")

	if (!query) {
		return NextResponse.json(
			{ error: "Query parameter 'q' is required" },
			{ status: 400 }
		)
	}

	const backendUrl = new URL(`${appServerUrl}/api/search/interactive`)
	backendUrl.searchParams.append("query", query)

	try {
		const response = await fetch(backendUrl.toString(), {
			method: "GET",
			headers: { "Content-Type": "application/json", ...authHeader }
		})

		const data = await response.json()
		if (!response.ok) {
			throw new Error(data.detail || "Failed to perform search")
		}
		return NextResponse.json(data, {
			headers: { "Cache-Control": "no-store, max-age=0" }
		})
	} catch (error) {
		const err = error as Error
		console.error("API Error in /api/search:", err)
		return NextResponse.json({ error: err.message }, { status: 500 })
	}
})
