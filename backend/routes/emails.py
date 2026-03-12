from fastapi import APIRouter, Header, HTTPException, Query
from services.graph_service import GraphService
from services.ai_service import enrich_emails
from datetime import datetime, timezone, timedelta

router = APIRouter()


def _extract_token(authorization: str) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    return authorization.split(" ")[1]


def _build_email_meta(email: dict) -> dict:
    """Flatten a Graph API email object into a clean dict."""
    return {
        "id": email.get("id"),
        "subject": email.get("subject", "(No Subject)"),
        "from_name": email.get("from", {}).get("emailAddress", {}).get("name", "Unknown"),
        "from_address": email.get("from", {}).get("emailAddress", {}).get("address", ""),
        "received_datetime": email.get("receivedDateTime", ""),
        "body_preview": email.get("bodyPreview", ""),
        "body_content": email.get("body", {}).get("content", ""),
        "is_read": email.get("isRead", False),
        "importance": email.get("importance", "normal"),
        "conversation_id": email.get("conversationId", ""),
        "has_attachments": email.get("hasAttachments", False),
    }


@router.get("/")
async def get_emails(
    top: int = Query(default=20, le=50),
    folder: str = "inbox",
    search: str = None,
    authorization: str = Header(None),
):
    token = _extract_token(authorization)
    graph = GraphService(token)
    raw_emails = await graph.get_emails(top=top, folder=folder, search=search)
    return {
        "emails": [_build_email_meta(e) for e in raw_emails],
        "count": len(raw_emails),
    }


@router.get("/enriched")
async def get_enriched_emails(
    top: int = Query(default=20, le=50),
    authorization: str = Header(None),
):
    """
    Fetch emails from inbox AND enrich them with:
    - Priority score (1-10)
    - Contract / Task Order tags
    - Reply-needed flag + urgency
    - Sender role detection
    - Deadline detection
    Also cross-references sent items to mark emails already replied to.
    """
    token = _extract_token(authorization)
    graph = GraphService(token)

    # Fetch inbox and sent items concurrently
    import asyncio
    inbox_emails, sent_emails = await asyncio.gather(
        graph.get_emails(top=top, folder="inbox"),
        graph.get_sent_items(top=50),
    )

    # Build a set of conversation IDs that have been replied to
    replied_conversation_ids = {e.get("conversationId") for e in sent_emails if e.get("conversationId")}

    # Run AI enrichment on inbox emails
    enrichments = await enrich_emails(inbox_emails)
    enrichment_map = {e["id"]: e for e in enrichments}

    # Calculate hours since received for reply queue
    now = datetime.now(timezone.utc)

    combined = []
    for email in inbox_emails:
        meta = _build_email_meta(email)
        enrichment = enrichment_map.get(email.get("id"), {})

        # Check if this conversation has been replied to
        already_replied = email.get("conversationId") in replied_conversation_ids

        # Hours since email was received
        try:
            received = datetime.fromisoformat(email.get("receivedDateTime", "").replace("Z", "+00:00"))
            hours_since_received = (now - received).total_seconds() / 3600
        except Exception:
            hours_since_received = 0

        combined.append({
            **meta,
            "priority_score": enrichment.get("priority_score", 5),
            "priority_reason": enrichment.get("priority_reason", ""),
            "contract_tags": enrichment.get("contract_tags", []),
            "project_tags": enrichment.get("project_tags", []),
            "needs_reply": enrichment.get("needs_reply", False) and not already_replied,
            "already_replied": already_replied,
            "reply_urgency": enrichment.get("reply_urgency", "low"),
            "sender_role": enrichment.get("sender_role", "Unknown"),
            "detected_deadline": enrichment.get("detected_deadline"),
            "hours_since_received": round(hours_since_received, 1),
        })

    return {
        "emails": combined,
        "count": len(combined),
        "enriched_at": now.isoformat(),
    }
