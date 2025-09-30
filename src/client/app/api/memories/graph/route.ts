import { NextRequest, NextResponse } from "next/server"
import { withAuth, HandlerParams } from "@lib/api-utils"

const appServerUrl =
	process.env.NEXT_PUBLIC_ENVIRONMENT === "selfhost"
		? process.env.INTERNAL_APP_SERVER_URL
		: process.env.NEXT_PUBLIC_APP_SERVER_URL

export const GET = withAuth(async function GET(
	request: NextRequest,
	{ authHeader }: HandlerParams
): Promise<NextResponse> {
	// This new backend endpoint is assumed to exist and return { nodes: [], edges: [] }.
	const backendUrl = new URL(`${appServerUrl}/memories/graph`)

	try {
		const response = await fetch(backendUrl.toString(), {
			method: "GET",
			headers: { "Content-Type": "application/json", ...authHeader }
		})

		const data = await response.json()
		if (!response.ok) {
			throw new Error(data.detail || "Failed to fetch memory graph data")
		}
		return NextResponse.json(data, {
			headers: { "Cache-Control": "no-store, max-age=0" }
		})
	} catch (error) {
		const err = error as Error
		console.error("API Error in /memories/graph:", err)
		return NextResponse.json({ error: err.message }, { status: 500 })
	}
})
