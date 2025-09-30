import { NextRequest, NextResponse } from "next/server"
import { HandlerParams, withAuth } from "@lib/api-utils"

const appServerUrl =
	process.env.NEXT_PUBLIC_ENVIRONMENT === "selfhost"
		? process.env.INTERNAL_APP_SERVER_URL
		: process.env.NEXT_PUBLIC_APP_SERVER_URL

export const PUT = withAuth(async function PUT(
	request: NextRequest,
	params: HandlerParams
): Promise<NextResponse> {
	const memoryId = params.memoryId as string
	const { authHeader } = params
	const backendUrl = new URL(`${appServerUrl}/memories/${memoryId}`)

	try {
		const body = await request.json()
		const response = await fetch(backendUrl.toString(), {
			method: "PUT",
			headers: { "Content-Type": "application/json", ...authHeader },
			body: JSON.stringify(body)
		})

		const data = await response.json()
		if (!response.ok) {
			throw new Error(data.detail || "Failed to update memory")
		}
		return NextResponse.json(data)
	} catch (error) {
		const err = error as Error
		console.error(`API Error in /memories/${memoryId} (PUT):`, err)
		return NextResponse.json({ error: err.message }, { status: 500 })
	}
})

export const DELETE = withAuth(async function DELETE(
	request: NextRequest,
	params: HandlerParams
): Promise<NextResponse> {
	const memoryId = params.memoryId as string
	const { authHeader } = params
	const backendUrl = new URL(`${appServerUrl}/memories/${memoryId}`)

	try {
		const response = await fetch(backendUrl.toString(), {
			method: "DELETE",
			headers: { ...authHeader }
		})

		const data = await response.json()
		if (!response.ok) {
			throw new Error(data.detail || "Failed to delete memory")
		}
		return NextResponse.json(data)
	} catch (error) {
		const err = error as Error
		console.error(`API Error in /memories/${memoryId} (DELETE):`, err)
		return NextResponse.json({ error: err.message }, { status: 500 })
	}
})
