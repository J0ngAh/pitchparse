"use client";

import { motion } from "motion/react";
import { BarChart3, Users, TrendingUp, Target, Lightbulb, MessageSquare, Zap } from "lucide-react";

const GENERAL_PROMPTS = [
  {
    text: "Show my team's performance this month",
    icon: BarChart3,
  },
  {
    text: "Who needs coaching attention?",
    icon: Users,
  },
  {
    text: "Compare my last 3 calls",
    icon: TrendingUp,
  },
  {
    text: "What's the most common weakness across calls?",
    icon: Target,
  },
];

const ANALYSIS_PROMPTS = [
  {
    text: "What are the top 3 things to improve?",
    icon: Lightbulb,
  },
  {
    text: "Role-play the weakest phase of this call",
    icon: MessageSquare,
  },
  {
    text: "How could I have handled objections better?",
    icon: Zap,
  },
  {
    text: "Break down my BANT qualification score",
    icon: Target,
  },
];

interface SuggestedPromptsProps {
  analysisId: string | null;
  onSelect: (prompt: string) => void;
}

export function SuggestedPrompts({ analysisId, onSelect }: SuggestedPromptsProps) {
  const prompts = analysisId ? ANALYSIS_PROMPTS : GENERAL_PROMPTS;

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {prompts.map((prompt, i) => {
        const Icon = prompt.icon;
        return (
          <motion.button
            key={prompt.text}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => onSelect(prompt.text)}
            className="glass-card flex items-center gap-3 rounded-xl border border-border p-3 text-left text-sm text-muted-foreground transition-all hover:border-primary/30 hover:text-foreground hover:shadow-[0_0_15px_rgba(249,115,22,0.08)]"
          >
            <Icon className="h-4 w-4 shrink-0 text-primary/60" />
            <span>{prompt.text}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
