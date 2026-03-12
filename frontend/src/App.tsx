import { useState, useEffect } from "react";
import { MsalProvider, useIsAuthenticated } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig } from "./lib/msalConfig";
import { useAuth } from "./hooks/useAuth";
import { useEnrichedEmails, EnrichedEmail } from "./hooks/useEnrichedEmails";
import { PriorityDashboard } from "./components/PriorityDashboard";
import { ContractTagView } from "./components/ContractTagView";
import { ReplyQueue } from "./components/ReplyQueue";
import { ChatPanel } from "./components/ChatPanel";
import { EmailDetailPanel } from "./components/EmailDetailPanel";

const msalInstance = new PublicClientApplication(msalConfig);

type Tab = "priority" | "contracts" | "replies" | "chat";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "priority", label: "Priority Inbox", icon: "📊" },
  { id: "contracts", label: "Contracts & Projects", icon: "🏷️" },
  { id: "replies", label: "Reply Queue", icon: "↩" },
  { id: "chat", label: "AI Assistant", icon: "💬" },
];

const MainApp = () => {
  const { user, accessToken, login, logout, loading: authLoading, isAuthenticated } = useAuth();
  const { emails, loading: emailsLoading, error, enrichedAt, fetchEnrichedEmails } =
    useEnrichedEmails(accessToken);
  const [activeTab, setActiveTab] = useState<Tab>("priority");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

  const currentEmail = emails.find((e) => e.id === selectedEmailId) || null;

  // Auto-fetch enriched emails once authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchEnrichedEmails(20);
    }
  }, [isAuthenticated]);

  // Counts for tab badges
  const replyCount = emails.filter((e) => e.needs_reply && !e.already_replied).length;
  const criticalCount = emails.filter((e) => e.priority_score >= 9).length;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full mx-4 text-center">
          {/* Logo area */}
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg">
            <span className="text-white text-2xl">✉</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            Outlook-AI-Email-Assistant-Tool-DoD
          </h1>
          <p className="text-slate-500 text-sm mb-6">
            AI-powered email analysis for government contractors
          </p>

          <div className="space-y-3 text-left bg-slate-50 rounded-xl p-4 mb-6 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span>🔐</span>
              <span>Authenticates via your Microsoft 365 account</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🚫</span>
              <span>No email data is stored or retained</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🏛️</span>
              <span>Designed for government contractor workflows</span>
            </div>
          </div>

          <button
            onClick={login}
            disabled={authLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {authLoading ? (
              "Connecting..."
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 21 21" fill="none">
                  <rect width="10" height="10" fill="#F25022" />
                  <rect x="11" width="10" height="10" fill="#7FBA00" />
                  <rect y="11" width="10" height="10" fill="#00A4EF" />
                  <rect x="11" y="11" width="10" height="10" fill="#FFB900" />
                </svg>
                Sign in with Microsoft 365
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top navbar */}
      <header className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-sm font-bold">
            ✉
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight">Outlook-AI-Email-Assistant-Tool-DoD</span>
            {enrichedAt && (
              <span className="ml-2 text-xs text-slate-400">
                · Updated {new Date(enrichedAt).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchEnrichedEmails(20)}
            disabled={emailsLoading}
            className="text-xs text-slate-400 hover:text-white transition-colors disabled:opacity-40 flex items-center gap-1"
          >
            {emailsLoading ? (
              <span className="animate-spin">↻</span>
            ) : (
              <span>↻</span>
            )}{" "}
            Refresh
          </button>

          <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-1.5">
            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">
              {user?.name?.charAt(0) ?? "U"}
            </div>
            <span className="text-xs text-slate-300">{user?.username}</span>
          </div>

          <button
            onClick={logout}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-2 text-sm text-red-700 flex items-center gap-2">
          ⚠️ {error}
        </div>
      )}

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden" style={{ height: "calc(100vh - 57px)" }}>
        {/* Sidebar tabs */}
        <aside className="w-52 bg-white border-r border-slate-200 flex flex-col py-3 px-2 flex-shrink-0">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const badge =
              tab.id === "replies" && replyCount > 0
                ? replyCount
                : tab.id === "priority" && criticalCount > 0
                  ? criticalCount
                  : null;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-1 relative ${isActive
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-slate-600 hover:bg-slate-100"
                  }`}
              >
                <span>{tab.icon}</span>
                <span className="flex-1 text-left">{tab.label}</span>
                {badge !== null && (
                  <span
                    className={`text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold flex-shrink-0 ${isActive
                        ? "bg-white/20 text-white"
                        : tab.id === "replies"
                          ? "bg-amber-500 text-white"
                          : "bg-red-500 text-white"
                      }`}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Email count */}
          {emails.length > 0 && (
            <div className="mt-auto pt-3 border-t border-slate-200 px-3">
              <p className="text-xs text-slate-400">
                {emails.length} emails analyzed
              </p>
              <div className="mt-1.5 w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${Math.min(emails.length / 50 * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </aside>

        {/* Main content area */}
        <main className="flex-1 flex overflow-hidden">
          {/* Left: active tab view */}
          <div
            className={`overflow-hidden flex flex-col p-5 ${activeTab === "chat" ? "flex-1" : "flex-1 max-w-2xl"
              }`}
          >
            <h2 className="font-bold text-slate-800 text-lg mb-4">
              {TABS.find((t) => t.id === activeTab)?.icon}{" "}
              {TABS.find((t) => t.id === activeTab)?.label}
            </h2>

            <div className="flex-1 overflow-hidden">
              {emailsLoading && emails.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <div className="text-4xl mb-3 animate-pulse">⚙️</div>
                  <p className="font-medium">Fetching and analyzing emails...</p>
                  <p className="text-xs mt-1">This may take a moment</p>
                </div>
              ) : (
                <>
                  {activeTab === "priority" && (
                    <PriorityDashboard
                      emails={emails}
                      onSelectEmail={(e) => setSelectedEmailId(e.id)}
                      selectedEmailId={selectedEmailId}
                    />
                  )}
                  {activeTab === "contracts" && (
                    <ContractTagView
                      emails={emails}
                      onSelectEmail={(e) => setSelectedEmailId(e.id)}
                    />
                  )}
                  {activeTab === "replies" && (
                    <ReplyQueue
                      emails={emails}
                      onSelectEmail={(e) => setSelectedEmailId(e.id)}
                    />
                  )}
                  {activeTab === "chat" && (
                    <ChatPanel accessToken={accessToken} />
                  )}
                </>
              )}
            </div>
          </div>

          {/* Right: Email detail panel (shown for non-chat tabs) */}
          {activeTab !== "chat" && (
            <div className="flex-1 p-5 overflow-hidden">
              <EmailDetailPanel
                email={currentEmail}
                onClose={() => setSelectedEmailId(null)}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <MsalProvider instance={msalInstance}>
      <MainApp />
    </MsalProvider>
  );
}
