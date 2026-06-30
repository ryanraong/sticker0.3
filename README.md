# Sticker Studio

Sticker Studio is a Supabase-backed web app for creating personalized sticker batches. Users enter one recipient description per sticker, generate images, approve the final set, and submit it for printing.

The active app is in `app-sticker`.

## Run Locally

```bash
cd app-sticker
npm install
cp .env.example .env.local
npm run dev
```

Open:

```text
http://localhost:3000
```

## Codespaces

When opened in GitHub Codespaces, the devcontainer installs dependencies and starts the Next.js dev server automatically.

Add these Codespaces secrets before using the Supabase-backed flows:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ADMIN_PASSWORD
OPENAI_API_KEY
```

The current generation flow still uses mock SVG stickers stored in Supabase Storage. Real OpenAI image generation can be added next.
