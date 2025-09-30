"use client"

import posthog from "posthog-js"
import { PostHogProvider as PHProvider, PostHogProviderProps } from "posthog-js/react"
import React, { useEffect, FC, ReactNode } from "react"

export const PostHogProvider: FC<{ children: ReactNode }> = ({ children }) => {
	useEffect(() => {
		if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
			posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
				api_host: "/ingest",
				ui_host:
					process.env.NEXT_PUBLIC_POSTHOG_HOST ||
					"https://us.posthog.com",
				capture_exceptions: true,
				autocapture: false // Disable autocapture to reduce event volume
			})
		}
	}, [])

	if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return <>{children}</>
	return <PHProvider client={posthog}>{children}</PHProvider> as React.ReactElement<PostHogProviderProps>;
}
