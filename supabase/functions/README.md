# Supabase Edge Functions

## extract-location

Extracts geographic locations from URLs (Instagram, TikTok, YouTube, news articles, etc.) using Apify for content scraping and Claude AI for location extraction.

### Supported Platforms

- **Instagram** - Posts, Reels (via Apify Instagram Post Scraper)
- **TikTok** - Videos (via Apify TikTok Scraper)
- **YouTube** - Videos (via oEmbed API)
- **General websites** - News articles, blogs, etc. (via Apify RAG Web Browser)

### Deployment

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link your project**:
   ```bash
   cd pinworld
   supabase link --project-ref sycmofddnmlxqdfnsrzg
   ```

4. **Set the required secrets**:

   **Claude API Key** (required for AI analysis):
   ```bash
   supabase secrets set CLAUDE_API_KEY=sk-ant-api03-your-key-here
   ```
   Get your key from: https://console.anthropic.com/

   **Apify API Token** (required for Instagram/TikTok/web scraping):
   ```bash
   supabase secrets set APIFY_API_TOKEN=apify_api_your-token-here
   ```
   Get your token from: https://console.apify.com/account/integrations

5. **Deploy the function**:
   ```bash
   supabase functions deploy extract-location
   ```

### How it works

1. User pastes a URL in the app
2. Frontend calls the Edge Function via Supabase client
3. Edge Function detects the URL type (Instagram, TikTok, YouTube, or other)
4. For Instagram/TikTok: Uses Apify actors to scrape the content reliably
5. For YouTube: Uses the oEmbed API
6. For other URLs: Uses Apify RAG Web Browser (with basic fetch as fallback)
7. Sends extracted content to Claude to identify the location
8. Returns `{ location_name, title, confidence }` to the frontend

### Cost Estimates

- **Supabase Edge Functions**: 500K invocations/month free
- **Claude API**: ~$0.003 per extraction (claude-sonnet-4-20250514)
- **Apify**:
  - Instagram Post Scraper: ~$0.003 per post (free tier available)
  - TikTok Scraper: ~$0.004 per video (free tier available)
  - RAG Web Browser: ~$0.002 per page (free tier available)

### Security

- All API keys are stored server-side as Supabase secrets
- Never exposed to the browser
- CORS headers allow requests from your app

### Troubleshooting

**Instagram/TikTok not working?**
- Verify APIFY_API_TOKEN is set: `supabase secrets list`
- Check Apify console for any actor errors

**Claude API errors?**
- Verify CLAUDE_API_KEY is set correctly
- Check your Anthropic API usage/billing

**General fetch failures?**
- The function falls back to basic HTML scraping if Apify fails
- Some sites may block server-side requests entirely

## create-checkout-session

Creates Stripe checkout sessions for Pro subscription upgrades.

### Deployment

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_your-key-here
supabase functions deploy create-checkout-session
```

## stripe-webhook

Handles Stripe webhook events for subscription updates.

### Deployment

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your-secret-here
supabase functions deploy stripe-webhook
```
