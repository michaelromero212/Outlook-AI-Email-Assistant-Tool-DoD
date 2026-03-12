import httpx
from typing import Optional, List

# Standard M365 Commercial
GRAPH_BASE = "https://graph.microsoft.com/v1.0"

# GCC High — swap to this if tenant is GCC High:
# GRAPH_BASE = "https://graph.microsoft.us/v1.0"

EMAIL_SELECT_FIELDS = (
    "id,subject,bodyPreview,body,from,receivedDateTime,"
    "isRead,importance,conversationId,hasAttachments,"
    "internetMessageHeaders"
)


class GraphService:
    def __init__(self, access_token: str):
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

    async def get_emails(
        self,
        top: int = 20,
        folder: str = "inbox",
        search: Optional[str] = None,
        filter_query: Optional[str] = None,
    ) -> List[dict]:
        url = f"{GRAPH_BASE}/me/mailFolders/{folder}/messages"
        params = {
            "$select": EMAIL_SELECT_FIELDS,
            "$top": top,
            "$orderby": "receivedDateTime desc",
        }
        if search:
            params["$search"] = f'"{search}"'
        if filter_query:
            params["$filter"] = filter_query

        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.get(url, headers=self.headers, params=params)
            res.raise_for_status()
            return res.json().get("value", [])

    async def get_sent_items(self, top: int = 50) -> List[dict]:
        """Used to detect which received emails have been replied to."""
        url = f"{GRAPH_BASE}/me/mailFolders/sentitems/messages"
        params = {
            "$select": "id,subject,conversationId,sentDateTime",
            "$top": top,
            "$orderby": "sentDateTime desc",
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.get(url, headers=self.headers, params=params)
            res.raise_for_status()
            return res.json().get("value", [])
