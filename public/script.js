// ══════════════════════════════════════════════
// FIREBASE CONFIG — your actual config
// ══════════════════════════════════════════════
const firebaseConfig = {
  apiKey: "AIzaSyAQk6Gqy6KDh-d36bV4twWGwM-fytydcDc",
  authDomain: "fakescope-b576a.firebaseapp.com",
  projectId: "fakescope-b576a",
  storageBucket: "fakescope-b576a.firebasestorage.app",
  messagingSenderId: "836787657046",
  appId: "1:836787657046:web:5cb95bba2793b4ae75def7"
};

import { initializeApp }                                        from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup,
         createUserWithEmailAndPassword, signInWithEmailAndPassword,
         signOut, onAuthStateChanged, updateProfile }           from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc,
         doc, query, orderBy, limit }                          from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);
const provider = new GoogleAuthProvider();

let currentUser = null;

// ══════════════════════════════════════════════
// THEME TOGGLE
// ══════════════════════════════════════════════
const THEME_KEY = "fakescope_theme";

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const icon = document.getElementById("themeIcon");
  const toggleEl = document.getElementById("toggleDark");
  if (theme === "dark") {
    if (icon) icon.textContent = "☽";
    if (toggleEl) toggleEl.classList.add("active");
  } else {
    if (icon) icon.textContent = "☀";
    if (toggleEl) toggleEl.classList.remove("active");
  }
  localStorage.setItem(THEME_KEY, theme);
}

window.toggleTheme = function() {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  applyTheme(current === "dark" ? "light" : "dark");
};

// ══════════════════════════════════════════════
// INPUT TAB SWITCHING
// ══════════════════════════════════════════════
let activeInputTab = "text";

window.switchInputTab = function(tab) {
  activeInputTab = tab;
  const isText = tab === "text";
  document.getElementById("tabText").classList.toggle("active", isText);
  document.getElementById("tabUrl").classList.toggle("active", !isText);
  document.getElementById("textInputArea").classList.toggle("hidden", !isText);
  document.getElementById("urlInputArea").classList.toggle("hidden", isText);
  document.getElementById("charCount").textContent = "0 characters";
};

// ══════════════════════════════════════════════
// ANALYSE LOGIC
// ══════════════════════════════════════════════
const textarea   = document.getElementById("newsInput");
const charCount  = document.getElementById("charCount");
const loader     = document.getElementById("loader");
const results    = document.getElementById("results");
const errorBox   = document.getElementById("errorBox");
const loaderMsg  = document.getElementById("loaderMsg");
const analyseBtn = document.getElementById("analyseBtn");

const loaderMessages = [
  "Fetching article content...",
  "Scanning for bias patterns...",
  "Checking emotional language...",
  "Consulting Llama AI...",
  "Evaluating credibility...",
  "Analysing red flags...",
  "Almost done...",
];
let loaderInterval = null;

function startLoader(isUrl) {
  let i = 0;
  loaderMsg.textContent = isUrl ? "Fetching article from URL..." : loaderMessages[0];
  loaderInterval = setInterval(() => {
    i = (i + 1) % loaderMessages.length;
    loaderMsg.textContent = loaderMessages[i];
  }, 1800);
}

function stopLoader() {
  clearInterval(loaderInterval);
  loaderMsg.textContent = "Analysing credibility...";
}

textarea.addEventListener("input", () => {
  charCount.textContent = `${textarea.value.length} characters`;
});

