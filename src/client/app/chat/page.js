"use client"

import {
	IconLoader,
	IconBolt,
	IconCheck,
	IconClockHour4,
	IconMessageChatbot,
	IconTool,
	IconSparkles,
	IconX
} from "@tabler/icons-react"
import { Tooltip } from "react-tooltip"
import { motion, AnimatePresence } from "framer-motion"
import InteractiveNetworkBackground from "@components/ui/InteractiveNetworkBackground"
import React from "react"
import { Button } from "@components/ui/button"
import { ModalDialog } from "@components/ui/ModalDialog"
import { useChat } from "@hooks/useChat"
import ChatHeader from "@components/chat/ChatHeader"
import ChatInputArea from "@components/chat/ChatInputArea"
import ChatMessageList from "@components/chat/ChatMessageList"
import VoiceModeUI from "@components/chat/VoiceModeUI"

const proPlanFeatures = [
	{ name: "Text Chat", limit: "100 messages per day" },
	{ name: "Voice Chat", limit: "10 minutes per day" },
	{ name: "Async Tasks", limit: "100 tasks per month" },
	{ name: "Active Workflows", limit: "25 recurring & triggered" },
	{
		name: "Parallel Agents",
		limit: "5 complex tasks per day with 50 sub agents"
	},
	{ name: "File Uploads", limit: "20 files per day" },
	{ name: "Memories", limit: "Unlimited memories" },
	{
		name: "Other Integrations",
		limit: "Notion, GitHub, Slack, Discord, Trello"
	}
]

const UpgradeToProModal = ({ isOpen, onClose }) => {
	if (!isOpen) return null

	const handleUpgrade = () => {
		const dashboardUrl = process.env.NEXT_PUBLIC_LANDING_PAGE_URL
		if (dashboardUrl) {
			window.location.href = `${dashboardUrl}/dashboard`
		}
		onClose()
	}

	return (
		<ModalDialog
			isOpen={isOpen}
			onClose={onClose}
			className="max-w-lg bg-neutral-900/90 backdrop-blur-xl p-0 rounded-2xl"
		>
			<div className="p-6">
				<header className="text-center mb-4">
					<h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
						<IconBolt className="text-yellow-400" />
						Unlock Pro Features
					</h2>
					<p className="text-neutral-400 mt-2">
						Unlock Voice Mode and other powerful features.
					</p>
				</header>
				<main className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 my-4">
					{proPlanFeatures.map((feature) => (
						<div
							key={feature.name}
							className="flex items-start gap-2.5"
						>
							<IconCheck
								size={18}
								className="text-green-400 flex-shrink-0 mt-0.5"
							/>
							<div>
								<p className="text-white text-sm font-medium">
									{feature.name}
								</p>
								<p className="text-neutral-400 text-xs">
									{feature.limit}
								</p>
							</div>
						</div>
					))}
				</main>
				<footer className="mt-4 flex flex-col gap-2">
					<Button
						onClick={handleUpgrade}
						className="w-full bg-brand-orange hover:bg-brand-orange/90 text-brand-black font-semibold"
					>
						Upgrade Now - $9/month
					</Button>
					<Button
						onClick={onClose}
						variant="ghost"
						className="w-full text-neutral-400"
					>
						Not now
					</Button>
				</footer>
			</div>
		</ModalDialog>
	)
}

