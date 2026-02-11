import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Card } from "../../shared/ui/Card";

const defaultMessages = [
  "Preparing the roast... 🔥",
  "Analyzing your questionable design choices...",
  "AI is judging your color palette...",
  "Counting your CSS crimes..."
];

interface LoadingScreenProps {
  messageIndex: number;
  messages?: string[];
}

export function LoadingScreen({
  messageIndex,
  messages = defaultMessages
}: LoadingScreenProps) {
  const current = messages[messageIndex % messages.length];

  return (
    <Card className="mx-auto max-w-2xl text-center" glow>
      <div className="space-y-4">
        <Loader2 className="mx-auto h-9 w-9 animate-spin text-ember-300" />
        <AnimatePresence mode="wait">
          <motion.p
            key={current}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="text-base text-zinc-100"
          >
            {current}
          </motion.p>
        </AnimatePresence>
      </div>
    </Card>
  );
}

export const loadingMessages = defaultMessages;