window.analyseNews = async function() {
  let text = "";

  if (activeInputTab === "url") {
    const url = document.getElementById("urlInput").value.trim();
    if (!url) return showError("Please enter a URL.");
    hideAll(); show(loader);
    analyseBtn.disabled = true;
    startLoader(true);
    try {
      const fetchRes = await fetch("/api/fetch-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const fetchData = await fetchRes.json();
      if (!fetchRes.ok || fetchData.error) throw new Error(fetchData.error);
      text = fetchData.text;
      loaderMsg.textContent = "Article fetched! Analysing now...";
    } catch (err) {
      stopLoader(); analyseBtn.disabled = false;
      hideAll(); showError(err.message); return;
    }
  } else {
    text = textarea.value.trim();
    if (text.length < 10) return showError("Please enter at least 10 characters.");
    hideAll(); show(loader);
    analyseBtn.disabled = true;
    startLoader(false);
  }

  try {
    const response = await fetch("/api/analyse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error || "Server error.");
    stopLoader();
    renderResults(data);
    await addToHistory(text, data);
    const s = getSettings();
    if (s.autoClear) { textarea.value = ""; charCount.textContent = "0 characters"; }
  } catch (err) {
    stopLoader(); hideAll(); showError(err.message);
  } finally {
    analyseBtn.disabled = false;
  }
};

function renderResults(data) {
  const score = data.credibilityScore ?? 50;
  const color = getScoreColor(score);

  // Score
  document.getElementById("scoreNumber").textContent = score;
  document.getElementById("scoreNumber").style.color = color;

  // Score bar
  const bar = document.getElementById("scoreBarFill");
  if (bar) {
    setTimeout(() => { bar.style.width = score + "%"; bar.style.background = color; }, 100);
  }

  // Verdict badge
  const badge = document.getElementById("verdictBadge");
  badge.textContent = data.verdict ?? "Unknown";
  badge.style.color = resolveColor(data.verdictColor);
  badge.style.borderColor = resolveColor(data.verdictColor);

  // Category & Source tags
  const catTag = document.getElementById("categoryTag");
  const srcTag = document.getElementById("sourceTag");
  if (catTag) catTag.textContent = data.category || "General";
  if (srcTag) srcTag.textContent = data.sourceType || "Unknown";

  // Stat cards
  document.getElementById("biasLevel").textContent = data.biasLevel ?? "—";
  document.getElementById("emotionalLang").textContent = data.emotionalLanguage ?? "—";
  const srcCard = document.getElementById("sourceTypeCard");
  const catCard = document.getElementById("categoryCard");
  if (srcCard) srcCard.textContent = data.sourceType || "—";
  if (catCard) catCard.textContent = data.category || "—";

  // Summary
  document.getElementById("summaryText").textContent = data.summary ?? "";

  // Red flags
  const redFlags = Array.isArray(data.redFlags) ? data.redFlags : [];
  renderFlagList("redFlagsList", redFlags, "No red flags detected.");
  const redCount = document.getElementById("redFlagCount");
  if (redCount) redCount.textContent = redFlags.length;

  // Positive indicators
  const positives = Array.isArray(data.positiveIndicators) ? data.positiveIndicators : [];
  renderFlagList("positiveList", positives, "No positive indicators found.");
  const posCount = document.getElementById("positiveCount");
  if (posCount) posCount.textContent = positives.length;

  // Recommendations as grid cards
  const recs = Array.isArray(data.recommendations) ? data.recommendations : [];
  const recGrid = document.getElementById("recommendationsList");
  if (recGrid) {
    if (recs.length === 0) {
      recGrid.innerHTML = '<div class="rec-item"><span>No specific recommendations.</span></div>';
    } else {
      recGrid.innerHTML = recs.map((r, i) =>
        `<div class="rec-item"><span class="rec-num">${String(i+1).padStart(2,"0")}</span><span>${r}</span></div>`
      ).join("");
    }
  }

  hide(loader);
  show(results);
}

function renderFlagList(id, items, emptyMsg) {
  const ul = document.getElementById(id);
  ul.innerHTML = "";
  const list = items.length ? items : [emptyMsg];
  list.forEach(item => {
    const li = document.createElement("li");
    li.textContent = item;
    ul.appendChild(li);
  });
}

function getScoreColor(score) {
  if (score >= 75) return "#47ffb2";
  if (score >= 55) return "#a8ff47";
  if (score >= 40) return "#e8ff47";
  if (score >= 25) return "#ffaa47";
  return "#ff4d4d";
}

function resolveColor(colorName) {
  const map = { green:"#47ffb2", lime:"#a8ff47", yellow:"#e8ff47", orange:"#ffaa47", red:"#ff4d4d" };
  return map[colorName] ?? "#7a7a95";
}

window.resetForm = function() {
  hideAll();
  textarea.value = "";
  document.getElementById("urlInput").value = "";
  charCount.textContent = "0 characters";
  document.getElementById("scoreNumber").textContent = "--";
  document.getElementById("scoreNumber").style.color = "";
  const bar = document.getElementById("scoreBarFill");
  if (bar) { bar.style.width = "0%"; bar.style.background = ""; }
};

function showError(msg) { errorBox.textContent = "⚠ " + msg; show(errorBox); }
function hideAll()       { hide(loader); hide(results); hide(errorBox); }
function show(el)        { el.classList.remove("hidden"); }
function hide(el)        { el.classList.add("hidden"); }

document.addEventListener("keydown", e => {
  if (e.ctrlKey && e.key === "Enter") window.analyseNews();
  if (e.key === "Escape") { closePanel(); closeModal(); }
});

// ══════════════════════════════════════════════
// FIREBASE AUTH
// ══════════════════════════════════════════════
window.signInWithGoogle = async function() {
  try {
    await signInWithPopup(auth, provider);
    closeModal();
  } catch (err) {
    showModalError("loginError", err.message);
    showModalError("signupError", err.message);
  }
};

window.handleSignup = async function() {
  const name     = document.getElementById("signupName").value.trim();
  const email    = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value;
  if (!name)                return showModalError("signupError", "Please enter your name.");
  if (!email.includes("@")) return showModalError("signupError", "Please enter a valid email.");
  if (password.length < 6)  return showModalError("signupError", "Password must be at least 6 characters.");
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    closeModal();
  } catch (err) {
    const msg = err.code === "auth/email-already-in-use" ? "An account with this email already exists." : err.message;
    showModalError("signupError", msg);
  }
};

window.handleLogin = async function() {
  const email    = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  if (!email)    return showModalError("loginError", "Please enter your email.");
  if (!password) return showModalError("loginError", "Please enter your password.");
  try {
    await signInWithEmailAndPassword(auth, email, password);
    closeModal();
  } catch (err) {
    showModalError("loginError", "Incorrect email or password.");
  }
};

window.logout = async function() {
  await signOut(auth);
  hide(document.getElementById("userMenu"));
};

onAuthStateChanged(auth, user => {
  currentUser = user;
  if (user) {
    hide(document.getElementById("loggedOut"));
    show(document.getElementById("loggedIn"));
    const name = user.displayName || user.email.split("@")[0];
    document.getElementById("userName").textContent = name.split(" ")[0];
    document.getElementById("userAvatar").textContent = name.charAt(0).toUpperCase();
    document.getElementById("userEmail").textContent = user.email;
  } else {
    show(document.getElementById("loggedOut"));
    hide(document.getElementById("loggedIn"));
  }
});

// ══════════════════════════════════════════════
// MODAL
// ══════════════════════════════════════════════
window.openModal = function(tab) { show(document.getElementById("modalOverlay")); switchTab(tab); };
window.closeModal = function()   { hide(document.getElementById("modalOverlay")); clearModalErrors(); };
window.closeModalOutside = function(e) { if (e.target === document.getElementById("modalOverlay")) closeModal(); };

window.switchTab = function(tab) {
  const isLogin = tab === "login";
  document.getElementById("tabLogin").classList.toggle("active", isLogin);
  document.getElementById("tabSignup").classList.toggle("active", !isLogin);
  document.getElementById("formLogin").classList.toggle("hidden", !isLogin);
  document.getElementById("formSignup").classList.toggle("hidden", isLogin);
  clearModalErrors();
};

function clearModalErrors() {
  document.getElementById("loginError").classList.add("hidden");
  document.getElementById("signupError").classList.add("hidden");
}
function showModalError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.remove("hidden");
}

