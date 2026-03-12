import { EnrichedEmail } from "../hooks/useEnrichedEmails";

interface Props {
  email: EnrichedEmail | null;
  onClose: () => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const URGENCY_BADGE: Record<string, string> = {
  critical: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-slate-100 text-slate-600",
};

const SCORE_COLOR = (score: number) => {
  if (score >= 9) return "text-red-600";
  if (score >= 7) return "text-orange-500";
  if (score >= 4) return "text-yellow-600";
  return "text-slate-400";
};

export const EmailDetailPanel = ({ email, onClose }: Props) => {
  if (!email) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
        <div className="text-center">
          <div className="text-4xl mb-2">📭</div>
          <p>Select an email to view details</p>
        </div>
      </div>
    );
  }

  // Strip HTML tags for display
  const bodyText = email.body_content
    ? email.body_content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    : email.body_preview;

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-slate-200">
        <div className="flex-1 min-w-0 pr-3">
          <h2 className="font-bold text-slate-900 text-base leading-tight mb-1">
            {email.subject}
          </h2>
          <div className="text-xs text-slate-500">
            <span className="font-medium text-slate-700">{email.from_name}</span>
            {email.sender_role !== "Unknown" && (
              <span className="ml-1 text-blue-600 font-medium">
                · {email.sender_role}
              </span>
            )}
            <span className="ml-1">· {email.from_address}</span>
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            {formatDate(email.received_datetime)}
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 text-slate-400 hover:text-slate-600 text-xl leading-none"
        >
          ✕
        </button>
      </div>

      {/* AI Enrichment Summary */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex flex-wrap gap-2 items-center">
          {/* Priority score */}
          <span className={`font-bold text-sm ${SCORE_COLOR(email.priority_score)}`}>
            Priority {email.priority_score}/10
          </span>
          <span className="text-slate-300">·</span>
          <span className="text-xs text-slate-600 italic">{email.priority_reason}</span>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-2">
          {email.needs_reply && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${URGENCY_BADGE[email.reply_urgency]}`}>
              ↩ Reply needed · {email.reply_urgency}
            </span>
          )}
          {email.already_replied && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">
              ✓ Replied
            </span>
          )}
          {email.contract_tags.map((tag) => (
            <span key={tag} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-mono font-medium">
              {tag}
            </span>
          ))}
          {email.project_tags.map((tag) => (
            <span key={tag} className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-medium">
              {tag}
            </span>
          ))}
          {email.detected_deadline && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">
              📅 Due {email.detected_deadline}
            </span>
          )}
          {email.has_attachments && (
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
              📎 Attachment
            </span>
          )}
        </div>
      </div>

      {/* Email body */}
      <div className="flex-1 overflow-y-auto p-4">
        {email.body_content ? (
          <div
            className="text-sm text-slate-700 leading-relaxed prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: email.body_content }}
          />
        ) : (
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {email.body_preview}
          </p>
        )}
      </div>
    </div>
  );
};
