chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'EXTRACT_CONTENT') {
    sendResponse(extractContent());
  }
});

function extractContent() {
  const title = document.title || '';

  // Try to find main article content using heuristics
  const content = extractMainContent();

  return { title, content };
}

function extractMainContent() {
  // Priority selectors — prefer semantic article content
  const candidates = [
    'article',
    '[role="main"]',
    'main',
    '.post-content',
    '.article-content',
    '.entry-content',
    '.content',
    '#content',
    '.story-body',
    '.article-body',
  ];

  for (const selector of candidates) {
    const el = document.querySelector(selector);
    if (el) {
      const text = cleanText(el.innerText);
      if (text.length > 200) return text;
    }
  }

  // Fallback: use body but strip nav/header/footer/aside
  const body = document.body.cloneNode(true);
  const noise = body.querySelectorAll(
    'nav, header, footer, aside, script, style, noscript, iframe, ' +
    '.nav, .navbar, .menu, .sidebar, .advertisement, .ads, .cookie, ' +
    '.popup, .modal, .banner, [role="navigation"], [role="complementary"]'
  );
  noise.forEach(el => el.remove());

  return cleanText(body.innerText);
}

function cleanText(text) {
  return text
    .replace(/\n{3,}/g, '\n\n')   // collapse excessive newlines
    .replace(/\t+/g, ' ')          // collapse tabs
    .replace(/ {2,}/g, ' ')        // collapse multiple spaces
    .trim();
}