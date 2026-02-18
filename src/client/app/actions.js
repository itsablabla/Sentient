"use server"

import { createClient } from "@supabase/supabase-js"
import webpush from "web-push"

// --- DB Connection (Supabase) ---
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

let cachedSupabase = null

function getSupabaseAdmin() {
	if (cachedSupabase) return cachedSupabase

	if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
		throw new Error(
			"SUPABASE_URL or SUPABASE_SERVICE_KEY is not defined in the environment variables."
		)
	}

	cachedSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
	return cachedSupabase
}

// --- Get current user from Supabase Auth ---
async function getCurrentUserId() {
	if (process.env.NEXT_PUBLIC_ENVIRONMENT === "selfhost") {
		return "self-hosted-user"
	}

	// In server actions, we use the service key client and verify via cookie/header
	// For simplicity, we'll use the createServerClient approach
	const { createServerClient } = await import("@supabase/ssr")
	const { cookies } = await import("next/headers")

	const cookieStore = await cookies()
	const supabase = createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
		{
			cookies: {
				getAll() {
					return cookieStore.getAll()
				}
			}
		}
	)

	const {
		data: { user },
		error
	} = await supabase.auth.getUser()
	if (error || !user) {
		throw new Error("Not authenticated")
	}
	return user.id
}

// --- WebPush Setup ---
if (
	process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
	process.env.VAPID_PRIVATE_KEY &&
	process.env.VAPID_ADMIN_EMAIL
) {
	webpush.setVapidDetails(
		process.env.VAPID_ADMIN_EMAIL,
		process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
		process.env.VAPID_PRIVATE_KEY
	)
} else {
	console.warn(
		"VAPID details not fully configured. Push notifications may not work."
	)
}

// --- Server Actions ---

export async function subscribeUser(subscription) {
	const userId = await getCurrentUserId()

	try {
		const supabase = getSupabaseAdmin()

		// Get existing profile
		const { data: profile } = await supabase
			.from("user_profiles")
			.select("user_data")
			.eq("user_id", userId)
			.single()

		const userData = profile?.user_data || {}
		const existingSubs = userData.pwa_subscriptions || []

		// Add to set (avoid duplicates by endpoint)
		const alreadyExists = existingSubs.some(
			(s) => s.endpoint === subscription.endpoint
		)
		if (!alreadyExists) {
			existingSubs.push(subscription)
		}
		userData.pwa_subscriptions = existingSubs

		await supabase
			.from("user_profiles")
			.upsert(
				{
					user_id: userId,
					user_data: userData,
					last_updated: new Date().toISOString()
				},
				{ onConflict: "user_id" }
			)

		return { success: true }
	} catch (error) {
		console.error("[Actions] Error saving subscription:", error)
		return {
			success: false,
			error: "Failed to save subscription to database."
		}
	}
}

export async function unsubscribeUser(endpoint) {
	const userId = await getCurrentUserId()

	try {
		const supabase = getSupabaseAdmin()

		const { data: profile } = await supabase
			.from("user_profiles")
			.select("user_data")
			.eq("user_id", userId)
			.single()

		if (!profile) return { success: true }

		const userData = profile.user_data || {}
		userData.pwa_subscriptions = (userData.pwa_subscriptions || []).filter(
			(s) => s.endpoint !== endpoint
		)

		await supabase
			.from("user_profiles")
			.update({
				user_data: userData,
				last_updated: new Date().toISOString()
			})
			.eq("user_id", userId)

		return { success: true }
	} catch (error) {
		console.error("[Actions] Error removing subscription:", error)
		return {
			success: false,
			error: "Failed to remove subscription from database."
		}
	}
}

export async function sendNotificationToCurrentUser(payload) {
	const userId = await getCurrentUserId()

	if (
		!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
		!process.env.VAPID_PRIVATE_KEY
	) {
		console.error(
			"[Actions] VAPID keys not configured. Cannot send push notification."
		)
		return {
			success: false,
			error: "VAPID keys not configured on the server."
		}
	}

	try {
		const supabase = getSupabaseAdmin()

		const { data: profile } = await supabase
			.from("user_profiles")
			.select("user_data")
			.eq("user_id", userId)
			.single()

		const subscriptions = profile?.user_data?.pwa_subscriptions

		if (
			!subscriptions ||
			!Array.isArray(subscriptions) ||
			subscriptions.length === 0
		) {
			return { success: false, error: "No subscription found for user." }
		}

		let successCount = 0
		const promises = subscriptions.map((subscription) => {
			return webpush
				.sendNotification(subscription, JSON.stringify(payload))
				.then(() => {
					successCount++
				})
				.catch(async (error) => {
					console.error(
						`[Actions] Error sending push notification to an endpoint for user ${userId}:`,
						error.statusCode
					)
					if (error.statusCode === 410 || error.statusCode === 404) {
						console.log(
							`[Actions] Subscription for user ${userId} is invalid. Removing from DB.`
						)
						await unsubscribeUser(subscription.endpoint)
					}
				})
		})

		await Promise.all(promises)

		if (successCount > 0) {
			return {
				success: true,
				message: `Sent notifications to ${successCount} of ${subscriptions.length} devices.`
			}
		} else {
			return {
				success: false,
				error: "Failed to send notifications to any device."
			}
		}
	} catch (error) {
		console.error(
			`[Actions] General error sending push notifications to user ${userId}:`,
			error
		)
		return { success: false, error: "A general error occurred." }
	}
}
