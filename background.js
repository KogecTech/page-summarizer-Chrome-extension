const PROXY_ENDPOINT = 'https://vercel-proxy-nu-lovat.vercel.app/api/summarize';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'SUMMARIZE') {
    handleSummarize(message.payload).then(sendResponse);
    return true; // keep message channel open for async response
  }

  if (message.type === 'CLEAR_CACHE') {
    clearCache(message.payload.url).then(sendResponse);
    return true;
  }
});

async function handleSummarize({ url, content, title }) {
  // Check cache first
  const cached = await getCached(url);
  if (cached) {
    return { success: true, summary: cached, fromCache: true };
  }

  const prompt = buildPrompt(title, content);

  try {
    const response = await fetch(PROXY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content: prompt }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const message = err?.error ?? `Server error ${response.status}`;
      return { success: false, error: message };
    }

    const data = await response.json();

    if (!data.success || !data.summary) {
      return { success: false, error: data.error ?? 'No summary returned.' };
    }

    // Cache the result
    await setCached(url, data.summary);

    return { success: true, summary: data.summary, fromCache: false };
  } catch (err) {
    return {
      success: false,
      error: err.message ?? 'Network error. Please check your connection.',
    };
  }
}

function buildPrompt(title, content) {
  const trimmed = content.slice(0, 5000);
  return `You are a JSON-only API. You must respond with ONLY a valid JSON object. No markdown. No code blocks. No backticks. No explanation. Just raw JSON.

Required format:
{"summary":["point 1","point 2","point 3","point 4"],"insights":["insight 1","insight 2"],"readingTime":"X min read","wordCount":1234}

Rules:
- summary: 4-6 bullet points covering the main content
- insights: 2-3 key takeaways
- readingTime: estimated reading time
- wordCount: approximate word count
- No markdown inside string values
- Response must start with { and end with }

Page title: ${title}
Content: ${trimmed}`;
}

function parseSummary(text) {
  try {
    return JSON.parse(text.trim());
  } catch {
    return {
      summary: [text.trim()],
      insights: [],
      readingTime: 'Unknown',
      wordCount: 0,
    };
  }
}

async function getCached(url) {
  const key = `cache_${btoa(url).slice(0, 50)}`;
  const result = await chrome.storage.local.get(key);
  const entry = result[key];
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    await chrome.storage.local.remove(key);
    return null;
  }
  return entry.summary;
}

async function setCached(url, summary) {
  const key = `cache_${btoa(url).slice(0, 50)}`;
  await chrome.storage.local.set({
    [key]: { summary, timestamp: Date.now() },
  });
}

async function clearCache(url) {
  const key = `cache_${btoa(url).slice(0, 50)}`;
  await chrome.storage.local.remove(key);
  return { success: true };
}