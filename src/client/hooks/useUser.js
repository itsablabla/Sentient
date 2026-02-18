// src/client/hooks/useUser.js
// Drop-in replacement for Auth0's useUser() hook, backed by Supabase.
"use client"
import { useState, useEffect } from "react"
import { supabase, getSupabaseUser } from "@lib/supabase"

/**
 * A React hook that provides the current user, loading state, and error.
 * This replaces @auth0/nextjs-auth0's useUser() hook with Supabase auth.
 * Returns: { user, isLoading, error }
 */
export function useUser() {
	const [user, setUser] = useState(null)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState(null)

	useEffect(() => {
		let mounted = true

		const fetchUser = async () => {
			try {
				const userData = await getSupabaseUser()
				if (mounted) {
					setUser(userData)
					setIsLoading(false)
				}
			} catch (err) {
				// Ignore AbortError — caused by React Strict Mode or
				// component unmounting during Supabase's navigator.locks call
				if (err?.name === "AbortError") return
				if (mounted) {
					setError(err)
					setIsLoading(false)
				}
			}
		}

		fetchUser()

		// Listen for auth state changes (login, logout, token refresh)
		let subscription
		if (supabase) {
			try {
				const {
					data: { subscription: sub }
				} = supabase.auth.onAuthStateChange((_event, session) => {
					if (!mounted) return
					if (session?.user) {
						const u = session.user
						setUser({
							sub: u.id,
							name:
								u.user_metadata?.full_name ||
								u.user_metadata?.name ||
								u.email?.split("@")[0] ||
								"User",
							given_name:
								u.user_metadata?.given_name ||
								u.user_metadata?.full_name ||
								"User",
							email: u.email,
							picture:
								u.user_metadata?.avatar_url ||
								`https://i.pravatar.cc/150?u=${u.id}`
						})
					} else {
						setUser(null)
					}
					setIsLoading(false)
				})
				subscription = sub
			} catch (err) {
				// Ignore AbortError from navigator.locks
				if (err?.name !== "AbortError") {
					console.error("[useUser] onAuthStateChange error:", err)
				}
			}
		}

		return () => {
			mounted = false
			if (subscription) {
				try {
					subscription.unsubscribe()
				} catch (_) {
					// Ignore errors during cleanup
				}
			}
		}
	}, [])

	return { user, isLoading, error }
}
