import { NextRequest, NextResponse } from "next/server"
import { auth0, getBackendAuthHeader } from "@lib/auth0"

const isSelfHost = process.env.NEXT_PUBLIC_ENVIRONMENT === "selfhost"

export interface HandlerParams {
	authHeader: HeadersInit;
	userId: string;
	[key: string]: any;
}

type AuthenticatedHandler = (
	request: NextRequest,
	params: HandlerParams
) => Promise<NextResponse | Response>

type NextRouteHandler = (
	req: NextRequest,
	context: { params: any }
) => Promise<Response | NextResponse>
/**
 * A higher-order function to wrap API route handlers with authentication checks.
 * It verifies the user's session and creates the backend auth header.
 * @param {function} handler The API route handler function to wrap. It will receive `(request, { authHeader, userId, ...params })`.
 * @returns {function} The wrapped handler function.
 */
export function withAuth(handler: AuthenticatedHandler): NextRouteHandler {
	return async (request, context) => {
		const finalParams = { ...(context.params || {}) }

		if (isSelfHost) {
			const authHeader = await getBackendAuthHeader()
			if (!authHeader) {
				return NextResponse.json(
					{ error: "Could not create self-host auth header" },
					{ status: 500 }
				)
			}
			// For self-hosting, the user_id is static.
			return handler(request, {
				...finalParams,
				authHeader,
				userId: "self-hosted-user"
			})
		}

		const session = await auth0.getSession()
		if (!session?.user?.sub) {
			return NextResponse.json(
				{ error: "Not authenticated" },
				{ status: 401 }
			)
		}

		const authHeader = await getBackendAuthHeader()
		if (!authHeader) {
			return NextResponse.json(
				{ error: "Could not create auth header" },
				{ status: 500 }
			)
		}

		// Pass auth details to the actual handler
		return handler(request, {
			...finalParams,
			authHeader,
			userId: session.user.sub
		})
	}
}
