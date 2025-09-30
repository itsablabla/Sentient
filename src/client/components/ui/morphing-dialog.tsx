"use client"

import React, {
	useCallback,
	useContext,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
	FC,
	ReactNode,
	HTMLAttributes,
	ButtonHTMLAttributes,
	ImgHTMLAttributes,
	RefObject
} from "react"
import { motion, AnimatePresence, MotionConfig, MotionProps } from "framer-motion"
import { createPortal } from "react-dom"
import { cn } from "@utils/cn"
import { IconX } from "@tabler/icons-react"
import useClickOutside from "@hooks/useClickOutside"

interface MorphingDialogContextType {
	isOpen: boolean;
	setIsOpen: (isOpen: boolean) => void;
	uniqueId: string;
	triggerRef: RefObject<HTMLButtonElement>;
}

const MorphingDialogContext = React.createContext<MorphingDialogContextType | null>(null)

function useMorphingDialog() {
	const context = useContext(MorphingDialogContext)
	if (!context) {
		throw new Error(
			"useMorphingDialog must be used within a MorphingDialogProvider"
		)
	}
	return context
}

interface MorphingDialogProviderProps {
	children: ReactNode;
	transition?: any;
}

function MorphingDialogProvider({ children, transition }: MorphingDialogProviderProps) {
	const [isOpen, setIsOpen] = useState(false)
	const uniqueId = useId()
	const triggerRef = useRef<HTMLButtonElement>(null)

	const contextValue = useMemo(
		() => ({
			isOpen,
			setIsOpen,
			uniqueId,
			triggerRef
		}),
		[isOpen, uniqueId]
	)

	return (
		<MorphingDialogContext.Provider value={contextValue}>
			<MotionConfig transition={transition}>{children}</MotionConfig>
		</MorphingDialogContext.Provider>
	)
}

interface MorphingDialogProps {
	children: ReactNode;
	transition?: any;
}

function MorphingDialog({ children, transition }: MorphingDialogProps) {
	return (
		<MorphingDialogProvider transition={transition}>
			<MotionConfig transition={transition}>{children}</MotionConfig>
		</MorphingDialogProvider>
	)
}

interface MorphingDialogTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	children: ReactNode;
}

const MorphingDialogTrigger: FC<MorphingDialogTriggerProps> = ({ children, className, style, ...props }) => {
	const { setIsOpen, isOpen, uniqueId, triggerRef } = useMorphingDialog()

	const handleClick = useCallback(() => {
		setIsOpen(!isOpen)
	}, [isOpen, setIsOpen])

	const handleKeyDown = useCallback(
		(event: React.KeyboardEvent) => {
			if (event.key === "Enter" || event.key === " ") {
				event.preventDefault()
				setIsOpen(!isOpen)
			}
		},
		[isOpen, setIsOpen]
	)

	return (
		<motion.button
			ref={triggerRef}
			layoutId={`dialog-${uniqueId}`}
			className={cn("relative cursor-pointer", className)}
			onClick={handleClick}
			onKeyDown={handleKeyDown}
			style={style}
			aria-haspopup="dialog"
			aria-expanded={isOpen}
			aria-controls={`motion-ui-morphing-dialog-content-${uniqueId}`}
			aria-label={`Open dialog ${uniqueId}`}
			{...props}
		>
			{children}
		</motion.button>
	)
}

interface MorphingDialogContentProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
}

