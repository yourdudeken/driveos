# Security

## Current Posture

### CSP
Content-Security-Policy is enforced via `<meta>` tag and nginx headers:
- Scripts: `'self'`, Google Identity Services, Google API client
- Styles: `'self'`, `'unsafe-inline'`, Google Fonts
- Fonts: `'self'`, Google Fonts
- Connections: Google APIs, OpenAI API
- Images: `self`, `data:`, `blob:`, `https:`
- Frames: Google accounts (OAuth flow)
- Objects, base-uri: restricted

### Authentication
- **OAuth 2.0 via Google Identity Services (implicit flow)**: Handled entirely on the client.
- **Incremental Scopes**:
  - Starts with the narrow `https://www.googleapis.com/auth/drive.file` scope, giving the app permission to access only the folders and files it creates.
  - Dynamically prompts for permission elevation to `https://www.googleapis.com/auth/drive` when the user joins a collaborative board via invitation link (since board folders are created by other users).
- **Session Persistence**: Tokens are stored in Zustand's persisted state (localStorage), including tracked `expires_in` timestamps for automatic re-auth checks.

### Token Security Warning
The `access_token` is stored in localStorage. This is a known security trade-off of the GIS implicit flow. Future revisions will transition to the Authorization Code Flow (Token Model) with backend refresh token rotation.

### OpenAI API Key
The `VITE_OPENAI_API_KEY` is embedded in the client bundle. To mitigate:
1. Restrict the key's allowed domains in OpenAI dashboard.
2. Do not use a key with billing limits that could cause financial damage.
3. Future: proxy through an edge function.

## Hardening Checklist

| Item | Status |
|------|--------|
| CSP meta tag | ✅ |
| CSP nginx headers | ✅ |
| X-Frame-Options | ✅ (nginx) |
| X-Content-Type-Options | ✅ (nginx) |
| Strict transport security | ⬜ (handled by Vercel/Cloudflare) |
| Permissions-Policy | ✅ (nginx) |
| Referrer-Policy | ✅ (nginx) |
| Input sanitization (DOMPurify) | ⬜ (add for user-rendered content) |
| Rate limiting | ⬜ (requires edge proxy) |
| Token refresh | Partial (re-auth prompts) |
| E2E encryption | ⬜ (future) |
