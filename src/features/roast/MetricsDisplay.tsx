import { motion } from "framer-motion";
import { Card } from "../../shared/ui/Card";
import { metricColor } from "../../shared/lib/utils";
import type { PerformanceMetrics } from "../../shared/types";

interface MetricRowProps {
  label: string;
  score: number;
  delay: number;
}

function MetricRow({ label, score, delay }: MetricRowProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-300">{label}</span>
        <span className="font-semibold text-white">{Math.round(score)}/100</span>
      </div>
      <div className="h-2 rounded-full bg-zinc-800">
        <motion.div
          className={`h-2 rounded-full ${metricColor(score)}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(1, score)}%` }}
          transition={{ delay, duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

interface MetricsDisplayProps {
  metrics: PerformanceMetrics;
}

export function MetricsDisplay({ metrics }: MetricsDisplayProps) {
  return (
    <Card className="space-y-5">
      <h3 className="font-display text-xl font-bold text-white">
        Performance Breakdown
      </h3>

      <div className="space-y-4">
        <MetricRow label="Performance" score={metrics.performance} delay={0} />
        <MetricRow
          label="Accessibility"
          score={metrics.accessibility}
          delay={0.1}
        />
        <MetricRow
          label="Best Practices"
          score={metrics.bestPractices}
          delay={0.2}
        />
        <MetricRow label="SEO" score={metrics.seo} delay={0.3} />
      </div>

      <div className="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 text-sm md:grid-cols-2">
        <Info label="Load Time" value={metrics.loadTime} />
        <Info label="FCP" value={metrics.firstContentfulPaint} />
        <Info label="LCP" value={metrics.largestContentfulPaint} />
        <Info label="TBT" value={metrics.totalBlockingTime} />
        <Info label="CLS" value={metrics.cumulativeLayoutShift} />
      </div>
    </Card>
  );
}

interface InfoProps {
  label: string;
  value: string;
}

function Info({ label, value }: InfoProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-zinc-400">{label}</span>
      <span className="font-mono text-zinc-200">{value}</span>
    </div>
  );
}
