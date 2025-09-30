import { NextRequest, NextResponse } from "next/server"
import { withAuth, HandlerParams } from "@lib/api-utils"

const appServerUrl =
	process.env.NEXT_PUBLIC_ENVIRONMENT === "selfhost"
		? process.env.INTERNAL_APP_SERVER_URL
		: process.env.NEXT_PUBLIC_APP_SERVER_URL

export const GET = withAuth(async function GET(
	request: NextRequest,
	{ authHeader }: HandlerParams
): Promise<NextResponse> {
	try {
		const response = await fetch(`${appServerUrl}/api/get-user-data`, {
			method: "POST", // This endpoint is a POST to carry the auth header
			headers: { "Content-Type": "application/json", ...authHeader }
		})

		if (!response.ok) {
			throw new Error("Failed to fetch user settings from backend.")
		}

		const data = await response.json()
		const googleAuthMode = data?.data?.googleAuth?.mode || "default"

		return NextResponse.json(
			{ mode: googleAuthMode },
			{
				headers: { "Cache-Control": "no-store, max-age=0" }
			}
		)
	} catch (error) {
		const err = error as Error
		console.error("API Error in /settings/google-auth (GET):", err)
		return NextResponse.json(
			{ error: "Internal Server Error", details: err.message },
			{ status: 500 }
		)
	}
})

export const POST = withAuth(async function POST(
	request: NextRequest,
	{ authHeader }: HandlerParams
): Promise<NextResponse> {
	try {
		const body = await request.json() // { mode: 'default' | 'custom', credentialsJson?: string }
		if (!["default", "custom"].includes(body.mode)) {
			return NextResponse.json(
				{ error: "Invalid mode specified." },
				{ status: 400 }
			)
		}
		if (body.mode === "custom" && !body.credentialsJson) {
			return NextResponse.json(
				{ error: "Credentials must be provided for custom mode." },
				{ status: 400 }
			)
		}

		const response = await fetch(
			`${appServerUrl}/api/settings/google-auth`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json", ...authHeader },
				body: JSON.stringify(body)
			}
		)

		const data = await response.json()
		if (!response.ok) {
			throw new Error(
				data.detail || "Failed to update Google auth settings."
			)
		}
		return NextResponse.json(data)
	} catch (error) {
		const err = error as Error
		console.error("API Error in /settings/google-auth (POST):", err)
		return NextResponse.json(
			{ error: "Internal Server Error", details: err.message },
			{ status: 500 }
		)
	}
})
