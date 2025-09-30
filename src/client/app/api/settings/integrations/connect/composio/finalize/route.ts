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
		const body = await request.json() // { service_name, state }
		const response = await fetch(
			`${appServerUrl}/integrations/connect/composio/finalize`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json", ...authHeader },
				body: JSON.stringify(body)
			}
		)

		const data = await response.json()
		if (!response.ok) {
			throw new Error(
				data.detail || "Failed to finalize Composio connection"
			)
		}
		return NextResponse.json(data)
	} catch (error) {
		const err = error as Error
		console.error(
			"API Error in /settings/integrations/connect/composio/finalize:",
			err
		)
		return NextResponse.json({ error: err.message }, { status: 500 })
	}
})
