const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { title, content } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API key not configured on server' });
  }

  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  const prompt = buildPrompt(title, content);

  try {
    const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const message = err?.error?.message ?? `API error ${response.status}`;
      return res.status(response.status).json({ success: false, error: message });
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return res.status(500).json({ success: false, error: 'No summary returned from AI.' });
    }

    return res.status(200).json({ success: true, summary: JSON.parse(text.trim()) });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message ?? 'Internal server error',
    });
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
