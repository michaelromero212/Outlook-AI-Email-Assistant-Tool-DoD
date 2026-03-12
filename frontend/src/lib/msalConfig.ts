import { Configuration, PopupRequest } from "@azure/msal-browser";

export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}`,
    redirectUri: import.meta.env.VITE_REDIRECT_URI || "http://localhost:5173",
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

export const loginRequest: PopupRequest = {
  scopes: ["User.Read", "Mail.Read", "Mail.ReadBasic"],
};

// Standard M365 Commercial
export const GRAPH_ENDPOINT = "https://graph.microsoft.com/v1.0";
// GCC High: export const GRAPH_ENDPOINT = "https://graph.microsoft.us/v1.0";

export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
