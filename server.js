require("dotenv").config({ path: require("path").join(__dirname, ".env"), override: true });
const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

// ⚠️ Replace with your actual Groq API key (free at console.groq.com)
const GROQ_API_KEY = process.env.GROQ_API_KEY || "YOUR_GROQ_API_KEY_HERE";

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ── Analyse text ──────────────────────────────────────
app.post("/api/analyse", async (req, res) => {
  const { text } = req.body;
  if (!text || text.trim().length < 10)
    return res.status(400).json({ error: "Please provide a news article or headline to analyse." });

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
       model: "openai/gpt-oss-120b",
        max_tokens: 3000,
        messages: [{
          role: "user",
          content: `You are a professional fake news detector and media literacy expert. Analyse the following news article or headline.

News content:
"""
${text}
"""

Respond ONLY with a valid JSON object (no markdown, no extra text):
{
  "credibilityScore": <number 0-100>,
  "verdict": "<one of: LIKELY REAL | POSSIBLY REAL | UNCERTAIN | POSSIBLY FAKE | LIKELY FAKE>",
  "verdictColor": "<one of: green | lime | yellow | orange | red>",
  "category": "<one of: Politics | Health | Science | Technology | Sports | Business | Entertainment | Environment | Crime | International | Education | Other>",
  "sourceType": "<one of: Mainstream Media | Independent Media | Blog / Opinion | Social Media | Government | Academic | Unknown>",
  "summary": "<2-3 sentence overall assessment>",
  "redFlags": ["<flag 1>", "<flag 2>", "<flag 3>"],
  "positiveIndicators": ["<indicator 1>", "<indicator 2>", "<indicator 3>"],
  "biasLevel": "<one of: Low | Moderate | High | Very High>",
  "emotionalLanguage": "<one of: Minimal | Some | Heavy>",
  "recommendations": ["<rec 1>", "<rec 2>", "<rec 3>", "<rec 4>", "<rec 5>", "<rec 6>", "<rec 7>", "<rec 8>", "<rec 9>", "<rec 10>"]
}

Always provide exactly 8 to 10 detailed, specific, actionable recommendations. Each recommendation should be a full sentence explaining what the reader should do and why. Be thorough and educational.`
        }]
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Groq API error");
    const raw = data.choices[0].message.content.trim().replace(/```json|```/g, "").trim();
    res.json(JSON.parse(raw));
  } catch (err) {
    console.error("Analyse Error:", err.message);
    res.status(500).json({ error: "Failed to analyse. Check your API key or try again." });
  }
});

// ── Fetch URL and extract text ────────────────────────
app.post("/api/fetch-url", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "No URL provided." });

  try {
    new URL(url); // validate URL format
  } catch {
    return res.status(400).json({ error: "Invalid URL. Please enter a valid news link." });
  }

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) throw new Error(`Could not fetch page (status ${response.status})`);

    const html = await response.text();

    // Extract readable text from HTML
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[\s\S]*?<\/nav>/gi, "")
      .replace(/<header[\s\S]*?<\/header>/gi, "")
      .replace(/<footer[\s\S]*?<\/footer>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 4000);

    if (text.length < 30)
      return res.status(400).json({ error: "Could not extract text from this URL. Try pasting the article text directly." });

    res.json({ text });
  } catch (err) {
    console.error("URL Fetch Error:", err.message);
    res.status(500).json({ error: "Could not fetch URL. Make sure it's a valid public news link." });
  }
});

// ── Fetch Latest News from RSS feeds ─────────────────
app.get("/api/news", async (req, res) => {
  const feeds = [
    { url: "https://feeds.bbci.co.uk/news/rss.xml",           source: "BBC News",     category: "International" },
    { url: "https://feeds.bbci.co.uk/news/technology/rss.xml", source: "BBC Tech",     category: "Technology" },
    { url: "https://feeds.bbci.co.uk/news/health/rss.xml",     source: "BBC Health",   category: "Health" },
    { url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml", source: "BBC Science", category: "Science" },
    { url: "https://timesofindia.indiatimes.com/rssfeedstopstories.cms", source: "Times of India", category: "India" },
    { url: "https://www.thehindu.com/news/national/feeder/default.rss",   source: "The Hindu",      category: "India" },
  ];

  const articles = [];

  for (const feed of feeds) {
    try {
      const r = await fetch(feed.url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(5000)
      });
      if (!r.ok) continue;
      const xml = await r.text();

      // Parse RSS items
      const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
      for (const item of items.slice(0, 5)) {
        const title       = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/))?.[1]?.trim();
        const description = (item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || item.match(/<description>(.*?)<\/description>/))?.[1]?.replace(/<[^>]+>/g, "").trim();
        const link        = (item.match(/<link>(.*?)<\/link>/) || item.match(/<guid>(.*?)<\/guid>/))?.[1]?.trim();
        const pubDate     = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]?.trim();

        if (title && title.length > 10) {
          articles.push({
            title,
            description: description?.slice(0, 200) || "",
            link: link || "",
            source: feed.source,
            category: feed.category,
            pubDate: pubDate ? new Date(pubDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Recent",
          });
        }
        if (articles.length >= 30) break;
      }
    } catch (err) {
      console.warn(`Feed error (${feed.source}):`, err.message);
    }
    if (articles.length >= 30) break;
  }

  // Shuffle for variety
  articles.sort(() => Math.random() - 0.5);
  res.json({ articles: articles.slice(0, 25) });
});

app.listen(PORT, () => {
  console.log(`\n🔍 Fake News Analyser running at http://localhost:${PORT}\n`);
});
