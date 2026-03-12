import { useMemo, useState } from "react";
import { EnrichedEmail } from "../hooks/useEnrichedEmails";

interface Props {
  emails: EnrichedEmail[];
  onSelectEmail: (email: EnrichedEmail) => void;
  hoursThreshold?: number;
}

const URGENCY_CONFIG = {
  critical: {
    label: "Critical",
    dot: "bg-red-500",
    row: "border-red-200 bg-red-50",
    badge: "bg-red-100 text-red-700",
    icon: "🔴",
  },
  high: {
    label: "High",
    dot: "bg-orange-400",
    row: "border-orange-200 bg-orange-50",
    badge: "bg-orange-100 text-orange-700",
    icon: "🟠",
  },
  medium: {
    label: "Medium",
    dot: "bg-yellow-400",
    row: "border-yellow-200 bg-yellow-50",
    badge: "bg-yellow-100 text-yellow-700",
    icon: "🟡",
  },
  low: {
    label: "Low",
    dot: "bg-slate-300",
    row: "border-slate-200 bg-white",
    badge: "bg-slate-100 text-slate-600",
    icon: "⚪",
  },
};

function formatHours(hours: number): string {
  if (hours < 1) return "< 1 hour ago";
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ${Math.floor(hours % 24)}h ago`;
}

export const ReplyQueue = ({
  emails,
  onSelectEmail,
  hoursThreshold = 0,
}: Props) => {
  const [filterUrgency, setFilterUrgency] = useState<string>("all");
  const [customThreshold, setCustomThreshold] = useState(hoursThreshold);

  const queue = useMemo(() => {
    return emails
      .filter(
        (e) =>
          e.needs_reply &&
          !e.already_replied &&
          e.hours_since_received >= customThreshold
      )
      .sort((a, b) => {
        // Sort by urgency first, then hours waiting
        const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const urgencyDiff =
          (urgencyOrder[a.reply_urgency] ?? 3) -
          (urgencyOrder[b.reply_urgency] ?? 3);
        if (urgencyDiff !== 0) return urgencyDiff;
        return b.hours_since_received - a.hours_since_received;
      });
  }, [emails, customThreshold]);

  const filtered =
    filterUrgency === "all"
      ? queue
      : queue.filter((e) => e.reply_urgency === filterUrgency);

  const urgencyCounts = useMemo(() => {
    const counts: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };
    queue.forEach((e) => {
      if (counts[e.reply_urgency] !== undefined) counts[e.reply_urgency]++;
    });
    return counts;
  }, [queue]);

  return (
    <div className="flex flex-col h-full">
      {/* Header controls */}
      <div className="flex items-center justify-between mb-3 gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span className="font-medium">No reply after</span>
          <select
            value={customThreshold}
            onChange={(e) => setCustomThreshold(Number(e.target.value))}
            className="border border-slate-200 rounded-lg px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value={0}>Immediately (0h)</option>
            <option value={1}>1 hour</option>
            <option value={2}>2 hours</option>
            <option value={4}>4 hours</option>
            <option value={8}>8 hours</option>
            <option value={24}>24 hours</option>
            <option value={48}>48 hours</option>
          </select>
        </div>

        <div className="flex items-center gap-1">
          {(["all", "critical", "high", "medium", "low"] as const).map(
            (level) => {
              const count =
                level === "all"
                  ? queue.length
                  : urgencyCounts[level] ?? 0;
              const isActive = filterUrgency === level;
              return (
                <button
                  key={level}
                  onClick={() => setFilterUrgency(level)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${isActive
                    ? "bg-slate-800 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                >
                  {level === "all" ? `All (${count})` : `${URGENCY_CONFIG[level].icon} ${count}`}
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* Queue list */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-5xl mb-3">✅</div>
            <p className="text-slate-600 font-semibold">You're all caught up!</p>
            <p className="text-slate-400 text-sm mt-1">
              No emails waiting more than {customThreshold} hour
              {customThreshold !== 1 ? "s" : ""} without a reply
            </p>
          </div>
        ) : (
          filtered.map((email) => {
            const cfg = URGENCY_CONFIG[email.reply_urgency] ?? URGENCY_CONFIG.low;
            const isOverdue = email.hours_since_received > 24;

            return (
              <button
                key={email.id}
                onClick={() => onSelectEmail(email)}
                className={`w-full text-left rounded-xl border p-3 transition-all hover:shadow-md ${cfg.row}`}
              >
                <div className="flex items-start gap-3">
                  {/* Urgency dot */}
                  <div className="flex-shrink-0 mt-1">
                    <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Subject */}
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className={`text-sm font-semibold truncate ${!email.is_read ? "text-slate-900" : "text-slate-700"
                          }`}
                      >
                        {email.subject}
                      </span>
                      {isOverdue && (
                        <span className="flex-shrink-0 text-xs bg-red-500 text-white px-1.5 py-0.5 rounded font-bold">
                          OVERDUE
                        </span>
                      )}
                    </div>

                    {/* Sender info */}
                    <div className="text-xs text-slate-600 mb-1.5">
                      <span className="font-medium">{email.from_name}</span>
                      {email.sender_role !== "Unknown" && (
                        <span className="ml-1 text-blue-600 font-medium">
                          · {email.sender_role}
                        </span>
                      )}
                      <span className="ml-1 text-slate-400">
                        · {email.from_address}
                      </span>
                    </div>

                    {/* Body preview */}
                    <p className="text-xs text-slate-500 line-clamp-2 mb-2">
                      {email.body_preview}
                    </p>

                    {/* Footer row */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cfg.badge}`}
                      >
                        {cfg.label} urgency
                      </span>
                      <span className="text-xs text-slate-400">
                        ⏱ Waiting {formatHours(email.hours_since_received)}
                      </span>
                      {email.contract_tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-mono"
                        >
                          {tag}
                        </span>
                      ))}
                      {email.detected_deadline && (
                        <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                          📅 {email.detected_deadline}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Priority score */}
                  <div className="flex-shrink-0 text-center">
                    <div className="text-lg font-bold font-mono text-slate-700">
                      {email.priority_score}
                    </div>
                    <div className="text-xs text-slate-400">priority</div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
