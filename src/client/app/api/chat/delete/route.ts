// src/client/app/api/chat/delete/route.js
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
	try {
		const body = await request.json() // { message_id?: string, clear_all?: boolean }

		const backendResponse = await fetch(`${appServerUrl}/chat/delete`, {
			method: "POST",
			headers: { "Content-Type": "application/json", ...authHeader },
			body: JSON.stringify(body)
		})

		const data = await backendResponse.json()

		if (!backendResponse.ok) {
			throw new Error(data.detail || "Failed to delete message(s)")
		}

		return NextResponse.json(data)
	} catch (error) {
		const err = error as Error
		console.error("API Error in /chat/delete:", err)
		return NextResponse.json(
			{ message: "Internal Server Error", error: err.message },
			{ status: 500 }
		)
	}
})
