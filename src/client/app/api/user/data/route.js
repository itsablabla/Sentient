// src/client/app/api/user/data/route.js
import { NextResponse } from "next/server"
import { withAuth } from "@lib/api-utils"

const appServerUrl =
	process.env.NEXT_PUBLIC_ENVIRONMENT === "selfhost"
		? process.env.INTERNAL_APP_SERVER_URL
		: process.env.NEXT_PUBLIC_APP_SERVER_URL

export const POST = withAuth(async function POST(request, { authHeader }) {
	try {
		const response = await fetch(`${appServerUrl}/api/get-user-data`, {
			method: "POST",
			headers: { "Content-Type": "application/json", ...authHeader },
			cache: "no-store"
		})

		const data = await response.json()
		if (!response.ok) {
			throw new Error(
				data.message || data.detail || `Backend returned ${response.status}`
			)
		}

		return NextResponse.json(data, {
			headers: { "Cache-Control": "no-store, max-age=0" }
		})
	} catch (error) {
		console.error("[user/data] Error:", error.message)
		return NextResponse.json(
			{ message: error.message },
			{ status: 500 }
		)
	}
})

