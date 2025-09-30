"use client"

import React, { createContext, useContext, useState, forwardRef, HTMLAttributes, ButtonHTMLAttributes } from "react"
import { motion, AnimatePresence, MotionConfig } from "framer-motion"
import { cn } from "@utils/cn"

interface AccordionContextProps {
	value: string | string[] | null;
	toggleValue: (itemValue: string) => void;
	type: 'single' | 'multiple';
}

const AccordionContext = createContext<AccordionContextProps | null>(null)

function useAccordion(): AccordionContextProps {
	const context = useContext(AccordionContext) as AccordionContextProps
	if (!context) {
		throw new Error("useAccordion must be used within an Accordion")
	}
	return context
}

const Accordion = ({
	children,
	className,
	collapsible = false,
	type = "single",
	defaultValue,
	...props
}: {
	children: React.ReactNode;
	className?: string;
	collapsible?: boolean;
	type?: 'single' | 'multiple';
	defaultValue?: string | string[];
	[key: string]: any;
}) => {
	const [value, setValue] = useState(
		type === "multiple" ? defaultValue || [] : defaultValue || null
	)

	const toggleValue = (itemValue: string) => {
		if (type === "multiple") {
			setValue((prev) =>
				prev.includes(itemValue)
					? prev.filter((v) => v !== itemValue)
					: [...prev, itemValue]
			)
		} else {
			setValue((prev) => (prev === itemValue && collapsible ? null : itemValue))
		}
	}

	return (
		<AccordionContext.Provider value={{ value, toggleValue, type }}>
			<div className={cn("w-full", className)} {...props}>
				{children}
			</div>
		</AccordionContext.Provider>
	)
}

const AccordionItem = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & { value: string }>(
	({ children, className, value, ...props }, ref) => {
		const { value: contextValue } = useAccordion()
		const isExpanded: boolean = Array.isArray(contextValue)
			? contextValue.includes(value)
			: contextValue === value

		return (
			<div
				ref={ref}
				className={cn("border-b border-neutral-800", className)}
				{...props}
			>
				{React.Children.map(children, (child) =>
					React.cloneElement(child, { isExpanded, value })
				)}
			</div>
		)
	}
)
AccordionItem.displayName = "AccordionItem"

interface AccordionTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	children: React.ReactNode;
	isExpanded?: boolean;
	value?: string;
}

const AccordionTrigger = forwardRef<HTMLButtonElement, AccordionTriggerProps>(
	({ children, className, isExpanded, value = "", ...props }, ref) => {
		const { toggleValue } = useAccordion()
		return (
			<button
				ref={ref}
				onClick={() => toggleValue(value)}
				className={cn(
					"flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline",
					className
				)}
				{...props}
			>
				{children}
			</button>
		)
	}
)
AccordionTrigger.displayName = "AccordionTrigger"

interface AccordionContentProps extends HTMLAttributes<HTMLDivElement> {
	children: React.ReactNode;
	isExpanded?: boolean;
}

const AccordionContent = forwardRef<HTMLDivElement, AccordionContentProps>(
	({ children, className, isExpanded, ...props }, ref) => {
		return (
			<AnimatePresence initial={false}>
				{isExpanded && (
					<motion.div
						ref={ref}
						initial="collapsed"
						animate="expanded"
						exit="collapsed"
						variants={{
							expanded: { height: "auto", opacity: 1 },
							collapsed: { height: 0, opacity: 0 }
						}}
						transition={{ duration: 0.3, ease: "easeInOut" }}
						className={cn("overflow-hidden", className)}
						{...props}
					>
						<div className="pb-4 pt-0">{children}</div>
					</motion.div>
				)}
			</AnimatePresence>
		)
	}
)
AccordionContent.displayName = "AccordionContent"

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }