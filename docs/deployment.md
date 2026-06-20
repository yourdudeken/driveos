# Deployment

## Vercel (Current)

The app is deployed to Vercel as a static SPA.

1. Set environment variables in Vercel dashboard:
   - `VITE_GOOGLE_CLIENT_ID`
   - `VITE_OPENAI_API_KEY`
2. Add OAuth redirect URIs in Google Cloud Console for the production domain
3. Push to main branch (auto-deploy via Vercel Git integration)

`vercel.json` rewrites all paths to `/index.html` for SPA routing.

## Docker

```bash
# Build
docker build -t driveos .

# Run
docker run -p 80:80 \
  -e VITE_GOOGLE_CLIENT_ID=your-client-id \
  -e VITE_OPENAI_API_KEY=your-key \
  driveos
```

## Docker Compose

```bash
cp .env.example .env
# Edit .env with your credentials
docker compose up
```

## Nginx

The `nginx.conf` serves the built SPA with:
- SPA routing (all paths → `/index.html`)
- Security headers (CSP, HSTS, X-Frame-Options, etc.)
- Gzip compression for JS, CSS, JSON, SVG

## CI/CD

See `.github/workflows/ci.yml`:
1. `lint-and-typecheck` — ESLint + tsc
2. `build` — production build
3. `docker` — publish image to GitHub Container Registry (main branch only)
