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
		const response = await fetch(
			`${appServerUrl}/api/settings/proactivity`,
			{
				method: "GET",
				headers: { "Content-Type": "application/json", ...authHeader }
			}
		)
		const data = await response.json()
		if (!response.ok) {
			throw new Error(
				data.detail || "Failed to fetch proactivity settings"
			)
		}
		return NextResponse.json(data, {
			headers: { "Cache-Control": "no-store, max-age=0" }
		})
	} catch (error) {
		const err = error as Error
		console.error("API Error in /settings/proactivity (GET):", err)
		return NextResponse.json({ error: err.message }, { status: 500 })
	}
})

export const POST = withAuth(async function POST(
	request: NextRequest,
	{ authHeader }: { authHeader: HeadersInit }
): Promise<NextResponse> {
	try {
		const body = await request.json() // { enabled: boolean }
		const response = await fetch(
			`${appServerUrl}/api/settings/proactivity`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json", ...authHeader },
				body: JSON.stringify(body)
			}
		)
		const data = await response.json()
		if (!response.ok) {
			throw new Error(
				data.detail || "Failed to update proactivity settings"
			)
		}
		return NextResponse.json(data)
	} catch (error) {
		const err = error as Error
		console.error("API Error in /settings/proactivity (POST):", err)
		return NextResponse.json({ error: err.message }, { status: 500 })
	}
})