window.toggleUserMenu = function() {
  document.getElementById("userMenu").classList.toggle("hidden");
};

document.addEventListener("click", e => {
  const pill = document.querySelector(".user-pill");
  const menu = document.getElementById("userMenu");
  if (pill && menu && !pill.contains(e.target)) menu.classList.add("hidden");
  const wrap = document.getElementById("threedotWrap");
  if (wrap && !wrap.contains(e.target)) document.getElementById("dotMenu").classList.add("hidden");
});

// ══════════════════════════════════════════════
// THREE-DOT MENU
// ══════════════════════════════════════════════
window.toggleDotMenu = function() {
  document.getElementById("dotMenu").classList.toggle("hidden");
};

// ══════════════════════════════════════════════
// SIDE PANEL
// ══════════════════════════════════════════════
let currentPanel = null;

window.openPanel = function(type) {
  document.getElementById("dotMenu").classList.add("hidden");
  currentPanel = type;
  const isSettings = type === "settings";
  document.getElementById("panelTitle").textContent = isSettings ? "Settings" : "Search History";
  document.getElementById("settingsContent").classList.toggle("hidden", !isSettings);
  document.getElementById("historyContent").classList.toggle("hidden", isSettings);
  if (!isSettings) renderHistory();
  document.getElementById("panelOverlay").classList.remove("hidden");
  document.getElementById("sidePanel").classList.remove("hidden");
};

window.closePanel = function() {
  document.getElementById("panelOverlay").classList.add("hidden");
  document.getElementById("sidePanel").classList.add("hidden");
  currentPanel = null;
};

// ══════════════════════════════════════════════
// SETTINGS
// ══════════════════════════════════════════════
const SETTINGS_KEY = "fakescope_settings";

function getSettings() {
  return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{"saveHistory":true,"autoClear":false}');
}
function saveSettings(s) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }

