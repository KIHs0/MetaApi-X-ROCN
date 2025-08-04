

## Project Architecture
- This is a Node.js automation platform for scraping, processing, and sharing media content, primarily via RSS feeds and web scraping (Cheerio).
- The main workflow is in `index.js`, which:
  - Schedules jobs using `node-cron` to fetch RSS feeds.
  - Scrapes articles for images and text using Cheerio.
  - Downloads images and posts content to Facebook via the Graph API.
- All automation logic is centralized in `index.js`. There are no submodules or microservices.

## Key Files & Directories
- `index.js`: Main entry point. Contains scraping, scheduling, media download, and Facebook posting logic.
- `public/images/`: Stores downloaded images for posts.
- `.env`: Required for Facebook API credentials (`FB_PAGE_ACCESS_TOKEN`, `FB_PAGE_ID`).
- `package.json`: Declares dependencies (rss-parser, node-cron, cheerio, axios, express).

## Developer Workflows
- **Run the app:**
  ```bash
  node index.js
  ```
- **Environment setup:**
  - Ensure `.env` is present with valid Facebook API credentials.
- **Image scraping:**
  - Uses Cheerio to extract images from articles. Fallbacks to first `<img>` if `og:image` is missing.
- **Media posting:**
  - Images are uploaded to Facebook as unpublished, then attached to posts.
- **Cron jobs:**
  - Scheduled every minute (`* * * * *`).
  - Each run fetches new RSS items, processes, and posts them.

## Project-Specific Patterns
- Uses a `Set` to track posted items. Items are objects from RSS feeds.
- All async operations (scraping, downloading, posting) are handled in sequence within the cron job.
- Error handling is via `console.error` and early returns.
- No test suite or build step is present; code runs directly.

## External Integrations
- Facebook Graph API for media upload and posting.
- RSS feeds for content ingestion.
- Cheerio for HTML parsing.
- Axios for HTTP requests.

## Example: Adding a New Media Source
- Add RSS URL to the `parseData` function.
- Extend scraping logic in `extractImageFromArticle` if new patterns are needed.

## Conventions
- All code is ES6+ JavaScript.
- No TypeScript or transpilation.
- All automation logic is in a single file for simplicity.

---

For questions or unclear patterns, review `index.js` and `README.md` for examples. If a workflow or integration is ambiguous, ask for clarification before making changes.
