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
- The extension includes a built-in API key for automatic use
- Users can override the built-in key with their own in the extension settings
- All API calls happen in `background.js` (service worker) — never in content scripts or popup
- `responseMimeType: 'application/json'` forces structured JSON output
- Responses are cached per URL for 10 minutes to reduce API usage

---

## Security Decisions

- No API keys hardcoded or committed to the repository
- API key stored in `chrome.storage.local` — sandboxed to the extension
- All AI requests made from the background service worker, not the page context
- DOM injection uses `textContent` not `innerHTML` to prevent XSS
- Minimal permissions: `activeTab`, `storage`, `scripting`

---

## Trade-offs and Limitations

- Extension includes a built-in API key for automatic use
- API key can be overridden by the user in settings
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

The extension works out-of-the-box with a built-in API key. If you wish to use your own:

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