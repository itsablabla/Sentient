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
		const body = await request.json()
		if (!body.notification_id && !body.delete_all) {
			return NextResponse.json(
				{
					error: "Either 'notification_id' or 'delete_all' must be provided"
				},
				{ status: 400 }
			)
		}

		const response = await fetch(`${appServerUrl}/notifications/delete`, {
			method: "POST",
			headers: { "Content-Type": "application/json", ...authHeader },
			body: JSON.stringify(body)
		})

		const data = await response.json()
		if (!response.ok) {
			throw new Error(data.detail || "Failed to delete notification(s)")
		}
		return NextResponse.json(data)
	} catch (error) {
		const err = error as Error
		console.error("API Error in /notifications/delete:", err)
		return NextResponse.json({ error: err.message }, { status: 500 })
	}
})
