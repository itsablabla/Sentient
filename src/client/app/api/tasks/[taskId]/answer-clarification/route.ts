import { NextRequest, NextResponse } from "next/server"
import { HandlerParams, withAuth } from "@lib/api-utils"

const appServerUrl =
	process.env.NEXT_PUBLIC_ENVIRONMENT === "selfhost"
		? process.env.INTERNAL_APP_SERVER_URL
		: process.env.NEXT_PUBLIC_APP_SERVER_URL

export const POST = withAuth(async function POST(
	request: NextRequest,
	params: HandlerParams
): Promise<NextResponse> {
	const taskId = params.taskId as string
	const { authHeader } = params
	try {
		const body = await request.json() // { requestId, answer }
		const response = await fetch(
			`${appServerUrl}/tasks/${taskId}/clarifications`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json", ...authHeader },
				body: JSON.stringify({
					request_id: body.requestId,
					answer: body.answer
				})
			}
		)

		const data = await response.json()
		if (!response.ok) {
			throw new Error(data.detail || "Failed to submit answer")
		}
		return NextResponse.json(data)
	} catch (error) {
		const err = error as Error
		console.error(
			"API Error in /tasks/[taskId]/answer-clarification:",
			err
		)
		return NextResponse.json({ error: err.message }, { status: 500 })
	}
})
