import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@lib/api-utils"

const APP_SERVER_URL =
	process.env.NEXT_PUBLIC_ENVIRONMENT === "selfhost"
		? process.env.INTERNAL_APP_SERVER_URL
		: process.env.NEXT_PUBLIC_APP_SERVER_URL

// GET: Fetch a single task by its ID
export const GET = withAuth(async function GET(
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
		const response = await fetch(
			`${APP_SERVER_URL}/tasks/tasks/${taskId}`,
			{
				headers: { "Content-Type": "application/json", ...authHeader }
			}
		)
		const data = await response.json()
		if (!response.ok)
			throw new Error(data.detail || "Failed to fetch task details")
		return NextResponse.json(data, {
			headers: { "Cache-Control": "no-store, max-age=0" }
		})
	} catch (error) {
		const err = error as Error
		return NextResponse.json({ error: err.message }, { status: 500 })
	}
})
