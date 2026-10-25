# FakeScope

A web app that checks how credible a news headline or article looks. Paste text or a link, and an AI model returns a credibility score, a verdict, red flags, positive signs and advice on what to do next.

## What it does

- Analyses pasted text or a news URL (the server fetches the page text for you)
- Returns a 0–100 credibility score and a verdict (Likely Real to Likely Fake)
- Shows category, source type, bias level, emotional language, red flags, positive indicators and 8–10 recommendations
- Live news feed from BBC, The Hindu and Times of India, so you can analyse real headlines in one click
- Optional login (Google or email) with Firebase; saved analysis history
- Installable as a PWA, with dark and light themes

## How it works

- **Front end:** plain HTML, CSS and JavaScript in `public/`
- **Back end:** Node.js and Express (`server.js`) with three routes: `/api/analyse`, `/api/fetch-url` and `/api/news`
- **AI:** a Groq-hosted language model is prompted to return a JSON verdict, which the app displays
- **Auth and history:** Firebase Authentication and Firestore

## Run it locally

1. Install Node.js 18 or newer.
2. Clone the repo and install packages:
   ```
   git clone https://github.com/Ansh280/fakescope.git
   cd fakescope
   npm install
   ```
3. Create a free API key at [console.groq.com](https://console.groq.com).
4. Create a `.env` file next to `server.js`:
   ```
   GROQ_API_KEY=your_key_here
   ```
5. Start the server:
   ```
   node server.js
   ```
6. Open `http://localhost:3000`.

## Limitations

- It judges wording, structure and sourcing signals only. It does **not** check claims against live sources, so it cannot confirm that an event really happened.
- Scores come from a language model and can be wrong or vary between runs. Treat them as a prompt to check further, not a final answer.
- No accuracy benchmark has been run on this version.
- The Groq model name is set in `server.js`. Groq retires models from time to time, so you may need to update it.

## Tech

Node.js, Express, JavaScript, Firebase (Auth and Firestore), Groq API, PWA (service worker and manifest)
