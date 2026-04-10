import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";

type StatCardProps = {
  icon: LucideIcon;
  label: string;
  value: string | number;
  change?: {
    value: string;
    positive: boolean;
  };
  className?: string;
};

export function StatCard({ icon: Icon, label, value, change, className = "" }: StatCardProps) {
  return (
    <div className={`bg-background-card border border-border rounded-xl p-5 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-accent-light flex items-center justify-center">
          <Icon className="w-5 h-5 text-accent" />
        </div>
        {change && (
          <div
            className={`flex items-center gap-1 text-xs font-medium ${
              change.positive ? "text-success" : "text-danger"
            }`}
          >
            {change.positive ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            {change.value}
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-foreground-muted mt-1">{label}</p>
    </div>
  );
}
