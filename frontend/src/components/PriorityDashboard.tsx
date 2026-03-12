import { useMemo } from "react";
import { EnrichedEmail } from "../hooks/useEnrichedEmails";

interface Props {
  emails: EnrichedEmail[];
  onSelectEmail: (email: EnrichedEmail) => void;
  selectedEmailId: string | null;
}

const SCORE_CONFIG: Record<
  string,
  { label: string; bar: string; badge: string; text: string }
> = {
  critical: {
    label: "Critical",
    bar: "bg-red-500",
    badge: "bg-red-100 text-red-700 border-red-200",
    text: "text-red-600",
  },
  high: {
    label: "High",
    bar: "bg-orange-400",
    badge: "bg-orange-100 text-orange-700 border-orange-200",
    text: "text-orange-500",
  },
  medium: {
    label: "Medium",
    bar: "bg-yellow-400",
    badge: "bg-yellow-100 text-yellow-700 border-yellow-200",
    text: "text-yellow-600",
  },
  low: {
    label: "Low",
    bar: "bg-slate-300",
    badge: "bg-slate-100 text-slate-600 border-slate-200",
    text: "text-slate-400",
  },
};

function scoreToTier(score: number): keyof typeof SCORE_CONFIG {
  if (score >= 9) return "critical";
  if (score >= 7) return "high";
  if (score >= 4) return "medium";
  return "low";
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffH / 24);
  if (diffD > 0) return `${diffD}d ago`;
  if (diffH > 0) return `${diffH}h ago`;
  return "Just now";
}

export const PriorityDashboard = ({
  emails,
  onSelectEmail,
  selectedEmailId,
}: Props) => {
  const sorted = useMemo(
    () => [...emails].sort((a, b) => b.priority_score - a.priority_score),
    [emails]
  );

  const tierCounts = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    emails.forEach((e) => {
      counts[scoreToTier(e.priority_score)]++;
    });
    return counts;
  }, [emails]);

  return (
    <div className="flex flex-col h-full">
      {/* Tier summary bar */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {(["critical", "high", "medium", "low"] as const).map((tier) => {
          const cfg = SCORE_CONFIG[tier];
          return (
            <div
              key={tier}
              className={`rounded-lg border px-3 py-2 text-center ${cfg.badge}`}
            >
              <div className="text-xl font-bold font-mono">
                {tierCounts[tier]}
              </div>
              <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
                {cfg.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Email list */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {sorted.map((email) => {
          const tier = scoreToTier(email.priority_score);
          const cfg = SCORE_CONFIG[tier];
          const isSelected = email.id === selectedEmailId;

          return (
            <button
              key={email.id}
              onClick={() => onSelectEmail(email)}
              className={`w-full text-left rounded-xl border p-3 transition-all hover:shadow-md ${
                isSelected
                  ? "border-blue-500 bg-blue-50 shadow-md"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Priority score circle */}
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${cfg.badge} border`}
                >
                  {email.priority_score}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Subject line */}
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className={`font-semibold text-sm truncate ${
                        !email.is_read ? "text-slate-900" : "text-slate-600"
                      }`}
                    >
                      {email.subject}
                    </span>
                    {!email.is_read && (
                      <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500" />
                    )}
                    {email.has_attachments && (
                      <span className="flex-shrink-0 text-slate-400 text-xs">📎</span>
                    )}
                  </div>

                  {/* From + time */}
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                    <span className="truncate">
                      {email.from_name}
                      {email.sender_role !== "Unknown" && (
                        <span className="ml-1 text-blue-600 font-medium">
                          · {email.sender_role}
                        </span>
                      )}
                    </span>
                    <span className="flex-shrink-0 ml-2">
                      {formatRelativeTime(email.received_datetime)}
                    </span>
                  </div>

                  {/* Priority reason */}
                  <p className={`text-xs ${cfg.text} font-medium mb-1.5`}>
                    ↑ {email.priority_reason}
                  </p>

                  {/* Tags row */}
                  <div className="flex flex-wrap gap-1">
                    {email.contract_tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-mono font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                    {email.project_tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                    {email.detected_deadline && (
                      <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">
                        📅 Due {email.detected_deadline}
                      </span>
                    )}
                    {email.needs_reply && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                        ↩ Reply needed
                      </span>
                    )}
                  </div>
                </div>

                {/* Score bar */}
                <div className="flex-shrink-0 flex flex-col items-center gap-1 w-3">
                  <div className="w-1.5 bg-slate-100 rounded-full h-16 flex flex-col justify-end overflow-hidden">
                    <div
                      className={`w-full rounded-full transition-all ${cfg.bar}`}
                      style={{ height: `${email.priority_score * 10}%` }}
                    />
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
