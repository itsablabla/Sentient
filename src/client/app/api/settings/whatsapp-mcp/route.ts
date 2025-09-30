import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@lib/api-utils"

const appServerUrl =
	process.env.NEXT_PUBLIC_ENVIRONMENT === "selfhost"
		? process.env.INTERNAL_APP_SERVER_URL
		: process.env.NEXT_PUBLIC_APP_SERVER_URL

// Handler for connecting/disconnecting the WhatsApp MCP number
export const POST = withAuth(async function POST(
	request: NextRequest,
	{ authHeader }: { authHeader: HeadersInit }
): Promise<NextResponse> {
	try {
		const body = await request.json() // { whatsapp_mcp_number: "..." }
		const response = await fetch(
			`${appServerUrl}/api/settings/whatsapp-mcp`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json", ...authHeader },
				body: JSON.stringify(body)
			}
		)

		const data = await response.json()
		if (!response.ok) {
			throw new Error(
				data.detail || "Failed to update WhatsApp MCP number"
			)
		}
		return NextResponse.json(data)
	} catch (error) {
		const err = error as Error
		console.error("API Error in /api/settings/whatsapp-mcp (POST):", err)
		return NextResponse.json({ error: err.message }, { status: 500 })
	}
})

// Handler for getting the current WhatsApp MCP number
export const GET = withAuth(async function GET(
	request: NextRequest,
	{ authHeader }: { authHeader: HeadersInit }
): Promise<NextResponse> {
	try {
		const response = await fetch(
			`${appServerUrl}/api/settings/whatsapp-mcp`,
			{
				method: "GET",
				headers: { "Content-Type": "application/json", ...authHeader }
			}
		)
		const data = await response.json()
		if (!response.ok) {
			throw new Error(
				data.detail || "Failed to fetch WhatsApp MCP settings"
			)
		}
		return NextResponse.json(data, {
			headers: { "Cache-Control": "no-store, max-age=0" }
		})
	} catch (error) {
		const err = error as Error
		console.error("API Error in /api/settings/whatsapp-mcp (GET):", err)
		return NextResponse.json({ error: err.message }, { status: 500 })
	}
})
