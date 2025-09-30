// src/client/app/api/proactivity/action/route.js
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
		const { notification_id, user_action } = await request.json()
		if (!notification_id || !user_action) {
			return NextResponse.json(
				{ error: "Notification ID and user action are required" },
				{ status: 400 }
			)
		}

		const response = await fetch(`${appServerUrl}/api/proactivity/action`, {
			method: "POST",
			headers: { "Content-Type": "application/json", ...authHeader },
			body: JSON.stringify({ notification_id, user_action })
		})

		const data = await response.json()
		if (!response.ok) {
			throw new Error(
				data.detail || "Failed to process suggestion action"
			)
		}
		return NextResponse.json(data)
	} catch (error) {
		const err = error as Error
		console.error("API Error in /proactivity/action:", err)
		return NextResponse.json({ error: err.message }, { status: 500 })
	}
})
