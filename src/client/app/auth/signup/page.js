"use client"
import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@lib/supabase"
import { IconLoader, IconMail, IconLock, IconUser, IconBrandGoogle, IconBrandGithub } from "@tabler/icons-react"
import Link from "next/link"

export default function SignupPage() {
	const router = useRouter()
	const [fullName, setFullName] = useState("")
	const [email, setEmail] = useState("")
	const [password, setPassword] = useState("")
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState("")
	const [success, setSuccess] = useState(false)
	const [checkingSession, setCheckingSession] = useState(true)

	// Redirect if already logged in
	useEffect(() => {
		if (!supabase) {
			setCheckingSession(false)
			return
		}
		supabase.auth.getUser().then(({ data: { user } }) => {
			if (user) {
				router.push("/chat")
			} else {
				setCheckingSession(false)
			}
		})
	}, [router])

	const handleSignup = async (e) => {
		e.preventDefault()
		setLoading(true)
		setError("")

		if (password.length < 6) {
			setError("Password must be at least 6 characters")
			setLoading(false)
			return
		}

		const { error } = await supabase.auth.signUp({
			email,
			password,
			options: {
				data: {
					full_name: fullName,
					given_name: fullName.split(" ")[0]
				},
				emailRedirectTo: `${window.location.origin}/auth/callback`
			}
		})

		if (error) {
			setError(error.message)
			setLoading(false)
		} else {
			setSuccess(true)
			setLoading(false)
		}
	}

	const handleOAuthLogin = async (provider) => {
		setLoading(true)
		setError("")

		const { error } = await supabase.auth.signInWithOAuth({
			provider,
			options: {
				redirectTo: `${window.location.origin}/auth/callback`
			}
		})

		if (error) {
			setError(error.message)
			setLoading(false)
		}
	}

	if (checkingSession) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-brand-black">
				<IconLoader className="w-8 h-8 animate-spin text-brand-orange" />
			</div>
		)
	}

	return (
		<div className="flex items-center justify-center min-h-screen bg-brand-black relative overflow-hidden">
			<div className="absolute inset-0 network-grid-background opacity-40" />

			<div className="relative z-10 w-full max-w-md mx-4">
				{/* Logo / Brand */}
				<div className="text-center mb-8">
					<div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-orange/20 to-brand-orange/5 border border-brand-orange/20 mb-4">
						<img
							src="/images/half-logo-dark.svg"
							alt="Sentient"
							className="w-10 h-10"
						/>
					</div>
					<h1 className="text-3xl font-bold text-white tracking-tight">
						Create your account
					</h1>
					<p className="text-neutral-400 mt-2">
						Get started with Sentient
					</p>
				</div>

				{/* Card */}
				<div className="bg-neutral-900/60 backdrop-blur-xl border border-neutral-800 rounded-2xl p-8 shadow-2xl">
					{success ? (
						<div className="text-center py-4">
							<div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
								<IconMail size={28} className="text-green-400" />
							</div>
							<h2 className="text-xl font-semibold text-white mb-2">
								Check your email
							</h2>
							<p className="text-neutral-400 text-sm">
								We've sent a confirmation link to{" "}
								<span className="text-white font-medium">{email}</span>.
								Click it to activate your account.
							</p>
							<Link
								href="/auth/login"
								className="inline-block mt-6 text-brand-orange hover:text-brand-orange/80 font-medium transition-colors"
							>
								Back to login
							</Link>
						</div>
					) : (
						<>
							{/* OAuth Buttons */}
							<div className="space-y-3 mb-6">
								<button
									onClick={() => handleOAuthLogin("google")}
									disabled={loading}
									className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white font-medium transition-all duration-200 hover:scale-[1.02] disabled:opacity-50"
								>
									<IconBrandGoogle size={20} />
									Continue with Google
								</button>
								<button
									onClick={() => handleOAuthLogin("github")}
									disabled={loading}
									className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white font-medium transition-all duration-200 hover:scale-[1.02] disabled:opacity-50"
								>
									<IconBrandGithub size={20} />
									Continue with GitHub
								</button>
							</div>

							<div className="flex items-center gap-4 my-6">
								<div className="flex-1 h-px bg-neutral-700" />
								<span className="text-sm text-neutral-500">or</span>
								<div className="flex-1 h-px bg-neutral-700" />
							</div>

							<form onSubmit={handleSignup} className="space-y-4">
								<div>
									<label className="block text-sm font-medium text-neutral-300 mb-1.5">
										Full Name
									</label>
									<div className="relative">
										<IconUser
											size={18}
											className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500"
										/>
										<input
											type="text"
											value={fullName}
											onChange={(e) => setFullName(e.target.value)}
											placeholder="John Doe"
											required
											className="pl-10 !bg-neutral-800/50"
										/>
									</div>
								</div>
								<div>
									<label className="block text-sm font-medium text-neutral-300 mb-1.5">
										Email
									</label>
									<div className="relative">
										<IconMail
											size={18}
											className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500"
										/>
										<input
											type="email"
											value={email}
											onChange={(e) => setEmail(e.target.value)}
											placeholder="you@example.com"
											required
											className="pl-10 !bg-neutral-800/50"
										/>
									</div>
								</div>
								<div>
									<label className="block text-sm font-medium text-neutral-300 mb-1.5">
										Password
									</label>
									<div className="relative">
										<IconLock
											size={18}
											className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500"
										/>
										<input
											type="password"
											value={password}
											onChange={(e) => setPassword(e.target.value)}
											placeholder="Min. 6 characters"
											required
											minLength={6}
											className="pl-10 !bg-neutral-800/50"
										/>
									</div>
								</div>

								{error && (
									<div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
										{error}
									</div>
								)}

								<button
									type="submit"
									disabled={loading}
									className="w-full py-3 px-4 rounded-xl bg-brand-orange text-brand-black font-semibold text-base transition-all duration-200 hover:bg-brand-orange/90 hover:scale-[1.02] shadow-lg shadow-brand-orange/20 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
								>
									{loading ? (
										<>
											<IconLoader size={18} className="animate-spin" />
											Creating account...
										</>
									) : (
										"Create account"
									)}
								</button>
							</form>
						</>
					)}
				</div>

				{/* Footer */}
				{!success && (
					<p className="text-center text-sm text-neutral-500 mt-6">
						Already have an account?{" "}
						<Link
							href="/auth/login"
							className="text-brand-orange hover:text-brand-orange/80 font-medium transition-colors"
						>
							Sign in
						</Link>
					</p>
				)}
			</div>
		</div>
	)
}