window.toggleSetting = function(key, el) {
  const s = getSettings();
  s[key] = !s[key];
  saveSettings(s);
  el.classList.toggle("active", s[key]);
};

function applySettingsUI() {
  const s = getSettings();
  document.getElementById("toggleHistory").classList.toggle("active", s.saveHistory);
  document.getElementById("toggleAutoClear").classList.toggle("active", s.autoClear);
}

// ══════════════════════════════════════════════
// HISTORY — Firestore + localStorage fallback
// ══════════════════════════════════════════════
const HISTORY_KEY = "fakescope_history";

function getLocalHistory() { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); }
function saveLocalHistory(h) { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)); }

async function addToHistory(text, data) {
  const s = getSettings();
  if (!s.saveHistory) return;
  const entry = {
    id: Date.now(),
    headline: text.slice(0, 120),
    score: data.credibilityScore,
    verdict: data.verdict,
    color: data.verdictColor,
    date: new Date().toLocaleDateString("en-IN", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" }),
    full: data,
    timestamp: Date.now(),
  };
  if (currentUser) {
    try {
      const ref = collection(db, "users", currentUser.uid, "history");
      await addDoc(ref, entry);
      return;
    } catch (err) { console.warn("Firestore failed, using localStorage:", err); }
  }
  const h = getLocalHistory();
  h.unshift(entry);
  if (h.length > 30) h.pop();
  saveLocalHistory(h);
}

async function getHistory() {
  if (currentUser) {
    try {
      const ref  = collection(db, "users", currentUser.uid, "history");
      const q    = query(ref, orderBy("timestamp", "desc"), limit(50));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), firestoreId: d.id }));
    } catch (err) { console.warn("Firestore read failed:", err); }
  }
  return getLocalHistory();
}

async function renderHistory() {
  const list = document.getElementById("historyList");
  list.innerHTML = '<div class="history-empty">Loading...</div>';
  const h = await getHistory();
  const search = (document.getElementById("historySearch")?.value || "").toLowerCase();
  const filtered = search ? h.filter(e => e.headline.toLowerCase().includes(search)) : h;
  if (filtered.length === 0) {
    list.innerHTML = '<div class="history-empty">No analyses yet. Paste a headline and click Analyse!</div>';
    return;
  }
  list.innerHTML = filtered.map(entry => `
    <div class="history-item" onclick="loadFromHistory(${entry.id})">
      <div class="hist-headline" title="${entry.headline}">${entry.headline}</div>
      <div class="hist-meta">
        <span class="hist-score" style="color:${resolveColor(entry.color)}">${entry.score}/100</span>
        <span class="hist-verdict">${entry.verdict || ""}</span>
        <span class="hist-date">${entry.date}</span>
        <button class="hist-delete" onclick="deleteHistoryItem(event,${entry.id},'${entry.firestoreId||""}')">&#10005;</button>
      </div>
    </div>
  `).join("");
}

window.loadFromHistory = async function(id) {
  const h = await getHistory();
  const entry = h.find(e => e.id === id);
  if (!entry) return;
  closePanel();
  document.getElementById("newsInput").value = entry.headline;
  charCount.textContent = entry.headline.length + " characters";
  renderResults(entry.full);
  window.scrollTo({ top:0, behavior:"smooth" });
};

window.deleteHistoryItem = async function(e, id, firestoreId) {
  e.stopPropagation();
  if (currentUser && firestoreId) {
    try { await deleteDoc(doc(db, "users", currentUser.uid, "history", firestoreId)); }
    catch (err) { console.warn(err); }
  } else {
    saveLocalHistory(getLocalHistory().filter(e => e.id !== id));
  }
  renderHistory();
};

window.clearAllHistory = async function() {
  if (currentUser) {
    try {
      const ref = collection(db, "users", currentUser.uid, "history");
      const snap = await getDocs(ref);
      await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
    } catch (err) { console.warn(err); }
  }
  localStorage.removeItem(HISTORY_KEY);
  if (currentPanel === "history") renderHistory();
};

// ══════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════
window.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem(THEME_KEY) || "dark";
  applyTheme(savedTheme);
  applySettingsUI();
});

// ══════════════════════════════════════════════
// WELCOME SCREEN
// ══════════════════════════════════════════════
const WELCOME_KEY = "fakescope_welcomed";

function showMainApp() {
  const welcome = document.getElementById("welcomeScreen");
  const main    = document.getElementById("mainApp");
  if (welcome) welcome.style.display = "none";
  if (main)    main.classList.remove("hidden");
}

