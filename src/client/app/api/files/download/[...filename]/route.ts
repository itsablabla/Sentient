import { NextRequest, NextResponse } from "next/server"
import { HandlerParams, withAuth } from "@lib/api-utils"

const appServerUrl =
	process.env.NEXT_PUBLIC_ENVIRONMENT === "selfhost"
		? process.env.INTERNAL_APP_SERVER_URL
		: process.env.NEXT_PUBLIC_APP_SERVER_URL

export const GET = withAuth(async function GET(
	request: NextRequest,
	params: HandlerParams
): Promise<Response> {
	// The [...filename] route parameter captures all segments into an array.
	const filenameParts = params.filename as string[]
	const { authHeader } = params
	// Safely check if filenameParts is a valid, non-empty array before using it.
	if (!Array.isArray(filenameParts) || filenameParts.length === 0) {
		return NextResponse.json(
			{ error: "Filename is required" },
			{ status: 400 }
		)
	}

	const filename = filenameParts.join("/")

	try {
		const backendResponse = await fetch(
			`${appServerUrl}/api/files/download/${encodeURIComponent(filename)}`,
			{
				method: "GET",
				headers: { ...authHeader },
				// IMPORTANT: duplex must be set to 'half' to stream response body
				duplex: "half"
			} as any
		)

		if (!backendResponse.ok) {
			const errorText = await backendResponse.text()
			let errorMessage
			try {
				const errorJson = JSON.parse(errorText)
				errorMessage = errorJson.detail || "Failed to download file"
			} catch (e) {
				errorMessage =
					errorText ||
					`Backend download failed with status ${backendResponse.status}`
			}
			throw new Error(errorMessage)
		}

		// Return the streaming response directly to the client
		return new Response(backendResponse.body, {
			status: 200,
			headers: {
				"Content-Type": "application/octet-stream",
				"Content-Disposition": `attachment; filename="${filename}"`,
				"Cache-Control": "no-store, max-age=0"
			}
		})
	} catch (error) {
		const err = error as Error
		console.error(`API Error in /files/download/${filename}:`, err)
		return NextResponse.json(
			{ message: "Internal Server Error", error: err.message },
			{ status: 500 }
		)
	}
})
