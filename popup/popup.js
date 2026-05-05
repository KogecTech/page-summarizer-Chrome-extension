const $ = id => document.getElementById(id);

// Views
const viewMain     = $('view-main');
const viewSettings = $('view-settings');

// Main view elements
const pageTitle    = $('page-title');
const btnSummarize = $('btn-summarize');
const btnSettings  = $('btn-settings');
const btnTheme     = $('btn-theme');
const btnRetry     = $('btn-retry');
const btnCopy      = $('btn-copy');
const btnClear     = $('btn-clear');

// States
const stateLoading = $('state-loading');
const stateError   = $('state-error');
const stateSummary = $('state-summary');
const errorMessage = $('error-message');

// Summary elements
const summaryList    = $('summary-list');
const insightsList   = $('insights-list');
const readingTimeEl  = $('reading-time-text');
const wordCountEl    = $('word-count-text');
const cacheBadge     = $('cache-badge');

// Settings elements
const btnBack       = $('btn-back');
const inputApiKey   = $('input-api-key');
const btnToggleKey  = $('btn-toggle-key');
const btnSaveKey    = $('btn-save-key');
const saveStatus    = $('save-status');

let currentUrl = '';

// ── Init ──
async function init() {
  loadTheme();
  await loadPageInfo();
  await loadSettings();
}

async function loadPageInfo() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentUrl = tab?.url ?? '';
    const title = tab?.title ?? 'Unknown page';
    pageTitle.textContent = title;
    pageTitle.title = title;
  } catch {
    pageTitle.textContent = 'Could not read page info';
  }
}

async function loadSettings() {
  const { geminiApiKey } = await chrome.storage.local.get('geminiApiKey');
  if (geminiApiKey) {
    inputApiKey.value = geminiApiKey;
  }
}

// ── Theme ──
function loadTheme() {
  chrome.storage.local.get('theme', ({ theme }) => {
    if (theme === 'light') document.body.setAttribute('data-theme', 'light');
  });
}

btnTheme.addEventListener('click', () => {
  const isLight = document.body.getAttribute('data-theme') === 'light';
  if (isLight) {
    document.body.removeAttribute('data-theme');
    chrome.storage.local.set({ theme: 'dark' });
  } else {
    document.body.setAttribute('data-theme', 'light');
    chrome.storage.local.set({ theme: 'light' });
  }
});

// ── Navigation ──
btnSettings.addEventListener('click', () => showView('settings'));
btnBack.addEventListener('click', () => showView('main'));

function showView(name) {
  viewMain.classList.toggle('active', name === 'main');
  viewSettings.classList.toggle('active', name === 'settings');
  viewMain.classList.toggle('hidden', name !== 'main');
  viewSettings.classList.toggle('hidden', name !== 'settings');
}

// ── Settings ──
btnToggleKey.addEventListener('click', () => {
  inputApiKey.type = inputApiKey.type === 'password' ? 'text' : 'password';
});

btnSaveKey.addEventListener('click', async () => {
  const key = inputApiKey.value.trim();
  if (!key) return;
  await chrome.storage.local.set({ geminiApiKey: key });
  saveStatus.classList.remove('hidden');
  setTimeout(() => saveStatus.classList.add('hidden'), 2000);
});

// ── Summarize ──
btnSummarize.addEventListener('click', summarize);
btnRetry.addEventListener('click', summarize);

async function summarize() {
  showState('loading');
  btnSummarize.disabled = true;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Extract content from the page via content script
    const extraction = await chrome.tabs.sendMessage(tab.id, {
      type: 'EXTRACT_CONTENT',
    });

    if (!extraction?.content || extraction.content.length < 50) {
      showError('Could not extract readable content from this page. Try on an article or blog post.');
      return;
    }

    // Send to background for AI processing
    const result = await chrome.runtime.sendMessage({
      type: 'SUMMARIZE',
      payload: {
        url: currentUrl,
        content: extraction.content,
        title: extraction.title,
      },
    });

    if (!result.success) {
      showError(result.error);
      return;
    }

    renderSummary(result.summary, result.fromCache);
  } catch (err) {
    if (err.message?.includes('Could not establish connection')) {
      showError('Cannot access this page. Try refreshing or use on a regular webpage.');
    } else {
      showError(err.message ?? 'Something went wrong. Please try again.');
    }
  } finally {
    btnSummarize.disabled = false;
  }
}

function renderSummary(summary, fromCache) {
  // Meta
  readingTimeEl.textContent = summary.readingTime ?? '—';
  wordCountEl.textContent   = summary.wordCount
    ? `${summary.wordCount.toLocaleString()} words`
    : '—';

  cacheBadge.classList.toggle('hidden', !fromCache);

  // Summary bullets
  summaryList.innerHTML = '';
  const bullets = Array.isArray(summary.summary) ? summary.summary : [];
  bullets.forEach(point => {
    const li = document.createElement('li');
    li.textContent = sanitize(point);
    summaryList.appendChild(li);
  });

  // Insights
  insightsList.innerHTML = '';
  const insights = Array.isArray(summary.insights) ? summary.insights : [];
  insights.forEach(insight => {
    const li = document.createElement('li');
    li.textContent = sanitize(insight);
    insightsList.appendChild(li);
  });

  showState('summary');
}

// ── Copy ──
btnCopy.addEventListener('click', async () => {
  const bullets = [...summaryList.querySelectorAll('li')].map(li => `• ${li.textContent}`);
  const insights = [...insightsList.querySelectorAll('li')].map(li => `• ${li.textContent}`);
  const text = [
    `Summary of: ${pageTitle.textContent}`,
    '',
    'SUMMARY',
    ...bullets,
    '',
    'KEY INSIGHTS',
    ...insights,
  ].join('\n');

  await navigator.clipboard.writeText(text);
  btnCopy.textContent = '✓ Copied!';
  setTimeout(() => {
    btnCopy.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"
          stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      Copy`;
  }, 1500);
});

// ── Clear ──
btnClear.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({
    type: 'CLEAR_CACHE',
    payload: { url: currentUrl },
  });
  showState('idle');
});

// ── State management ──
function showState(state) {
  stateLoading.classList.add('hidden');
  stateError.classList.add('hidden');
  stateSummary.classList.add('hidden');
  btnSummarize.style.display = '';

  if (state === 'loading') {
    stateLoading.classList.remove('hidden');
    btnSummarize.style.display = 'none';
  } else if (state === 'error') {
    stateError.classList.remove('hidden');
    btnSummarize.style.display = 'none';
  } else if (state === 'summary') {
    stateSummary.classList.remove('hidden');
  }
}

function showError(message) {
  errorMessage.textContent = message;
  showState('error');
}

// ── Security: sanitize text before injecting into DOM ──
function sanitize(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(String(str)));
  return div.textContent;
}

init();