import { useMemo, useState } from "react";
import { EnrichedEmail } from "../hooks/useEnrichedEmails";

interface Props {
  emails: EnrichedEmail[];
  onSelectEmail: (email: EnrichedEmail) => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export const ContractTagView = ({ emails, onSelectEmail }: Props) => {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [tagType, setTagType] = useState<"contract" | "project">("contract");

  // Build tag → email mapping
  const { contractMap, projectMap, allContractTags, allProjectTags } =
    useMemo(() => {
      const contractMap: Record<string, EnrichedEmail[]> = {};
      const projectMap: Record<string, EnrichedEmail[]> = {};

      emails.forEach((email) => {
        email.contract_tags.forEach((tag) => {
          if (!contractMap[tag]) contractMap[tag] = [];
          contractMap[tag].push(email);
        });
        email.project_tags.forEach((tag) => {
          if (!projectMap[tag]) projectMap[tag] = [];
          projectMap[tag].push(email);
        });
      });

      const allContractTags = Object.keys(contractMap).sort();
      const allProjectTags = Object.keys(projectMap).sort();

      return { contractMap, projectMap, allContractTags, allProjectTags };
    }, [emails]);

  const activeMap = tagType === "contract" ? contractMap : projectMap;
  const activeTags = tagType === "contract" ? allContractTags : allProjectTags;
  const filteredEmails = selectedTag ? activeMap[selectedTag] ?? [] : [];

  // Count emails with no tags at all
  const untaggedCount = emails.filter(
    (e) => e.contract_tags.length === 0 && e.project_tags.length === 0
  ).length;

  return (
    <div className="flex h-full gap-4">
      {/* Left: Tag list */}
      <div className="w-56 flex-shrink-0 flex flex-col">
        {/* Toggle */}
        <div className="flex rounded-lg border border-slate-200 overflow-hidden mb-3">
          <button
            onClick={() => {
              setTagType("contract");
              setSelectedTag(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold transition-colors ${
              tagType === "contract"
                ? "bg-indigo-600 text-white"
                : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            Contracts
          </button>
          <button
            onClick={() => {
              setTagType("project");
              setSelectedTag(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold transition-colors ${
              tagType === "project"
                ? "bg-emerald-600 text-white"
                : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            Projects
          </button>
        </div>

        {/* Tag pills */}
        <div className="flex-1 overflow-y-auto space-y-1">
          {activeTags.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">
              No {tagType === "contract" ? "contract" : "project"} tags detected
            </p>
          ) : (
            activeTags.map((tag) => {
              const count = activeMap[tag]?.length ?? 0;
              const isSelected = selectedTag === tag;
              const colorClass =
                tagType === "contract"
                  ? isSelected
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                  : isSelected
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100";

              return (
                <button
                  key={tag}
                  onClick={() =>
                    setSelectedTag(isSelected ? null : tag)
                  }
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm font-mono font-medium transition-colors ${colorClass}`}
                >
                  <span className="truncate">{tag}</span>
                  <span
                    className={`ml-2 flex-shrink-0 text-xs rounded-full w-5 h-5 flex items-center justify-center ${
                      isSelected ? "bg-white/20" : "bg-white/60"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Untagged count */}
        {untaggedCount > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <p className="text-xs text-slate-400 text-center">
              {untaggedCount} email{untaggedCount !== 1 ? "s" : ""} untagged
            </p>
          </div>
        )}
      </div>

      {/* Right: Email list for selected tag */}
      <div className="flex-1 overflow-y-auto">
        {!selectedTag ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-4xl mb-3">🏷️</div>
            <p className="text-slate-500 text-sm font-medium">
              Select a tag to view related emails
            </p>
            <p className="text-slate-400 text-xs mt-1">
              {allContractTags.length} contract tag
              {allContractTags.length !== 1 ? "s" : ""} ·{" "}
              {allProjectTags.length} project tag
              {allProjectTags.length !== 1 ? "s" : ""} detected
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <span
                className={`text-sm font-mono font-bold px-2 py-0.5 rounded ${
                  tagType === "contract"
                    ? "bg-indigo-100 text-indigo-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {selectedTag}
              </span>
              <span className="text-xs text-slate-500">
                {filteredEmails.length} email
                {filteredEmails.length !== 1 ? "s" : ""}
              </span>
            </div>

            {filteredEmails
              .sort((a, b) => b.priority_score - a.priority_score)
              .map((email) => (
                <button
                  key={email.id}
                  onClick={() => onSelectEmail(email)}
                  className="w-full text-left rounded-xl border border-slate-200 bg-white p-3 hover:border-slate-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span
                      className={`text-sm font-semibold truncate ${
                        !email.is_read ? "text-slate-900" : "text-slate-600"
                      }`}
                    >
                      {email.subject}
                    </span>
                    <span className="flex-shrink-0 text-xs font-bold text-slate-500 bg-slate-100 rounded px-1.5">
                      P{email.priority_score}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center justify-between">
                    <span>
                      {email.from_name}
                      {email.sender_role !== "Unknown" && (
                        <span className="ml-1 text-blue-600">
                          · {email.sender_role}
                        </span>
                      )}
                    </span>
                    <span>{formatDate(email.received_datetime)}</span>
                  </div>
                  {email.detected_deadline && (
                    <span className="mt-1.5 inline-block text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                      📅 Due {email.detected_deadline}
                    </span>
                  )}
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};
