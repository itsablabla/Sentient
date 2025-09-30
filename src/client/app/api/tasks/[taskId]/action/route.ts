import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@lib/api-utils"

const APP_SERVER_URL =
	process.env.NEXT_PUBLIC_ENVIRONMENT === "selfhost"
		? process.env.INTERNAL_APP_SERVER_URL
		: process.env.NEXT_PUBLIC_APP_SERVER_URL

export const POST = withAuth(async function POST(
	request: NextRequest,
	{ params, authHeader }: {
		params: { taskId: string };
		authHeader: HeadersInit;
	}
): Promise<NextResponse> {
	const { taskId } = params
	if (!taskId) {
		return NextResponse.json(
			{ error: "Task ID parameter is required" },
			{ status: 400 }
		)
	}

	try {
		const { action } = await request.json()
		if (!action) {
			return NextResponse.json(
				{ error: "Action is required" },
				{ status: 400 }
			)
		}

		const response = await fetch(
			`${APP_SERVER_URL}/tasks/${taskId}/action`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json", ...authHeader },
				body: JSON.stringify({ action })
			}
		)
		const data = await response.json()
		if (!response.ok)
			throw new Error(data.detail || "Failed to perform task action")
		return NextResponse.json(data)
	} catch (error) {
		const err = error as Error
		return NextResponse.json({ error: err.message }, { status: 500 })
	}
})
