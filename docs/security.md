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
- OAuth 2.0 via Google Identity Services (implicit flow)
- Token stored in Zustand persist (localStorage)
- `access_token` held in localStorage during session
- Token expiry tracked via `expires_in` field

### Token Security Warning
The `access_token` is stored in localStorage. This is a known limitation of the GIS implicit flow. In the future this should use the Token Model (token endpoint) with refresh token rotation.

### OpenAI API Key
The `VITE_OPENAI_API_KEY` is embedded in the client bundle. To mitigate:
1. Restrict the key's allowed domains in OpenAI dashboard
2. Do not use a key with billing limits that could cause financial damage
3. Future: proxy through an edge function

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