export default function ChatPage() {
	const {
		// State
		displayedMessages,
		input,
		isLoading,
		thinking,
		textareaRef,
		chatEndRef,
		scrollContainerRef,
		fileInputRef,
		isLoadingOlder,
		userDetails,
		isWelcomeModalOpen,
		setIsWelcomeModalOpen,
		replyingTo,
		setReplyingTo,
		isOptionsOpen,
		setIsOptionsOpen,
		confirmClear,
		setConfirmClear,
		integrations,
		isUploading,
		uploadedFilename,
		setUploadedFilename,
		isUpgradeModalOpen,
		setUpgradeModalOpen,
		isMuted,
		isVoiceMode,
		connectionStatus,
		audioInputDevices,
		selectedAudioInputDevice,
		setSelectedAudioInputDevice,
		voiceStatusText,
		statusText,
		audioLevel,
		ringtoneAudioRef,
		connectedAudioRef,
		remoteAudioRef,
		isPro,

		// Functions
		handleInputChange,
		sendMessage,
		handleFileChange,
		handleReply,
		handleDeleteMessage,
		handleClearAllMessages,
		handleStopStreaming,
		getGreeting,
		handleToggleMute,
		handleStartVoice,
		handleStopVoice,
		toggleVoiceMode,
		setSelectedFile
	} = useChat()

	const renderWelcomeModal = () => (
		<AnimatePresence>
			{isWelcomeModalOpen && (
				<motion.div
					initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
					animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
					exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
					className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4 md:p-6"
					onClick={() => setIsWelcomeModalOpen(false)}
				>
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 20 }}
						transition={{ duration: 0.2, ease: "easeInOut" }}
						onClick={(e) => e.stopPropagation()}
						className="relative bg-neutral-900/80 backdrop-blur-2xl p-6 rounded-2xl shadow-2xl w-full max-w-2xl md:h-auto md:max-h-[85vh] h-full border border-neutral-700 flex flex-col"
					>
						<header className="flex justify-between items-center mb-6 flex-shrink-0">
							<h2 className="text-lg font-semibold text-white flex items-center gap-2">
								<IconMessageChatbot /> Welcome to Unified Chat
							</h2>
							<Button
								onClick={() => setIsWelcomeModalOpen(false)}
								variant="ghost"
								size="icon"
								className="rounded-full"
							>
								<IconX size={18} />
							</Button>
						</header>
						<main className="flex-1 overflow-y-auto custom-scrollbar pr-2 text-left space-y-6">
							<p className="text-neutral-300">
								This is your single, continuous conversation
								with me. No need to juggle multiple chats—just
								keep the dialogue flowing. Here’s how it works:
							</p>
							<div className="space-y-4">
								<div className="flex items-start gap-4">
									<IconSparkles
										size={20}
										className="text-brand-orange flex-shrink-0 mt-1"
									/>
									<div>
										<h3 className="font-semibold text-white">
											One Conversation, Infinite History
										</h3>
										<p className="text-neutral-400 text-sm mt-1">
											I remember our entire conversation,
											so you can always pick up where you
											left off.
										</p>
									</div>
								</div>
								<div className="flex items-start gap-4">
									<IconTool
										size={20}
										className="text-brand-orange flex-shrink-0 mt-1"
									/>
									<div>
										<h3 className="font-semibold text-white">
											Dynamic Tools for Any Task
										</h3>
										<p className="text-neutral-400 text-sm mt-1">
											I automatically select and use the
											right tools from your connected
											apps. Just tell me what you need,
											and I'll figure out how to get it
											done.
										</p>
									</div>
								</div>
								<div className="flex items-start gap-4">
									<IconClockHour4
										size={20}
										className="text-brand-orange flex-shrink-0 mt-1"
									/>
									<div>
										<h3 className="font-semibold text-white">
											Schedule for Later
										</h3>
										<p className="text-neutral-400 text-sm mt-1">
											Tell me to do something 'tomorrow at
											9am' or 'next Friday', and I'll
											handle it in the background, keeping
											you updated in the Tasks panel.
										</p>
									</div>
								</div>
							</div>
						</main>
						<footer className="mt-6 pt-4 border-t border-neutral-800 flex justify-end">
							<Button
								onClick={() => setIsWelcomeModalOpen(false)}
								variant="secondary"
							>
								Got it
							</Button>
						</footer>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	)

	return (
		<div className="flex-1 flex h-screen text-white overflow-hidden">
			<Tooltip id="home-tooltip" place="right" style={{ zIndex: 9999 }} />
			<audio
				ref={ringtoneAudioRef}
				src="/audio/ringing.mp3"
				preload="auto"
				loop
			></audio>
			<audio
				ref={connectedAudioRef}
				src="/audio/connected.mp3"
				preload="auto"
			></audio>
			<UpgradeToProModal
				isOpen={isUpgradeModalOpen}
				onClose={() => setUpgradeModalOpen(false)}
			></UpgradeToProModal>
			{renderWelcomeModal()}
			<audio ref={remoteAudioRef} autoPlay playsInline />
			<div className="flex-1 flex flex-col overflow-hidden relative w-full pt-16 md:pt-0">
				<div className="absolute inset-0 z-[-1] network-grid-background">
					<InteractiveNetworkBackground />
				</div>
				<div className="absolute -top-[250px] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-brand-orange/10 rounded-full blur-3xl -z-10" />

				<main
					ref={scrollContainerRef}
					className="flex-1 overflow-y-auto sm:p-0 md:px-4 pb-4 md:p-6 flex flex-col custom-scrollbar"
				>
					{isLoading ? (
						<div className="flex-1 flex justify-center items-center">
							<IconLoader className="animate-spin text-neutral-500" />
						</div>
					) : isVoiceMode ? (
						<VoiceModeUI
							{...{
								connectionStatus,
								audioLevel,
								selectedAudioInputDevice,
								setSelectedAudioInputDevice,
								audioInputDevices,
								isMuted,
								handleToggleMute,
								handleStartVoice,
								handleStopVoice,
								toggleVoiceMode,
								voiceStatusText,
								displayedMessages
							}}
						/>
					) : displayedMessages.length === 0 && !thinking ? (
						<div className="flex-1 flex flex-col justify-center items-center p-4 md:p-6">
							<ChatHeader
								{...{
									getGreeting,
									userDetails,
									isOptionsOpen,
									setIsOptionsOpen,
									confirmClear,
									setConfirmClear,
									handleClearAllMessages
								}}
							/>
							{/* Input area is now rendered below main */}
						</div>
					) : (
						<ChatMessageList
							{...{
								scrollContainerRef,
								isLoadingOlder,
								displayedMessages,
								thinking,
								statusText,
								chatEndRef,
								handleReply,
								handleDeleteMessage
							}}
						/>
					)}
				</main>
				{!isLoading && !isVoiceMode && (
					<div className="flex-shrink-0 bg-transparent">
						<div className="relative w-full max-w-4xl mx-auto px-2 pt-2 pb-4 sm:px-6 sm:pb-6">
							<ChatInputArea
								{...{
									input,
									handleInputChange,
									sendMessage,
									textareaRef,
									uploadedFilename,
									isUploading,
									fileInputRef,
									handleFileChange,
									integrations,
									setIsWelcomeModalOpen,
									toggleVoiceMode,
									isPro,
									thinking,
									handleStopStreaming,
									replyingTo,
									setReplyingTo,
									setUploadedFilename,
									setSelectedFile
								}}
							/>
						</div>
						{/* Add padding for the empty state to push the input down */}
						{displayedMessages.length === 0 && !thinking && (
							<div className="mt-12"></div>
						)}
					</div>
				)}
			</div>
		</div>
	)
}
