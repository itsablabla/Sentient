// src/client/app/api/chat/history/route.js
import { NextRequest, NextResponse } from "next/server"
import { withAuth, HandlerParams } from "@lib/api-utils"

const appServerUrl =
	process.env.NEXT_PUBLIC_ENVIRONMENT === "selfhost"
		? process.env.INTERNAL_APP_SERVER_URL
		: process.env.NEXT_PUBLIC_APP_SERVER_URL

export const POST = withAuth(async function POST(
	request: NextRequest,
	{ authHeader }: HandlerParams
): Promise<NextResponse> {
	const body = await request.json().catch(() => ({}))
	const { limit, before_timestamp } = body

	const backendUrl = new URL(`${appServerUrl}/chat/history`)
	if (limit) backendUrl.searchParams.append("limit", String(limit))
	if (before_timestamp)
		backendUrl.searchParams.append("before_timestamp", before_timestamp)

	try {
		const response = await fetch(backendUrl.toString(), {
			method: "GET",
			headers: { "Content-Type": "application/json", ...authHeader },
			// Prevent Next.js server-side caching of this fetch
			cache: "no-store"
		})

		const data = await response.json()
		if (!response.ok) {
			throw new Error(data.detail || "Failed to fetch chat history")
		}
		// Add cache-control headers to prevent browser caching of history
		return NextResponse.json(data, {
			headers: {
				"Cache-Control": "no-store, max-age=0"
			}
		})
	} catch (error) {
		const err = error as Error
		console.error("API Error in /chat/history:", err)
		return NextResponse.json({ error: err.message }, { status: 500 })
	}
})
