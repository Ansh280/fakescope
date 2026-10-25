# FakeScope

An AI web app that checks how credible a news headline or article looks. Paste text or a link, and it returns a credibility score, a verdict, red flags, positive signs and advice on what to do next.

**Live demo:** https://fakescope-evia.onrender.com
*(Free hosting: if the app has been idle, the first load can take about a minute.)*

## Screenshots

| Home | Result |
|---|---|
| ![Home screen](screenshots/home.png) | ![Analysis result](screenshots/result.png) |

## What it does

- Analyses pasted text or a news URL (the server fetches the page text for you)
- Gives a 0–100 credibility score and a verdict, from Likely Real to Likely Fake
- Shows category, source type, bias level, emotional language, red flags, positive indicators and 8–10 recommendations
- Live news feed from BBC, The Hindu and Times of India, so you can analyse a real headline in one click
- Optional login (Google or email) with saved analysis history
- Installable as a PWA, with dark and light themes

## How it works

1. You paste a headline or article, or give a link.
2. The Node.js server sends the text to a language model hosted on Groq, with a prompt that asks for a JSON verdict.
3. The server returns that JSON and the front end draws the result.

| Part | Tech |
|---|---|
| Front end | HTML, CSS, JavaScript (`public/`) |
| Back end | Node.js, Express (`server.js`) |
| AI | Language model on the Groq API |
| Login and history | Firebase Authentication and Firestore |
| Hosting | Render (free tier) |

**API routes**
- `POST /api/analyse`: scores a piece of text
- `POST /api/fetch-url`: fetches and cleans the text of a news link
- `GET /api/news`: loads headlines from the RSS feeds

## Run it locally

1. Install Node.js 18 or newer.
2. Clone the repo and install packages:
   ```
   git clone https://github.com/Ansh280/fakescope.git
   cd fakescope
   npm install
   ```
3. Create a free API key at [console.groq.com](https://console.groq.com).
4. Create a file named `.env` next to `server.js` (see `.env.example`):
   ```
   GROQ_API_KEY=your_key_here
   ```
5. Start the server:
   ```
   node server.js
   ```
6. Open `http://localhost:3000`.

**Login and history:** these use the author's Firebase project. To use your own, replace `firebaseConfig` in `public/script.js` and add your domain under Authentication → Settings → Authorised domains in the Firebase console. Analysis works without login.

## Deploy

The app runs on any Node host. On Render: connect the repo, set the build command to `npm install` and the start command to `npm start`, and add `GROQ_API_KEY` as an environment variable. The server reads the port from the `PORT` variable.

## Limitations

- It judges wording, structure and sourcing signals only. It does **not** check claims against live sources, so it cannot confirm that an event really happened. A true story with no source named can score as "Uncertain".
- Scores come from a language model and can be wrong or change between runs. Use them as a prompt to check further, not as a final answer.
- No accuracy benchmark has been run on this version.
- The model name is set in `server.js`. Groq retires models from time to time, so it may need updating.

## Project structure

```
fakescope/
├── public/          front end (index.html, script.js, style.css, PWA files)
├── server.js        Express server and API routes
├── package.json
└── .env.example     example environment file
```

## Author

Ansh Kundu · [GitHub](https://github.com/Ansh280) · [LinkedIn](https://linkedin.com/in/ansh-kundu-1b5504292)
