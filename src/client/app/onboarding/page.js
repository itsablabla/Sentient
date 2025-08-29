"use client"
import React, { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@utils/cn"
import toast from "react-hot-toast"
import { usePostHog } from "posthog-js/react"
import { useRouter } from "next/navigation"
import {
	IconSparkles,
	IconHeart,
	IconBrandWhatsapp,
	IconLoader,
	IconCheck,
	IconX,
	IconBrain
} from "@tabler/icons-react"
import Typewriter from "typewriter-effect"
import InteractiveNetworkBackground from "@components/ui/InteractiveNetworkBackground"
import ProgressBar from "@components/onboarding/ProgressBar"
import SparkleEffect from "@components/ui/SparkleEffect"
import SiriSpheres from "@components/voice-visualization/SiriSpheres"

// --- Helper Components ---

const FormattedPaQuestion = () => (
	<div className="text-neutral-200 space-y-4 mt-4 pl-4">
		<p>
			Are you someone who finds themselves spending too much time on
			administrative work? For example:
		</p>
		<ul className="list-disc list-inside pl-4 space-y-2 text-neutral-300">
			<li>Juggling multiple priorities</li>
			<li>Managing a small team or leading projects</li>
			<li>Scheduling meetings and organizing calendars</li>
			<li>Responding to routine emails</li>
		</ul>
		<p className="font-semibold pt-2">
			Do you ever feel the need for a personal assistant (human or AI) to
			handle these repetitive tasks?
		</p>
	</div>
)

const IntroStage = ({ onComplete }) => {
	const [audioLevel, setAudioLevel] = useState(0.1)

	useEffect(() => {
		const interval = setInterval(() => {
			// A gentle sine wave for pulsing effect
			setAudioLevel(Math.sin(Date.now() / 500) * 0.1 + 0.15)
		}, 50)
		return () => clearInterval(interval)
	}, [])

	return (
		<motion.div
			key="intro-stage"
			className="relative w-full h-screen flex flex-col items-center justify-center text-center overflow-hidden"
		>
			<InteractiveNetworkBackground />

			<motion.div
				layoutId="onboarding-sphere"
				className="w-[250px] h-[250px] md:w-[300px] md:h-[300px] flex items-center justify-center"
			>
				<SiriSpheres status="connected" audioLevel={audioLevel} />
			</motion.div>

			<div className="w-full flex flex-col items-center justify-start pt-8 px-4 h-48">
				<div className="h-24">
					<Typewriter
						onInit={(typewriter) => {
							typewriter
								.pauseFor(1000)
								.typeString(
									"Hi there. I'm <strong>Sentient</strong>."
								)
								.pauseFor(1000)
								.typeString(
									"<br/>I get work done for you across your apps,"
								)
								.pauseFor(500)
								.typeString(" while learning about you.")
								.pauseFor(2000)
								.callFunction(() => {
									onComplete()
								})
								.start()
						}}
						options={{
							delay: 50,
							wrapperClassName:
								"text-3xl md:text-4xl font-medium text-neutral-200",
							cursorClassName:
								"text-3xl md:text-4xl font-medium text-brand-orange"
						}}
					/>
				</div>
			</div>
		</motion.div>
	)
}

// --- Onboarding Data ---

const questions = [
	{
		id: "user-name",
		question: "First, what should I call you?",
		type: "text-input",
		required: true,
		placeholder: "e.g., Alex"
	},
	{
		id: "timezone",
		question: "What's your timezone?",
		type: "select",
		required: true,
		options: [
			{ value: "", label: "Select your timezone..." },
			{ value: "UTC", label: "(GMT+00:00) Coordinated Universal Time" },
			{
				value: "America/New_York",
				label: "(GMT-04:00) Eastern Time (US & Canada)"
			},
			{
				value: "America/Chicago",
				label: "(GMT-05:00) Central Time (US & Canada)"
			},
			{
				value: "America/Denver",
				label: "(GMT-06:00) Mountain Time (US & Canada)"
			},
			{
				value: "America/Los_Angeles",
				label: "(GMT-07:00) Pacific Time (US & Canada)"
			},
			{ value: "America/Anchorage", label: "(GMT-08:00) Alaska" },
			{ value: "America/Phoenix", label: "(GMT-07:00) Arizona" },
			{ value: "Pacific/Honolulu", label: "(GMT-10:00) Hawaii" },
			{ value: "America/Sao_Paulo", label: "(GMT-03:00) Brasilia" },
			{
				value: "America/Buenos_Aires",
				label: "(GMT-03:00) Buenos Aires"
			},
			{
				value: "Europe/London",
				label: "(GMT+01:00) London, Dublin, Lisbon"
			},
			{
				value: "Europe/Berlin",
				label: "(GMT+02:00) Amsterdam, Berlin, Paris, Rome"
			},
			{
				value: "Europe/Helsinki",
				label: "(GMT+03:00) Helsinki, Kyiv, Riga, Sofia"
			},
			{
				value: "Europe/Moscow",
				label: "(GMT+03:00) Moscow, St. Petersburg"
			},
			{ value: "Africa/Cairo", label: "(GMT+02:00) Cairo" },
			{ value: "Africa/Johannesburg", label: "(GMT+02:00) Johannesburg" },
			{ value: "Asia/Dubai", label: "(GMT+04:00) Abu Dhabi, Muscat" },
			{ value: "Asia/Kolkata", label: "(GMT+05:30) India Standard Time" },
			{
				value: "Asia/Shanghai",
				label: "(GMT+08:00) Beijing, Hong Kong, Shanghai"
			},
			{ value: "Asia/Singapore", label: "(GMT+08:00) Singapore" },
			{ value: "Asia/Tokyo", label: "(GMT+09:00) Tokyo, Seoul" },
			{
				value: "Australia/Sydney",
				label: "(GMT+10:00) Sydney, Melbourne"
			},
			{ value: "Australia/Brisbane", label: "(GMT+10:00) Brisbane" },
			{ value: "Australia/Adelaide", label: "(GMT+09:30) Adelaide" },
			{ value: "Australia/Perth", label: "(GMT+08:00) Perth" },
			{
				value: "Pacific/Auckland",
				label: "(GMT+12:00) Auckland, Wellington"
			}
		]
	},
	{
		id: "location",
		question: "Where are you located?",
		description:
			"This helps with local info like weather. You can type a city or detect it automatically.",
		type: "location",
		required: true
	},
	{
		id: "professional-context",
		question: "What is your professional background?",
		type: "textarea",
		required: true,
		placeholder: "e.g., I'm a software developer at a startup..."
	},
	{
		id: "personal-context",
		question: "What about your personal life and interests?",
		type: "textarea",
		required: true,
		placeholder: "e.g., I enjoy hiking, learning guitar, and soccer.",
		icon: <IconHeart />
	},
	{
		id: "needs-pa",
		question:
			"Do you often juggle multiple priorities, manage a small team, lead projects, and handle countless day-to-day tasks on your own? Many professionals spend too much time scheduling meetings, organizing their calendar, responding to emails, and doing other administrative work that eats into their day. Do you ever wish you had someone to take these repetitive tasks off your plate?\n\nDo you ever feel the need for a personal assistant?",
		type: "yes-no",
		required: true
	},
	{
		id: "whatsapp_notifications_number",
		question: "Please enter your WhatsApp number with the country code.",
		type: "text-input",
		required: true,
		placeholder: "+14155552671",
		icon: <IconBrandWhatsapp />
	}
]

const sentientComments = [
	"To get started, I just need to ask a few questions to personalize your experience.",
	"Great to meet you, {user-name}! To make sure I'm always on your time...",
	"Perfect. Now, to help with local info like weather and places...",
	"This helps me understand your professional goals and context.",
	"And when you're not working? Tell me about your hobbies.",
	"Got it. One more thing before we get to the last step...",
	"Finally, I will send you important notifications, task updates, and reminders on WhatsApp. We're in the process of getting an official number, so for now, messages will come from our co-founder Sarthak (+91827507823), who may also occasionally reach out for feedback.",
	"Awesome! That's all I need. Let's get you set up."
]

// --- Main Component ---

const OnboardingPage = () => {
	const [stage, setStage] = useState("intro") // 'intro', 'questions', 'submitting', 'complete'
	const [answers, setAnswers] = useState({})
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
	const [isLoading, setIsLoading] = useState(true)
	const [score, setScore] = useState(0)
	const [maxQuestionIndexReached, setMaxQuestionIndexReached] = useState(0)
	const [sparkleTrigger, setSparkleTrigger] = useState(0)
	const posthog = usePostHog()
	const router = useRouter()
	const statusChecked = useRef(false)
	const [whatsappStatus, setWhatsappStatus] = useState("idle") // idle, checking, valid, invalid
	const [whatsappError, setWhatsappError] = useState("")
	const debounceTimeoutRef = useRef(null)
	const [modelReacting, setModelReacting] = useState(false)
	const [audioLevel, setAudioLevel] = useState(0.1)

	const [locationState, setLocationState] = useState({
		loading: false,
		data: null,
		error: null
	})

	const verifyWhatsappNumber = async (number) => {
		if (!/^\+[1-9]\d{1,14}$/.test(number.trim())) {
			setWhatsappStatus("invalid")
			setWhatsappError(
				"Please use E.164 format with country code (e.g., +14155552671)."
			)
			return
		}
		setWhatsappStatus("checking")
		setWhatsappError("")
		try {
			const response = await fetch(
				"/api/settings/whatsapp-notifications/verify",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ phone_number: number })
				}
			)
			const result = await response.json()
			if (!response.ok) {
				throw new Error(result.detail || "Verification request failed.")
			}
			if (result.numberExists) {
				setWhatsappStatus("valid")
				setWhatsappError("")
			} else {
				setWhatsappStatus("invalid")
				setWhatsappError(
					"This number does not appear to be on WhatsApp."
				)
			}
		} catch (error) {
			setWhatsappStatus("invalid")
			setWhatsappError(error.message)
		}
	}

	const handleAnswer = (questionId, answer) => {
		setAnswers((prev) => ({ ...prev, [questionId]: answer }))
		if (questionId === "whatsapp_notifications_number") {
			setWhatsappStatus("idle")
			if (debounceTimeoutRef.current) {
				clearTimeout(debounceTimeoutRef.current)
			}
			if (answer.trim()) {
				debounceTimeoutRef.current = setTimeout(() => {
					verifyWhatsappNumber(answer)
				}, 800)
			} else {
				setWhatsappError("")
			}
		}
	}

	const handleMultiChoice = (questionId, option) => {
		const currentAnswers = answers[questionId] || []
		const limit = questions.find((q) => q.id === questionId)?.limit || 1
		let newAnswers
		if (currentAnswers.includes(option)) {
			newAnswers = currentAnswers.filter((item) => item !== option)
		} else {
			if (currentAnswers.length < limit) {
				newAnswers = [...currentAnswers, option]
			} else {
				toast.error(`You can select up to ${limit} options.`)
				newAnswers = currentAnswers
			}
		}
		setAnswers((prev) => ({ ...prev, [questionId]: newAnswers }))
	}

	const handleGetLocation = () => {
		if (navigator.geolocation) {
			setLocationState({ loading: true, data: null, error: null })
			navigator.geolocation.getCurrentPosition(
				async (position) => {
					const { latitude, longitude } = position.coords
					try {
						const response = await fetch(
							`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
						)
						if (!response.ok) {
							throw new Error("Failed to fetch location details.")
						}
						const data = await response.json()
						const address = data.address
						// Construct a readable location string
						const locationString = [
							address.city || address.town || address.village,
							address.state,
							address.country
						]
							.filter(Boolean) // Remove any null/undefined parts
							.join(", ")

						if (!locationString) {
							throw new Error(
								"Could not determine location name from coordinates."
							)
						}

						// Update state with the text location
						setLocationState({
							loading: false,
							data: locationString, // Store the string
							error: null
						})
						handleAnswer("location", locationString) // Save the string
					} catch (error) {
						setLocationState({
							loading: false,
							data: null,
							error: error.message
						})
						toast.error(
							`Could not convert coordinates to location: ${error.message}`
						)
					}
				},
				(error) => {
					let userMessage =
						"An unknown error occurred while detecting your location."
					switch (error.code) {
						case error.PERMISSION_DENIED:
							userMessage =
								"Location permission denied. Please enable location access for this site in your browser settings and try again."
							break
						case error.POSITION_UNAVAILABLE:
							userMessage =
								"Location information is unavailable. This can happen if location services are turned off in your operating system (e.g., Windows or macOS). Please check your system settings and network connection."
							break
						case error.TIMEOUT:
							userMessage =
								"The request to get your location timed out. Please try again."
							break
					}
					setLocationState({
						loading: false,
						data: null,
						error: userMessage
					})
					toast.error(userMessage)
				}
			)
		}
	}

	const isCurrentQuestionAnswered = useCallback(() => {
		if (stage !== "questions" || currentQuestionIndex >= questions.length)
			return false
		const currentQuestion = questions[currentQuestionIndex]
		if (!currentQuestion.required) return true
		const answer = answers[currentQuestion.id]
		if (answer === undefined || answer === null || answer === "")
			return false
		if (Array.isArray(answer) && answer.length === 0) return false
		// NEW check for whatsapp
		if (
			currentQuestion.id === "whatsapp_notifications_number" &&
			whatsappStatus !== "valid"
		) {
			return false
		}
		return true
	}, [answers, currentQuestionIndex, stage, questions.length, whatsappStatus])

	const handleSubmit = async () => {
		setStage("submitting")
		const mainOnboardingData = { ...answers }

		// Save WhatsApp number if provided
		const whatsappNumber = mainOnboardingData.whatsapp_notifications_number
		if (whatsappNumber && whatsappNumber.trim() !== "") {
			try {
				const whatsappResponse = await fetch(
					"/api/settings/whatsapp-notifications",
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							whatsapp_notifications_number: whatsappNumber
						})
					}
				)
				if (!whatsappResponse.ok) {
					// Don't block onboarding for this, just show a toast.
					toast.error(
						"Could not save WhatsApp number, but onboarding will continue."
					)
					console.error(
						"Failed to save WhatsApp number during onboarding."
					)
				}
			} catch (error) {
				toast.error("An error occurred while saving WhatsApp number.")
				console.error(
					"Error saving WhatsApp number during onboarding:",
					error
				)
			}
		}

		try {
			const response = await fetch("/api/onboarding", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ data: mainOnboardingData })
			})
			if (!response.ok) {
				const result = await response.json()
				throw new Error(
					result.message || "Failed to save onboarding data"
				)
			}
			// Identify the user in PostHog as soon as we have their name
			posthog?.identify(
				(await (await fetch("/api/user/profile")).json()).sub, // Fetch user ID from session
				{ name: mainOnboardingData["user-name"] }
			)
			posthog?.capture("user_signed_up", {
				signup_method: "auth0", // or derive from user profile if available
				referral_source: "direct" // Placeholder, can be populated from URL params
			})
			posthog?.capture("onboarding_completed")
			window.location.href = "/chat?show_demo=true"
		} catch (error) {
			toast.error(`Error: ${error.message}`)
			setStage("questions") // Go back to questions on error
		}
	}

	const handleNext = useCallback(() => {
		if (!isCurrentQuestionAnswered()) return

		setModelReacting(true)
		setTimeout(() => setModelReacting(false), 600)
		setSparkleTrigger((c) => c + 1)

		if (currentQuestionIndex >= maxQuestionIndexReached) {
			setScore((s) => s + 10)
			setMaxQuestionIndexReached(currentQuestionIndex + 1)
		}

		if (currentQuestionIndex < questions.length - 1) {
			setCurrentQuestionIndex((prev) => prev + 1)
		} else {
			handleSubmit()
		}
	}, [
		currentQuestionIndex,
		isCurrentQuestionAnswered,
		handleSubmit,
		maxQuestionIndexReached
	])

	const handleBack = useCallback(() => {
		if (currentQuestionIndex > 0) {
			setCurrentQuestionIndex((prev) => prev - 1)
		}
	}, [currentQuestionIndex])

	// --- Effects ---

	useEffect(() => {
		if (statusChecked.current) return
		statusChecked.current = true

		const checkStatus = async () => {
			try {
				const response = await fetch("/api/user/data", {
					method: "POST"
				})
				if (!response.ok) throw new Error("Could not fetch user data.")
				const result = await response.json()
				if (result?.data?.onboardingComplete) {
					router.push("/chat?show_demo=true")
				} else {
					setIsLoading(false)
				}
			} catch (error) {
				toast.error(error.message)
				setIsLoading(false)
			}
		}
		checkStatus()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [router])

	useEffect(() => {
		try {
			const userTimezone =
				Intl.DateTimeFormat().resolvedOptions().timeZone
			if (userTimezone) handleAnswer("timezone", userTimezone)
		} catch (e) {
			console.warn("Could not detect user timezone.")
		}
	}, [])

	useEffect(() => {
		const handleKeyDown = (e) => {
			if (stage === "questions") {
				if (e.key === "ArrowLeft") {
					e.preventDefault()
					handleBack()
				} else if (e.key === "Enter") {
					const currentQuestion = questions[currentQuestionIndex]
					if (currentQuestion.type === "textarea" && e.shiftKey) {
						return
					}
					e.preventDefault()
					handleNext()
				}
			}
		}

		window.addEventListener("keydown", handleKeyDown)
		return () => window.removeEventListener("keydown", handleKeyDown)
	}, [stage, handleBack, handleNext, currentQuestionIndex])

	useEffect(() => {
		let interval
		if (modelReacting) {
			setAudioLevel(0.6) // Spike the level for reaction
		} else {
			// Gentle pulse
			interval = setInterval(() => {
				setAudioLevel(Math.sin(Date.now() / 400) * 0.05 + 0.1)
			}, 50)
		}
		return () => clearInterval(interval)
	}, [modelReacting])

	// --- Render Logic ---

	if (isLoading) {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen bg-brand-black text-brand-white">
				<IconLoader className="w-10 h-10 animate-spin text-[var(--color-accent-blue)]" />
			</div>
		)
	}

	const renderContent = () => {
		switch (stage) {
			case "questions":
				const currentQuestion = questions[currentQuestionIndex] ?? null
				return (
					<motion.div
						key="questions-stage"
						className="w-full max-w-2xl flex flex-col items-center"
					>
						{/* 3D Model Container */}
						<motion.div
							layoutId="onboarding-sphere"
							className="h-40 w-full flex items-center justify-center -mb-8"
						>
							<SiriSpheres
								status="connected"
								audioLevel={audioLevel}
							/>
						</motion.div>
						<div className="w-full bg-neutral-900/50 border border-neutral-700/50 rounded-2xl p-6 sm:p-8 text-left space-y-6 flex flex-col">
							{/* Progress Bar */}
							<ProgressBar
								score={score}
								totalQuestions={questions.length}
							/>

							{/* Question Text */}
							<AnimatePresence mode="wait">
								<motion.div
									key={currentQuestionIndex}
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -20 }}
									className="min-h-[120px]" // Give it some min height to avoid layout shifts
								>
									<p className="text-lg md:text-xl text-neutral-200 whitespace-pre-wrap">
										{currentQuestion.question}
									</p>
									{currentQuestion.id === "needs-pa" && (
										<FormattedPaQuestion />
									)}
								</motion.div>
							</AnimatePresence>

							{/* Answer Input */}
							<div className="min-h-[50px]">
								{currentQuestion &&
									renderInput(currentQuestion)}
							</div>

							{/* Navigation */}
							<div className="flex justify-between items-center pt-4 border-t border-neutral-800">
								<button
									onClick={handleBack}
									disabled={currentQuestionIndex === 0}
									className="py-2 px-5 rounded-md bg-neutral-700 hover:bg-neutral-600 text-sm font-semibold disabled:opacity-50"
								>
									Back
								</button>
								<button
									onClick={handleNext}
									disabled={!isCurrentQuestionAnswered()}
									className="py-2 px-5 rounded-md bg-brand-orange hover:bg-brand-orange/90 text-brand-black text-sm font-semibold disabled:opacity-50"
								>
									{currentQuestionIndex ===
									questions.length - 1
										? "Finish"
										: "Next"}
								</button>
							</div>
						</div>
					</motion.div>
				)

			case "submitting":
				return (
					<motion.div
						key="submitting"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="text-center"
					>
						<IconLoader className="w-16 h-16 animate-spin text-brand-orange mx-auto mb-6" />
						<h1 className="text-3xl font-bold">
							Personalizing your experience...
						</h1>
					</motion.div>
				)

			case "complete":
				return (
					<motion.div
						key="complete"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						className="text-center"
					>
						<IconCheck className="w-24 h-24 text-brand-green mx-auto mb-6" />
						<h1 className="text-5xl font-bold mb-4">
							All Set, {answers["user-name"] || "Friend"}!
						</h1>
						<p className="text-xl text-neutral-400">
							Your personal AI companion is ready.
						</p>
						<p className="text-lg text-neutral-500 mt-4">
							Redirecting you to home...
						</p>
					</motion.div>
				)

			default:
				return null
		}
	}

	const renderInput = (currentQuestion) => {
		switch (currentQuestion.type) {
			case "text-input":
				return (
					<div className="relative w-full">
						<input
							type="text"
							value={answers[currentQuestion.id] || ""}
							onChange={(e) =>
								handleAnswer(currentQuestion.id, e.target.value)
							}
							placeholder={currentQuestion.placeholder}
							required={currentQuestion.required}
							autoFocus
							className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-brand-orange"
						/>
						{currentQuestion.id ===
							"whatsapp_notifications_number" && (
							<div className="absolute right-3 top-1/2 -translate-y-1/2">
								{whatsappStatus === "checking" && (
									<motion.div
										key="loader"
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										exit={{ opacity: 0 }}
									>
										<IconLoader
											size={18}
											className="animate-spin text-neutral-400"
										/>
									</motion.div>
								)}
								<AnimatePresence>
									{whatsappStatus === "valid" && (
										<motion.div
											key="valid"
											initial={{ scale: 0.5, opacity: 0 }}
											animate={{ scale: 1, opacity: 1 }}
										>
											<IconCheck
												size={18}
												className="text-green-500"
											/>
										</motion.div>
									)}
									{whatsappStatus === "invalid" && (
										<motion.div
											key="invalid"
											initial={{ scale: 0.5, opacity: 0 }}
											animate={{ scale: 1, opacity: 1 }}
										>
											<IconX
												size={18}
												className="text-red-500"
											/>
										</motion.div>
									)}
								</AnimatePresence>
							</div>
						)}
						{currentQuestion.id ===
							"whatsapp_notifications_number" &&
							whatsappStatus === "invalid" &&
							whatsappError && (
								<p className="text-red-500 text-xs mt-2">
									{whatsappError}
								</p>
							)}
					</div>
				)
			case "select":
				return (
					<select
						value={answers[currentQuestion.id] || ""}
						onChange={(e) =>
							handleAnswer(currentQuestion.id, e.target.value)
						}
						required={currentQuestion.required}
						className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-brand-orange appearance-none"
					>
						{currentQuestion.options.map((option) => (
							<option
								key={option.value}
								value={option.value}
								disabled={option.disabled}
								className="bg-brand-gray text-brand-white"
							>
								{option.label}
							</option>
						))}
					</select>
				)
			case "textarea":
				return (
					<textarea
						value={answers[currentQuestion.id] || ""}
						onChange={(e) =>
							handleAnswer(currentQuestion.id, e.target.value)
						}
						className="w-full h-24 px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-brand-orange resize-none custom-scrollbar"
						placeholder={currentQuestion.placeholder}
						autoFocus
						rows={1}
					/>
				)
			case "location":
				return (
					<div className="flex flex-col sm:flex-row gap-4 items-start">
						<input
							type="text"
							placeholder="Enter Locality, City, State..."
							value={
								typeof answers[currentQuestion.id] === "string"
									? answers[currentQuestion.id]
									: ""
							}
							onChange={(e) =>
								handleAnswer("location", e.target.value)
							}
							className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-brand-orange"
						/>
						<button
							type="button"
							onClick={handleGetLocation}
							disabled={locationState.loading}
							className="text-sm text-center text-brand-orange hover:underline whitespace-nowrap"
						>
							{locationState.loading
								? "Detecting..."
								: "or [Detect Current Location]"}
						</button>
						{locationState.data && (
							<p className="text-sm text-green-400">
								Location captured!
							</p>
						)}
					</div>
				)
			case "yes-no":
				return (
					<div className="flex gap-4">
						<button
							onClick={() => {
								handleAnswer(currentQuestion.id, "yes")
								setTimeout(handleNext, 100)
							}}
							className={cn(
								"px-6 py-2 rounded-lg font-semibold transition-colors",
								answers[currentQuestion.id] === "yes"
									? "bg-brand-orange text-brand-black"
									: "bg-neutral-700 hover:bg-neutral-600"
							)}
						>
							Yes
						</button>
						<button
							onClick={() => {
								handleAnswer(currentQuestion.id, "no")
								setTimeout(handleNext, 100)
							}}
							className={cn(
								"px-6 py-2 rounded-lg font-semibold transition-colors",
								answers[currentQuestion.id] === "no"
									? "bg-brand-orange text-brand-black"
									: "bg-neutral-700 hover:bg-neutral-600"
							)}
						>
							No
						</button>
					</div>
				)
			default:
				return null
		}
	}

	return (
		<div className="relative flex flex-col items-center justify-center min-h-screen w-full text-brand-white overflow-hidden p-4 sm:p-8">
			<div className="absolute inset-0 z-[-1]">
				<InteractiveNetworkBackground />
			</div>
			<div className="absolute -top-[250px] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-brand-orange/10 rounded-full blur-3xl -z-10" />
			<div className="relative z-10 w-full flex flex-col items-center justify-center">
				<SparkleEffect trigger={sparkleTrigger} />
				<AnimatePresence mode="wait">
					{stage === "intro" ? (
						<IntroStage onComplete={() => setStage("questions")} />
					) : (
						renderContent()
					)}
				</AnimatePresence>
			</div>
		</div>
	)
}

export default OnboardingPage