const MorphingDialogContent: FC<MorphingDialogContentProps> = ({ children, className, style, ...props }) => {
	const { setIsOpen, isOpen, uniqueId, triggerRef } = useMorphingDialog()
	const containerRef = useRef<HTMLDivElement>(null)
	const [firstFocusableElement, setFirstFocusableElement] = useState<HTMLElement | null>(null)
	const [lastFocusableElement, setLastFocusableElement] = useState<HTMLElement | null>(null)

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setIsOpen(false)
			}
			if (event.key === "Tab") {
				if (!firstFocusableElement || !lastFocusableElement) return

				if (event.shiftKey) {
					if (document.activeElement === firstFocusableElement) {
						event.preventDefault()
						lastFocusableElement.focus()
					}
				} else {
					if (document.activeElement === lastFocusableElement) {
						event.preventDefault()
						firstFocusableElement.focus()
					}
				}
			}
		}

		document.addEventListener("keydown", handleKeyDown)

		return () => {
			document.removeEventListener("keydown", handleKeyDown)
		}
	}, [setIsOpen, firstFocusableElement, lastFocusableElement])

	useEffect(() => {
		if (isOpen) {
			document.body.classList.add("overflow-hidden")
			const focusableElements = containerRef.current?.querySelectorAll<HTMLElement>(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
			)
			if (focusableElements && focusableElements.length > 0) {
				setFirstFocusableElement(focusableElements[0])
				setLastFocusableElement(
					focusableElements[focusableElements.length - 1]
				)
				focusableElements[0].focus()
			}
		} else {
			document.body.classList.remove("overflow-hidden")
			triggerRef.current?.focus()
		}
	}, [isOpen, triggerRef])

	useClickOutside(containerRef, () => {
		if (isOpen) {
			setIsOpen(false)
		}
	})

	return (
		<motion.div
			ref={containerRef}
			layoutId={`dialog-${uniqueId}`}
			className={cn("overflow-hidden", className)}
			style={style}
			role="dialog"
			aria-modal="true"
			aria-labelledby={`motion-ui-morphing-dialog-title-${uniqueId}`}
			aria-describedby={`motion-ui-morphing-dialog-description-${uniqueId}`}
            {...props}
		>
			{children}
		</motion.div>
	)
}

const MorphingDialogContainer: FC<{ children: ReactNode }> = ({ children }) => {
	const { isOpen, uniqueId } = useMorphingDialog()
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		setMounted(true)
		return () => setMounted(false)
	}, [])

	if (!mounted) return null

	return createPortal(
		<AnimatePresence initial={false} mode="sync">
			{isOpen && (
				<>
					<motion.div
						key={`backdrop-${uniqueId}`}
						className="fixed inset-0 h-full w-full bg-transparent backdrop-blur-sm dark:bg-black/70 z-[70]"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
					/>
					<div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
						{children}
					</div>
				</>
			)}
		</AnimatePresence>,
		document.body
	)
}

const MorphingDialogTitle: FC<HTMLAttributes<HTMLDivElement>> = ({ children, className, style, ...props }) => {
	const { uniqueId } = useMorphingDialog()
	return <motion.div layoutId={`dialog-title-container-${uniqueId}`} className={className} style={style} layout {...props}>{children}</motion.div>
}

const MorphingDialogSubtitle: FC<HTMLAttributes<HTMLDivElement>> = ({ children, className, style, ...props }) => {
	const { uniqueId } = useMorphingDialog()
	return <motion.div layoutId={`dialog-subtitle-container-${uniqueId}`} className={className} style={style} {...props}>{children}</motion.div>
}

interface MorphingDialogDescriptionProps extends MotionProps {
    children: ReactNode;
    className?: string;
    disableLayoutAnimation?: boolean;
}
const MorphingDialogDescription: FC<MorphingDialogDescriptionProps> = ({ children, className, variants, disableLayoutAnimation, ...props }) => {
	const { uniqueId } = useMorphingDialog()
	return <motion.div key={`dialog-description-${uniqueId}`} layoutId={disableLayoutAnimation ? undefined : `dialog-description-content-${uniqueId}`} variants={variants} className={className} initial="initial" animate="animate" exit="exit" id={`dialog-description-${uniqueId}`} {...props}>{children}</motion.div>
}

const MorphingDialogImage: FC<ImgHTMLAttributes<HTMLImageElement>> = ({ src, alt, className, style, ...props }) => {
	const { uniqueId } = useMorphingDialog()
	return <motion.img src={src} alt={alt} className={cn(className)} layoutId={`dialog-img-${uniqueId}`} style={style} {...props} />
}

interface MorphingDialogCloseProps extends MotionProps {
    children?: ReactNode;
    className?: string;
}
const MorphingDialogClose: FC<MorphingDialogCloseProps> = ({ children, className, variants, ...props }) => {
	const { setIsOpen, uniqueId } = useMorphingDialog()
	const handleClose = useCallback(() => { setIsOpen(false) }, [setIsOpen])
	return <motion.button onClick={handleClose} type="button" aria-label="Close dialog" key={`dialog-close-${uniqueId}`} className={cn("absolute top-6 right-6", className)} initial="initial" animate="animate" exit="exit" variants={variants} {...props}>{children || <IconX size={24} />}</motion.button>
}

export {
	MorphingDialog,
	MorphingDialogTrigger,
	MorphingDialogContainer,
	MorphingDialogContent,
	MorphingDialogClose,
	MorphingDialogTitle,
	MorphingDialogSubtitle,
	MorphingDialogDescription,
	MorphingDialogImage
}
