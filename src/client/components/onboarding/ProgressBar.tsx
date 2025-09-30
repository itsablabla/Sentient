"use client"
import React from "react";
import { motion } from "framer-motion"

interface ProgressBarProps {
    score: number;
    totalQuestions: number;
}

const ProgressBar = ({ score, totalQuestions }: ProgressBarProps) => {
	const progress =
		totalQuestions > 0 ? (score / (totalQuestions * 10)) * 100 : 0

	return (
		<div className="w-full max-w-lg mx-auto">
			<div className="w-full bg-brand-gray/50 h-2 overflow-hidden rounded-full backdrop-blur-sm">
				<motion.div
					className="bg-brand-orange h-full rounded-full"
					initial={{ width: "0%" }}
					animate={{ width: `${progress}%` }}
					transition={{ duration: 0.5, ease: "easeInOut" }}
				/>
			</div>
		</div>
	)
}

export default ProgressBar;
