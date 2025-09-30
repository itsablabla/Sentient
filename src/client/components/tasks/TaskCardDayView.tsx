"use client"
import React from "react";
import { motion } from "framer-motion"
import { cn } from "@utils/cn"
import { taskStatusColors } from "./constants"
import { Task } from "@/types";

interface TaskCardDayViewProps {
    task: Task;
    onSelectTask: (task: Task) => void;
}

const TaskCardDayView = ({ task, onSelectTask }: TaskCardDayViewProps) => {
	const statusInfo = taskStatusColors[task.status] || taskStatusColors.default

	return (
		<motion.div
			layout
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			onClick={() => onSelectTask(task)}
			className={cn(
				"p-2 rounded-md text-sm font-medium text-white cursor-pointer",
				"bg-sentient-blue/30 border-l-2 border-sentient-blue hover:bg-sentient-blue/40"
			)}
		>
			<p className="truncate">{task.name}</p>
		</motion.div>
	)
}

export default TaskCardDayView;
