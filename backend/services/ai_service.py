from google import genai
from google.genai import types
import os
import json
from typing import List

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

# ─────────────────────────────────────────────────────────────────────────────
# SYSTEM PROMPT — Chat / Q&A Mode
# ─────────────────────────────────────────────────────────────────────────────
CHAT_SYSTEM_PROMPT = """
You are Outlook-AI-Email-Assistant-Tool-DoD — a secure, professional AI assistant embedded inside
a Microsoft Outlook productivity tool used by government contractors.

Your job is to help users quickly understand, triage, and act on their emails.

CORE BEHAVIORS:
- Always be concise, structured, and professional in tone
- Lead with the most important information first
- Never fabricate information — only use what is explicitly in the provided emails
- If an email is ambiguous or incomplete, say so clearly

SECURITY RULES:
- Never repeat Social Security Numbers, passwords, or credentials found in emails
- If you detect content that appears to be classified beyond CUI, respond:
  "This content may require additional handling. Please consult your security officer."
- Do not store, reference, or infer information from previous sessions

CONTEXT:
The user works at a government contracting firm. Emails may reference federal
contracts, task orders, deliverables, and government agencies. Use this context
to better understand importance and urgency. Common roles to recognize:
CO (Contracting Officer), COR (Contracting Officer Representative),
KO (Kontract Officer), PM (Program Manager), COTR, TPOC.

OUTPUT FORMAT — YOU MUST ALWAYS RETURN VALID JSON. NO EXCEPTIONS. NO MARKDOWN.
NO preamble. NO explanation outside the JSON. Return ONLY this structure:

{
  "summary": "Your overall answer or summary in 1-2 sentences",
  "insights": [
    {
      "point": "The specific insight, action item, or finding",
      "source_email_ids": ["email-id-1"],
      "confidence": "high"
    }
  ],
  "unverified": "Anything you could not attribute to a specific email, or empty string"
}

CITATION RULES:
- Every insight MUST reference at least one real source_email_id from the emails provided
- Never fabricate email IDs
- confidence must be exactly: "high", "medium", or "low"
- If nothing is unverified, set "unverified" to ""
"""

# ─────────────────────────────────────────────────────────────────────────────
# SYSTEM PROMPT — Enrichment Mode (Batch Scoring + Tagging)
# ─────────────────────────────────────────────────────────────────────────────
ENRICHMENT_SYSTEM_PROMPT = """
You are an expert email analyst for a US government contracting firm (CACI).
Your job is to analyze a batch of emails and return structured enrichment data for each one.

For EVERY email in the input array, return an enrichment object. Do not skip any.

SCORING CRITERIA — priority_score (1-10):
- 10: Immediate action required, contract/program at risk, from CO/KO/Senior Gov official
- 8-9: Deadline within 48 hours, response explicitly requested by gov stakeholder
- 6-7: Important but not urgent, action needed this week
- 4-5: Informational, FYI, or internal coordination
- 1-3: Newsletter, auto-notification, low-relevance CC

CONTRACT/TASK ORDER DETECTION:
- Detect patterns like: TO-12, T.O. 7, Task Order 12, Contract GS-35F-0001,
  IDIQ, BPA, GWAC, contract numbers (alphanumeric like N00014-24-C-1234),
  PWS, SOW, CDRL, CLIN references
- project_tags: named projects, programs, or initiatives mentioned

SENDER ROLE DETECTION:
- Look for: CO, COR, KO, COTR, TPOC, Program Manager, Director, VP, President,
  Contracting Officer, Government Rep, Agency POC
- If role not identifiable, return "Unknown"

REPLY DETECTION:
- needs_reply = true if: email asks a question, requests a response, contains
  action items directed at the recipient, or is from a government stakeholder
- reply_urgency: "critical" (same day), "high" (24h), "medium" (2-3 days), "low"

DEADLINE DETECTION:
- detected_deadline: if a specific date/deadline is mentioned, return ISO format YYYY-MM-DD
- Return null if no deadline found

OUTPUT: Return ONLY valid JSON. No markdown. No explanation. This exact structure:

{
  "enrichments": [
    {
      "id": "email-id-here",
      "priority_score": 8,
      "priority_reason": "Short 1-sentence reason",
      "contract_tags": ["TO-12", "GS-35F-0001"],
      "project_tags": ["Project Atlas"],
      "needs_reply": true,
      "reply_urgency": "high",
      "sender_role": "Contracting Officer",
      "detected_deadline": "2025-03-15"
    }
  ]
}
"""


