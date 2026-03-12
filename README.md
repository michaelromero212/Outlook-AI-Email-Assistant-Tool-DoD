# Outlook-AI-Email-Assistant-Tool-DoD

**Outlook-AI-Email-Assistant-Tool-DoD** is an AI-powered email analysis tool tailored for government contractors and the Department of Defense (DoD) ecosystem. It securely integrates with Microsoft Graph API to categorize, prioritize, and enrich incoming emails, allowing professionals to quickly identify critical communications, track contract deliverables, and interact with an intelligent AI assistant.

Built with **FastAPI**, **React**, **Microsoft Graph API**, and **Gemini/Claude AI**.

---

## 📸 Gallery

### Priority Dashboard
*AI-scored priority inbox sorting emails by urgency.*
<img src="screenshots/Screenshot%202026-03-04%20at%202.34.48%E2%80%AFPM.jpg" width="100%" />

### Contract Tags View 
*Auto-detected contract numbers (TO-12, GS-35F) and project tags.*
<img src="screenshots/Screenshot%202026-03-04%20at%202.35.01%E2%80%AFPM.jpg" width="100%" />

### Reply Queue
*Surfaces emails waiting on a response, ranked by sender role.*
<img src="screenshots/Screenshot%202026-03-04%20at%202.35.22%E2%80%AFPM.jpg" width="100%" />

### Email Detail Panel
*Detailed view of email contents and AI-generated insights.*
<img src="screenshots/Screenshot%202026-03-04%20at%201.08.55%E2%80%AFPM.jpg" width="100%" />

### AI Assistant Chat
*Freeform Q&A over your inbox with cited sources.*
<img src="screenshots/Screenshot%202026-03-04%20at%202.36.19%E2%80%AFPM.jpg" width="100%" />

### Login Screen
*Secure Microsoft 365 OAuth authentication.*
<img src="screenshots/Screenshot%202026-03-04%20at%202.37.07%E2%80%AFPM.jpg" width="100%" />

*(Additional views are available in the `screenshots/` directory).*

---

## Features

- **Priority Inbox** — AI scores every email 1-10 with reason, sorted by urgency
- **Contracts & Projects** — Auto-detects contract numbers (TO-12, GS-35F, etc.) and project names
- **Reply Queue** — Surfaces emails waiting on a response, ranked by sender importance
- **AI Assistant** — Freeform Q&A over your inbox with cited sources

---

## Prerequisites

- Node.js 18+
- Python 3.11+
- An Azure App Registration with `Mail.Read` and `User.Read` permissions
- An Anthropic API key (or Azure OpenAI)

---

## Azure App Registration Setup

1. Go to [portal.azure.com](https://portal.azure.com) → Azure Active Directory → App Registrations → New Registration
2. Name: `Outlook-AI-Email-Assistant-Tool-DoD`
3. Redirect URI: `http://localhost:5173` (Single Page Application)
4. Under **API Permissions**, add:
   - Microsoft Graph → Delegated → `User.Read`
   - Microsoft Graph → Delegated → `Mail.Read`
   - Microsoft Graph → Delegated → `Mail.ReadBasic`
5. Copy the **Application (client) ID** and **Directory (tenant) ID**

> **GCC High tenants**: Change the authority URL in `msalConfig.ts` to `https://login.microsoftonline.us/{tenantId}` and `GRAPH_BASE` in `graph_service.py` to `https://graph.microsoft.us/v1.0`

---

## Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create your .env file
cp ../.env.example .env
# Edit .env with your ANTHROPIC_API_KEY

uvicorn main:app --reload --port 8000
```

---

## Frontend Setup

```bash
cd frontend
npm install

# Create your .env.local file
cp ../.env.example .env.local
# Edit .env.local with your Azure credentials

npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Project Structure

```
caci-mail-intelligence/
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── requirements.txt
│   ├── models/
│   │   └── schemas.py           # Pydantic models
│   ├── routes/
│   │   ├── emails.py            # Email fetch + enrichment route
│   │   └── ai.py                # AI chat route
│   └── services/
│       ├── graph_service.py     # Microsoft Graph API client
│       └── ai_service.py        # Claude enrichment + chat prompts
└── frontend/
    └── src/
        ├── App.tsx              # Root layout, auth, tab routing
        ├── hooks/
        │   ├── useAuth.ts       # MSAL authentication hook
        │   └── useEnrichedEmails.ts
        ├── lib/
        │   └── msalConfig.ts    # Azure AD + Graph config
        └── components/
            ├── PriorityDashboard.tsx
            ├── ContractTagView.tsx
            ├── ReplyQueue.tsx
            ├── ChatPanel.tsx
            └── EmailDetailPanel.tsx
```

---

## Security Notes

- Email data is **never stored** — fetched fresh per request, analyzed in memory, discarded
- Authentication is user-delegated (each user only sees their own emails)
- All API calls are authenticated with short-lived OAuth tokens
- For production: restrict CORS origins in `backend/main.py`
- For GCC High: update both the MSAL authority URL and Graph API base URL
