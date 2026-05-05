<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/8e3a6148-971a-4b5f-a2ff-9d593baf8c8c

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Set Supabase variables in `.env.local`:
   `VITE_SUPABASE_URL=https://seu-projeto.supabase.co`
   `VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica`
4. Run `supabase/schema.sql` in the Supabase SQL editor to create the store tables.
5. Optional: run `supabase/seed.sql` to start with example categories, banners, products and settings.
6. Run the app:
   `npm run dev`
