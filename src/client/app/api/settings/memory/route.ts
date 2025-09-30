import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@lib/api-utils"

const appServerUrl =
	process.env.NEXT_PUBLIC_ENVIRONMENT === "selfhost"
		? "http://localhost:8000"
		: process.env.NEXT_PUBLIC_APP_SERVER_URL

// GET handler to fetch the current Memory MCP URL
export const GET = withAuth(async function GET(
	request: NextRequest,
	{ authHeader }: { authHeader: HeadersInit }
): Promise<NextResponse> {
	try {
		const response = await fetch(`${appServerUrl}/api/settings/memory`, {
			// Ensure GET is used for fetching data
			method: "GET",
			headers: { "Content-Type": "application/json", ...authHeader }
		})

		const data = await response.json()
		if (!response.ok) {
			throw new Error(
				data.detail || data.error || "Failed to fetch Memory settings"
			)
		}
		return NextResponse.json(data, {
			headers: { "Cache-Control": "no-store, max-age=0" }
		})
	} catch (error) {
		const err = error as Error
		console.error("API Error in /settings/mcp (GET):", err)
		return NextResponse.json({ error: err.message }, { status: 500 })
	}
})

// POST handler to save the Memory MCP URL
export const POST = withAuth(async function POST(
	request: NextRequest,
	{ authHeader }: { authHeader: HeadersInit }
): Promise<NextResponse> {
	try {
		const body = await request.json() // { mcp_url: "..." }
		const backendResponse = await fetch(
			// Renamed to avoid conflict with API response
			`${appServerUrl}/api/settings/memory`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json", ...authHeader },
				body: JSON.stringify(body)
			}
		)

		const data = await backendResponse.json()
		if (!backendResponse.ok) {
			throw new Error(
				data.detail || data.error || "Failed to save Memory settings"
			)
		}
		return NextResponse.json(data) // Return the backend's response directly
	} catch (error) {
		const err = error as Error
		console.error("API Error in /settings/mcp (POST):", err)
		return NextResponse.json({ error: err.message }, { status: 500 })
	}
})
