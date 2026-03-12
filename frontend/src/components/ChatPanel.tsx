import { useState, useRef, useEffect } from "react";
import { API_BASE } from "../lib/msalConfig";

interface EmailMeta {
  id: string;
  subject: string;
  from_name: string;
  from_address: string;
  received_datetime: string;
  body_preview: string;
}

interface Insight {
  point: string;
  source_email_ids: string[];
  confidence: "high" | "medium" | "low";
}

interface AIResponse {
  summary: string;
  insights: Insight[];
  unverified?: string;
}

interface Message {
  role: "user" | "assistant";
  content?: string;
  structured?: AIResponse;
  emailMap?: Record<string, EmailMeta>;
  emailsAnalyzed?: number;
}

const SUGGESTED_QUERIES = [
  "Summarize my most important emails",
  "What action items do I have?",
  "Any emails from government stakeholders?",
  "What deadlines are coming up?",
  "Who needs a response from me?",
];

const ConfidenceBadge = ({ level }: { level: string }) => {
  const colors: Record<string, string> = {
    high: "bg-green-100 text-green-700",
    medium: "bg-yellow-100 text-yellow-700",
    low: "bg-red-100 text-red-700",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[level] ?? colors.low}`}>
      {level}
    </span>
  );
};

const CitationCard = ({ email }: { email: EmailMeta }) => (
  <div className="border border-blue-200 bg-blue-50 rounded-lg p-2.5 mt-2 text-xs">
    <div className="font-semibold text-blue-800 truncate">📧 {email.subject}</div>
    <div className="text-blue-600 mt-0.5">
      {email.from_name} · {new Date(email.received_datetime).toLocaleDateString()}
    </div>
    <div className="text-slate-500 mt-1 line-clamp-2">{email.body_preview}</div>
  </div>
);

const AssistantMessage = ({
  structured,
  emailMap,
  emailsAnalyzed,
}: {
  structured: AIResponse;
  emailMap: Record<string, EmailMeta>;
  emailsAnalyzed?: number;
}) => {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const toggle = (i: number) =>
    setExpanded((prev) => ({ ...prev, [i]: !prev[i] }));

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-800 space-y-3 max-w-[92%]">
      {/* Summary */}
      <p className="font-medium text-slate-900 leading-relaxed">{structured.summary}</p>

      {/* Insights */}
      {structured.insights.length > 0 && (
        <div className="space-y-2.5 pt-1">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Key Insights
          </p>
          {structured.insights.map((insight, i) => (
            <div key={i} className="border-l-2 border-blue-400 pl-3">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-slate-700">{insight.point}</p>
                <ConfidenceBadge level={insight.confidence} />
              </div>

              <div className="flex flex-wrap gap-1">
                {insight.source_email_ids.map((id) => {
                  const email = emailMap[id];
                  if (!email) return null;
                  return (
                    <button
                      key={id}
                      onClick={() => toggle(i)}
                      className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-0.5 rounded-full transition-colors font-medium"
                    >
                      📎{" "}
                      {email.subject.length > 35
                        ? email.subject.slice(0, 35) + "…"
                        : email.subject}
                    </button>
                  );
                })}
              </div>

              {expanded[i] &&
                insight.source_email_ids.map((id) => {
                  const email = emailMap[id];
                  return email ? <CitationCard key={id} email={email} /> : null;
                })}
            </div>
          ))}
        </div>
      )}

      {/* Unverified warning */}
      {structured.unverified && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-800">
          ⚠️ <strong>Note:</strong> {structured.unverified}
        </div>
      )}

      {/* Footer */}
      {emailsAnalyzed && (
        <p className="text-xs text-slate-400 pt-1 border-t border-slate-100">
          Analyzed {emailsAnalyzed} emails · No data retained
        </p>
      )}
    </div>
  );
};

interface Props {
  accessToken: string | null;
}

export const ChatPanel = ({ accessToken }: Props) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendQuery = async (queryText?: string) => {
    const text = queryText ?? input;
    if (!text.trim() || !accessToken) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/ai/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ query: text, top: 20 }),
      });

      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          structured: data.response,
          emailMap: data.email_map,
          emailsAnalyzed: data.emails_analyzed,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Something went wrong. Please check your connection and try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Message history */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-2">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="text-4xl mb-3">💬</div>
            <p className="text-slate-500 font-medium mb-4">
              Ask anything about your inbox
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTED_QUERIES.map((q) => (
                <button
                  key={q}
                  onClick={() => sendQuery(q)}
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-full transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) =>
          msg.role === "user" ? (
            <div
              key={i}
              className="bg-blue-600 text-white text-sm p-3 rounded-xl max-w-[75%] ml-auto"
            >
              {msg.content}
            </div>
          ) : msg.structured ? (
            <AssistantMessage
              key={i}
              structured={msg.structured}
              emailMap={msg.emailMap!}
              emailsAnalyzed={msg.emailsAnalyzed}
            />
          ) : (
            <div
              key={i}
              className="bg-white border border-slate-200 p-3 rounded-xl text-sm text-slate-700 max-w-[92%]"
            >
              {msg.content}
            </div>
          )
        )}

        {loading && (
          <div className="bg-white border border-slate-200 p-3 rounded-xl text-sm text-slate-400 w-fit">
            <span className="inline-flex gap-1">
              <span className="animate-bounce" style={{ animationDelay: "0ms" }}>●</span>
              <span className="animate-bounce" style={{ animationDelay: "150ms" }}>●</span>
              <span className="animate-bounce" style={{ animationDelay: "300ms" }}>●</span>
            </span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input row */}
      <div className="flex gap-2 pt-3 border-t border-slate-200">
        <input
          className="flex-1 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          placeholder="Ask about your emails..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendQuery()}
          disabled={loading}
        />
        <button
          onClick={() => sendQuery()}
          disabled={loading || !input.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm px-4 py-2.5 rounded-xl transition-colors font-medium"
        >
          Send
        </button>
      </div>
    </div>
  );
};
