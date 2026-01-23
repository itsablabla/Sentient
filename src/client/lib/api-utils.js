import { NextResponse } from "next/server"


/**
 * A higher-order function to wrap API route handlers with authentication checks.
 * It verifies the user's session and creates the backend auth header.
 * @param {function} handler The API route handler function to wrap. It will receive `(request, { authHeader, userId, ...params })`.
 * @returns {function} The wrapped handler function.
 */
export function withAuth(handler) {
	return async function (request, params) {
		// In self-host mode, we use the environment variable for the token
		const token = process.env.SELF_HOST_AUTH_TOKEN;

		if (!token) {
			return NextResponse.json(
				{ error: "Server misconfiguration: Auth token not set" },
				{ status: 500 }
			);
		}

		const authHeader = `Bearer ${token}`;

		// For self-hosting, the user_id is static.
		return handler(request, {
			...params,
			authHeader,
			userId: "sentient-user",
		});
	};
}

