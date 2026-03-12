import { useState, useCallback } from "react";
import { API_BASE } from "../lib/msalConfig";

export interface EnrichedEmail {
  id: string;
  subject: string;
  from_name: string;
  from_address: string;
  received_datetime: string;
  body_preview: string;
  body_content: string;
  is_read: boolean;
  importance: string;
  conversation_id: string;
  has_attachments: boolean;
  // Enrichment
  priority_score: number;
  priority_reason: string;
  contract_tags: string[];
  project_tags: string[];
  needs_reply: boolean;
  already_replied: boolean;
  reply_urgency: "low" | "medium" | "high" | "critical";
  sender_role: string;
  detected_deadline: string | null;
  hours_since_received: number;
}

export const useEnrichedEmails = (accessToken: string | null) => {
  const [emails, setEmails] = useState<EnrichedEmail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enrichedAt, setEnrichedAt] = useState<string | null>(null);

  const fetchEnrichedEmails = useCallback(
    async (top: number = 20) => {
      if (!accessToken) return;
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `${API_BASE}/api/emails/enriched?top=${top}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (!res.ok) throw new Error(`API error: ${res.statusText}`);
        const data = await res.json();
        setEmails(data.emails);
        setEnrichedAt(data.enriched_at);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [accessToken]
  );

  return { emails, loading, error, enrichedAt, fetchEnrichedEmails };
};
