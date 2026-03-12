from fastapi import APIRouter, Header, HTTPException
from models.schemas import AIQueryRequest
from services.ai_service import query_emails
from services.graph_service import GraphService

router = APIRouter()


@router.post("/query")
async def ai_query(
    body: AIQueryRequest,
    authorization: str = Header(None),
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")

    token = authorization.split(" ")[1]
    graph = GraphService(token)

    # Fetch fresh emails — never persisted
    emails = await graph.get_emails(top=body.top)
    response = await query_emails(emails, body.query)

    # Build email lookup map for citation rendering
    email_map = {
        email["id"]: {
            "id": email["id"],
            "subject": email.get("subject", "(No Subject)"),
            "from_name": email.get("from", {}).get("emailAddress", {}).get("name", "Unknown"),
            "from_address": email.get("from", {}).get("emailAddress", {}).get("address", ""),
            "received_datetime": email.get("receivedDateTime", ""),
            "body_preview": email.get("bodyPreview", ""),
        }
        for email in emails
    }

    return {
        "response": response,
        "email_map": email_map,
        "emails_analyzed": len(emails),
    }
