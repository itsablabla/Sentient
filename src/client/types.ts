// src/client/types.ts
import { TablerIconsProps } from "@tabler/icons-react"
import React from "react"

// A generic interface for a user profile
export interface UserProfile {
    sub: string;
    given_name?: string;
    name: string;
    picture: string;
}

// Interface for a chat message
export interface ChatMessage {
    id: string;
    message_id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: string;
    tools?: string[];
    turn_steps?: TurnStep[];
    replyToId?: string;
    assistantTempId?: string; // For optimistic UI updates
}

// Interface for a turn step in the agent's thought process
export interface TurnStep {
    type: "thought" | "tool_call" | "tool_result";
    content?: string;
    tool_name?: string;
    arguments?: string;
    result?: string;
}

// Interface for a memory
export interface Memory {
    id: string;
    content: string;
    created_at: string;
    source?: string;
    topics?: string[];
}

// Interface for a task
export interface Task {
    task_id: string;
    name: string;
    description: string;
    status: string;
    task_type: string;
    created_at: string;
    priority: number;
    plan?: { tool: string; description: string }[];
    schedule?: {
        type: 'once' | 'recurring' | 'triggered';
        run_at?: string | null;
        frequency?: 'daily' | 'weekly';
        days?: string[];
        time?: string;
        source?: string;
        event?: string;
        filter?: Record<string, any>;
    };
    assignee?: 'ai' | 'user';
    runs?: any[]; // Define a proper Run interface if needed
    subTasks?: Task[];
    original_context?: {
        parent_task_id?: string;
    };
    isDemoTask?: boolean;
    isDemoWorkflow?: boolean;
    instance_id?: string; // For calendar view
    scheduled_date?: string; // For calendar view
    swarm_details?: {
        completed_agents?: number;
        total_agents?: number;
        goal?: string;
        items?: any[];
    };
    orchestrator_state?: {
        current_state?: string;
        waiting_config?: any;
    };
    dynamic_plan?: any[];
    clarification_requests?: any[];
    chat_history?: any[];
    found_context?: string;
    error?: string;
    result?: any;
}

// Interface for an integration source
export interface Integration {
    name: string;
    display_name: string;
    description: string;
    auth_type: 'oauth' | 'manual' | 'builtin' | 'composio';
    connected: boolean;
    icon?: React.ComponentType<TablerIconsProps>;
    client_id?: string;
    auth_config_id?: string;
}

// Interface for a notification
export interface Notification {
    id: string;
    message: string;
    timestamp: string;
    task_id?: string;
}