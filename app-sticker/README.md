# Sticker Studio App

This is the Supabase-backed version of the sticker MVP.

## Setup

1. Run the schema in Supabase:

   ```text
   app-sticker/supabase/schema.sql
   ```

2. Copy `.env.example` to `.env.local`.

3. Fill in:

   ```env
   SUPABASE_URL=...
   SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ADMIN_PASSWORD=...
   OPENAI_API_KEY=...
   ```

4. Install dependencies:

   ```bash
   npm install
   ```

5. Start the app:

   ```bash
   npm run dev
   ```

6. Open:

   ```text
   http://localhost:3000
   ```

## Current Backend-Connected Features

- Create project in Supabase
- Load project by private token
- Save project settings
- Add, edit, and delete recipients
- Mock-generate sticker SVGs into Supabase Storage
- Regenerate one recipient from Generate or Review
- Approve generated images
- Submit project for printing
- Admin project list protected by `ADMIN_PASSWORD`
- Admin download of approved images and mapping CSV

## Next Feature

Replace mock SVG generation inside `lib/supabase.ts` with OpenAI image generation, while keeping the same storage and approval flow.
