# Page Summarizer AI — Chrome Extension

A Manifest V3 Chrome Extension that extracts content from any webpage and generates a structured AI-powered summary using the Gemini API.

---

## Features

- Bullet-point summary of page content
- Key insights extraction
- Estimated reading time and word count
- Per-URL caching to avoid duplicate API calls
- Dark and light mode
- Copy summary to clipboard
- Clean, keyboard-accessible popup UI
- API key stored securely in chrome.storage — never hardcoded

---

## Architecture

```
page-summarizer/
├── manifest.json        — Manifest V3 config, permissions, entry points
├── background.js        — Service worker: handles AI API calls and caching
├── content.js           — Content script: extracts readable page content
├── popup/
│   ├── popup.html       — Popup UI structure
│   ├── popup.css        — Styles (dark/light mode)
│   └── popup.js         — Popup logic, messaging, rendering
└── icons/               — Extension icons
```

**Message flow:**
1. User clicks Summarize in popup
2. `popup.js` sends `EXTRACT_CONTENT` message to `content.js`
3. `content.js` extracts readable text and returns it
4. `popup.js` sends `SUMMARIZE` message to `background.js`
5. `background.js` checks cache → calls Gemini API → returns result
6. `popup.js` renders the structured summary

---

## AI Integration

- Provider: Google Gemini (`gemini-2.5-flash`)
- **Dual Support**: Works with a user-provided API key OR a built-in proxy server.
- All API calls happen in `background.js` (service worker) — never in content scripts or popup.
- `responseMimeType: 'application/json'` forces structured JSON output.
- Responses are cached per URL for 10 minutes to reduce API usage.

---

## Proxy Server & Deployment

To make the extension work out-of-the-box for users without requiring them to get their own API key, you can deploy the included proxy server to Vercel.

### How it works:
1. The extension first checks `chrome.storage.local` for a `geminiApiKey`.
2. If found, it calls the Gemini API directly.
3. If NOT found, it falls back to the `PROXY_URL` defined in `background.js`.

### Deployment Instructions:

1. **Prerequisites**: A [Vercel](https://vercel.com) account and a [Gemini API Key](https://aistudio.google.com/app/apikey).
2. **Setup Environment**:
   - Create a `.env` file in the root (a template is provided).
   - Add your key: `GEMINI_API_KEY=your_key_here`.
   - The `.gitignore` ensures this file is never committed.
3. **Deploy to Vercel**:
   - Push this repository to GitHub/GitLab/Bitbucket.
   - Import the project into Vercel.
   - **Important**: In Vercel Project Settings, add an Environment Variable:
     - Key: `GEMINI_API_KEY`
     - Value: `your_gemini_api_key`
4. **Update Extension**:
   - After deployment, copy your Vercel deployment URL (e.g., `https://your-project.vercel.app`).
   - Open `background.js` and update `PROXY_URL`:
     ```javascript
     const PROXY_URL = 'https://your-project.vercel.app/api/summarize';
     ```
   - Reload the extension in `chrome://extensions`.

---

## Security Decisions

- **No Hardcoded Keys**: API keys are never stored in the client-side code. They stay on your secure Vercel server or in the user's local storage.
- **CORS & Safety**: The proxy ensures your key is hidden from the end user.
- **Local Storage**: User-provided keys are stored in `chrome.storage.local` — sandboxed to the extension.
- **XSS Prevention**: DOM injection uses `textContent` not `innerHTML`.
- Minimal permissions: `activeTab`, `storage`, `scripting`.

---

## Trade-offs and Limitations

- API key is user-provided — requires a free Gemini account at aistudio.google.com
- Free tier has rate limits — heavy usage may hit quota
- Cannot summarize pages that block content scripts (e.g. chrome:// URLs, PDF files)
- Content extraction uses heuristics — may not work perfectly on all page layouts

---

## How to Install (Local)

This extension is not on the Chrome Web Store. Install it locally:

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode** using the toggle in the top right
4. Click **Load unpacked**
5. Select the `page-summarizer` folder
6. The extension icon will appear in your Chrome toolbar

## How to Set Up

1. Get a free Gemini API key at **aistudio.google.com**
2. Click the extension icon in Chrome toolbar
3. Click the settings icon (gear) in the top right of the popup
4. Paste your API key and click **Save API Key**

## How to Use

1. Navigate to any article or webpage
2. Click the Page Summarizer AI icon in the toolbar
3. Click **Summarize Page**
4. Read the summary, insights, reading time and word count
5. Use **Copy** to copy the summary to clipboard
6. Use **Clear** to reset and re-summarize

---

## How to Run Locally for Development

No build step required. Edit the files directly and reload the extension at `chrome://extensions` after each change.