def _format_emails_for_enrichment(emails: List[dict]) -> str:
    items = []
    for email in emails:
        body = email.get("body", {}).get("content", email.get("bodyPreview", ""))
        # Strip HTML tags for cleaner AI input
        import re
        body = re.sub(r"<[^>]+>", " ", body)
        body = re.sub(r"\s+", " ", body).strip()[:1500]  # Cap at 1500 chars

        items.append({
            "id": email.get("id"),
            "subject": email.get("subject", ""),
            "from_name": email.get("from", {}).get("emailAddress", {}).get("name", ""),
            "from_address": email.get("from", {}).get("emailAddress", {}).get("address", ""),
            "received": email.get("receivedDateTime", ""),
            "body_preview": body,
        })
    return json.dumps(items, indent=2)


def _format_emails_for_chat(emails: List[dict]) -> str:
    formatted = []
    for i, email in enumerate(emails, 1):
        body = email.get("body", {}).get("content", email.get("bodyPreview", ""))
        import re
        body = re.sub(r"<[^>]+>", " ", body)
        body = re.sub(r"\s+", " ", body).strip()[:2000]

        formatted.append(f"""
--- Email {i} ---
ID: {email.get('id', '')}
From: {email.get('from', {}).get('emailAddress', {}).get('name', 'Unknown')} <{email.get('from', {}).get('emailAddress', {}).get('address', '')}>
Date: {email.get('receivedDateTime', '')}
Subject: {email.get('subject', '(No Subject)')}
Body:
{body}
""")
    return "\n".join(formatted)


async def enrich_emails(emails: List[dict]) -> List[dict]:
    """Score, tag, and flag emails for reply in a single AI call."""
    if not emails:
        return []

    email_data = _format_emails_for_enrichment(emails)
    user_message = f"Analyze and enrich these emails:\n\n{email_data}"

    response = await client.aio.models.generate_content(
        model="gemini-2.5-flash",
        contents=user_message,
        config=types.GenerateContentConfig(
            system_instruction=ENRICHMENT_SYSTEM_PROMPT,
            response_mime_type="application/json",
            temperature=0.0,
        )
    )

    raw = response.text.strip()

    # Strip any accidental markdown fences
    raw = raw.strip()
    if raw.startswith("```"):
        lines = raw.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines[-1].startswith("```"):
            lines = lines[:-1]
        raw = "\n".join(lines).strip()
    
    # Sometimes it wraps in json tag
    if raw.startswith("json\n"):
        raw = raw[5:].strip()

    try:
        # Try to find the first '{' and last '}'
        start_idx = raw.find("{")
        end_idx = raw.rfind("}")
        if start_idx != -1 and end_idx != -1:
            raw = raw[start_idx : end_idx + 1]
            
        result = json.loads(raw)
        return result.get("enrichments", [])
    except Exception as e:
        print(f"JSON Parse Error: {e}\nRaw Output: {raw}")
        # Return empty enrichments on parse failure — don't crash
        return [{"id": e.get("id"), "priority_score": 5, "priority_reason": "Could not analyze",
                 "contract_tags": [], "project_tags": [], "needs_reply": False,
                 "reply_urgency": "low", "sender_role": "Unknown", "detected_deadline": None}
                for e in emails]


async def query_emails(emails: List[dict], user_query: str) -> dict:
    """Answer a user's freeform question about their emails."""
    email_block = _format_emails_for_chat(emails)
    user_message = f"""
<emails>
{email_block}
</emails>

<query>
{user_query}
</query>
"""
    response = await client.aio.models.generate_content(
        model="gemini-2.5-pro",
        contents=user_message,
        config=types.GenerateContentConfig(
            system_instruction=CHAT_SYSTEM_PROMPT,
            response_mime_type="application/json",
            temperature=0.0,
        )
    )

    raw = response.text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {
            "summary": raw,
            "insights": [],
            "unverified": "",
        }