window.skipWelcome = function() {
  localStorage.setItem(WELCOME_KEY, "true");
  showMainApp();
};

window.welcomeGoogle = async function() {
  try {
    await signInWithPopup(auth, provider);
    localStorage.setItem(WELCOME_KEY, "true");
    showMainApp();
  } catch (err) {
    alert("Google sign-in failed: " + err.message);
  }
};

window.showWelcomeModal = function(tab) {
  showMainApp();
  openModal(tab);
};

// Check on load — if already welcomed or logged in, skip welcome
window.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem(THEME_KEY) || "dark";
  applyTheme(savedTheme);
  applySettingsUI();

  // If user already skipped or logged in before, go straight to main app
  if (localStorage.getItem(WELCOME_KEY)) {
    showMainApp();
  }
});

// When user logs in via Firebase, auto-skip welcome
onAuthStateChanged(auth, user => {
  if (user) {
    localStorage.setItem(WELCOME_KEY, "true");
    showMainApp();
  }
});

// ══════════════════════════════════════════════
// NEWS PANEL
// ══════════════════════════════════════════════
let allNewsArticles = [];
let activeFilter = "all";

window.openNewsPanel = function() {
  document.getElementById("newsPanelOverlay").classList.remove("hidden");
  document.getElementById("newsPanel").classList.remove("hidden");
  if (allNewsArticles.length === 0) loadNews(false);
};

window.closeNewsPanel = function() {
  document.getElementById("newsPanelOverlay").classList.add("hidden");
  document.getElementById("newsPanel").classList.add("hidden");
};

window.loadNews = async function(showRefreshing) {
  const feed = document.getElementById("newsFeed");
  if (showRefreshing || allNewsArticles.length === 0) {
    feed.innerHTML = `<div class="news-loading"><div class="loader-ring" style="width:32px;height:32px;border-width:2px;"></div><p>Fetching latest news...</p></div>`;
  }

  try {
    const res  = await fetch("/api/news");
    const data = await res.json();
    allNewsArticles = data.articles || [];

    // Show notification dot
    const dot = document.getElementById("notifDot");
    if (dot && allNewsArticles.length > 0) dot.style.display = "block";

    renderNewsFeed();
  } catch (err) {
    feed.innerHTML = `<div class="news-empty">Could not load news. Make sure your server is running and has internet access.<br><br><button class="news-check-btn" onclick="loadNews(true)" style="margin-top:0.5rem;">Try Again</button></div>`;
  }
};

window.filterNews = function(category, btn) {
  activeFilter = category;
  document.querySelectorAll(".news-filter").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  renderNewsFeed();
};

function renderNewsFeed() {
  const feed = document.getElementById("newsFeed");
  const filtered = activeFilter === "all"
    ? allNewsArticles
    : allNewsArticles.filter(a => a.category === activeFilter);

  if (filtered.length === 0) {
    feed.innerHTML = `<div class="news-empty">No news found in this category.<br>Try refreshing or selecting another category.</div>`;
    return;
  }

  feed.innerHTML = filtered.map((article, i) => `
    <div class="news-item" id="newsitem-${i}">
      <div class="news-item-meta">
        <span class="news-source-badge">${article.source}</span>
        <span class="news-cat-badge">${article.category}</span>
        <span class="news-date">${article.pubDate}</span>
      </div>
      <div class="news-item-title">${article.title}</div>
      ${article.description ? `<div class="news-item-desc">${article.description}</div>` : ""}
      <div class="news-item-actions">
        <button class="news-check-btn" onclick="checkNewsItem(${i})">&#9888; Check if Fake</button>
        ${article.link ? `<a class="news-link-btn" href="${article.link}" target="_blank">&#128279; Read</a>` : ""}
      </div>
    </div>
  `).join("");
}

window.checkNewsItem = function(index) {
  const filtered = activeFilter === "all"
    ? allNewsArticles
    : allNewsArticles.filter(a => a.category === activeFilter);

  const article = filtered[index];
  if (!article) return;

  // Close news panel
  closeNewsPanel();

  // Switch to text tab and fill in the headline
  switchInputTab("text");
  const ta = document.getElementById("newsInput");
  ta.value = article.title + (article.description ? "\n\n" + article.description : "");
  document.getElementById("charCount").textContent = ta.value.length + " characters";

  // Scroll to top and trigger analysis
  window.scrollTo({ top: 0, behavior: "smooth" });

  // Small delay then auto-analyse
  setTimeout(() => {
    window.analyseNews();
  }, 500);
};

// Load news in background when app loads
window.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => loadNews(false), 2000);
});
