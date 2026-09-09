// Reading display preferences (font size / text color theme / spacing),
// persisted as one small JSON blob.
const savedReadingSettings = (function () {
  try {
    return JSON.parse(localStorage.getItem("bsa:readingSettings") || "{}");
  } catch (e) {
    return {};
  }
})();

// App state
const state = {
  view: "dashboard", // "dashboard" | "read" | "characters" | "notes"
  book: "Genesis",
  chapter: 1,
  translation: "web",
  verses: [],
  quiz: [],
  loading: false,
  error: null,
  notesTab: "verses", // "verses" | "quiz" | "progress"
  openNoteVerse: null, // verse number currently showing its note textarea
  charactersTab: "new", // "new" | "all"
  charFilterBook: "all",
  charSort: "book", // "book" | "alpha"
  openExplainVerse: null, // verse number currently showing its explanation
  commentary: null, // chapter-level commentary data, once fetched
  commentaryFor: null, // "book:chapter" the loaded commentary belongs to
  commentaryLoading: false,
  commentaryError: null,
  showVerseOfDay: true,
  votd: null, // { book, chapter, verse, text } once loaded
  votdLoading: true,
  narratorActive: false, // a chapter reading session is in progress (playing or paused)
  narratorPlaying: false, // actively speaking right now (vs. paused)
  narratorParagraphIndex: 0, // which paragraph of the current chapter is playing
  narratorRate: parseFloat(localStorage.getItem("bsa:narratorRate")) || 1,
  progressCollapsed: localStorage.getItem("bsa:progressCollapsed") === "true",
  showSettings: false,
  readingFontSize: savedReadingSettings.fontSize || "md", // "sm" | "md" | "lg" | "xl"
  readingColorTheme: savedReadingSettings.colorTheme || "default", // "default" | "sepia" | "contrast" | "soft"
  readingSpacing: savedReadingSettings.spacing || "normal", // "compact" | "normal" | "relaxed"
};

const debounceTimers = {};
function debounce(key, fn, delay = 400) {
  clearTimeout(debounceTimers[key]);
  debounceTimers[key] = setTimeout(fn, delay);
}

function bookByName(name) {
  return BIBLE_BOOKS.find((b) => b.name === name);
}

function translationName(id) {
  return (TRANSLATIONS.find((t) => t.id === id) || {}).name || id.toUpperCase();
}

async function loadChapter(book, chapter, translation) {
  state.book = book;
  state.chapter = chapter;
  state.translation = translation;
  state.loading = true;
  state.error = null;
  state.verses = [];
  state.quiz = [];
  state.openNoteVerse = null;
  state.openExplainVerse = null;
  state.commentary = null;
  state.commentaryFor = null;
  state.commentaryError = null;
  stopNarrator();
  hideDictPopup();
  Store.setLastPosition(book, chapter, translation);
  render();
  try {
    const verses = await BibleApi.fetchChapter(book, chapter, translation);
    state.verses = verses;
    const quizAttempts = Store.getQuizState(translation, book, chapter).attempts;
    state.quiz = generateQuiz(translation, book, chapter, verses, quizAttempts);
    // Reading progress is earned by completing the chapter's quiz (see
    // Store.setQuizAnswer), not just opening the page. The one exception is a
    // chapter too short to generate any quiz questions at all.
    if (state.quiz.length === 0) Store.markChapterRead(book, chapter);
  } catch (err) {
    state.error = err.message || "Something went wrong loading this chapter.";
  } finally {
    state.loading = false;
    render();
  }
}

function goToChapter(book, chapter, translation) {
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  loadChapter(book, chapter, translation || state.translation);
}

function changeBook(newBook) {
  goToChapter(newBook, 1, state.translation);
}

function changeChapter(newChapter) {
  goToChapter(state.book, newChapter, state.translation);
}

function changeTranslation(newTranslation) {
  goToChapter(state.book, state.chapter, newTranslation);
}

function prevChapter() {
  const idx = BIBLE_BOOKS.findIndex((b) => b.name === state.book);
  if (state.chapter > 1) {
    goToChapter(state.book, state.chapter - 1);
  } else if (idx > 0) {
    const prevBook = BIBLE_BOOKS[idx - 1];
    goToChapter(prevBook.name, prevBook.chapters);
  }
}

function nextChapter() {
  const idx = BIBLE_BOOKS.findIndex((b) => b.name === state.book);
  const book = BIBLE_BOOKS[idx];
  if (state.chapter < book.chapters) {
    goToChapter(state.book, state.chapter + 1);
  } else if (idx < BIBLE_BOOKS.length - 1) {
    goToChapter(BIBLE_BOOKS[idx + 1].name, 1);
  }
}

function applyHighlight(verseNum, start, end, color) {
  Store.setHighlightRange(state.book, state.chapter, verseNum, start, end, color);
  render();
}

function toggleNoteBox(verseNum) {
  state.openNoteVerse = state.openNoteVerse === verseNum ? null : verseNum;
  render();
}

async function loadCommentaryIfNeeded() {
  const chapterKey = `${state.book}:${state.chapter}`;
  if (state.commentaryFor === chapterKey || state.commentaryLoading) return;

  state.commentaryLoading = true;
  state.commentaryError = null;
  render();
  try {
    state.commentary = await CommentaryApi.fetchChapterCommentary(state.book, state.chapter);
    state.commentaryFor = chapterKey;
  } catch (err) {
    state.commentaryError = err.message || "Couldn't load an explanation right now.";
  } finally {
    state.commentaryLoading = false;
    render();
  }
}

function retryExplain() {
  state.commentaryError = null;
  loadCommentaryIfNeeded();
}

function saveVerseNote(verseNum, text) {
  debounce(`verse-note-${state.book}-${state.chapter}-${verseNum}`, () => {
    Store.setVerseData(state.book, state.chapter, verseNum, { note: text });
    renderSaveHint(`vnote-hint-${verseNum}`);
  });
}

function deleteNote(book, chapter, verseNum) {
  clearTimeout(debounceTimers[`verse-note-${book}-${chapter}-${verseNum}`]);
  Store.deleteVerseNote(book, chapter, verseNum);
  if (book === state.book && chapter === state.chapter) state.openNoteVerse = null;
  render();
}

function renderSaveHint(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = "Saved";
  clearTimeout(el._fadeTimer);
  el._fadeTimer = setTimeout(() => {
    if (el) el.textContent = "";
  }, 1500);
}

function answerQuiz(qIndex, optionIndex) {
  const q = state.quiz[qIndex];
  if (!q) return;
  const correct = optionIndex === q.correctIndex;
  Store.setQuizAnswer(state.translation, state.book, state.chapter, qIndex, optionIndex, correct, state.quiz.length);
  render();
}

function clearQuiz() {
  Store.clearQuizState(state.translation, state.book, state.chapter);
  const quizAttempts = Store.getQuizState(state.translation, state.book, state.chapter).attempts;
  state.quiz = generateQuiz(state.translation, state.book, state.chapter, state.verses, quizAttempts);
  render();
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Rendering ----------

// Whether the sticky header is in its scrolled-past-the-top, collapsed form.
// Lives outside `state` (and isn't re-derived on every render) because it's
// driven by a scroll listener that must NOT trigger a full re-render on every
// tick -- see handleHeaderScroll below.
let headerScrolled = false;

// Keeps --header-h glued to the header's *actual* rendered height at all
// times, including every intermediate frame of its collapse/expand
// transition -- not just guessed at via a timeout -- so the sticky narrator
// bar (top: var(--header-h), see styles.css) tracks it smoothly instead of
// jumping once the animation happens to finish.
const headerResizeObserver =
  "ResizeObserver" in window ? new ResizeObserver(() => updateHeaderHeightVar()) : null;

function render() {
  const app = document.getElementById("app");
  app.innerHTML = `
    ${state.showVerseOfDay ? renderVerseOfDayOverlay() : ""}
    ${state.showSettings ? renderSettingsOverlay() : ""}
    ${renderHeader()}
    <main>
      ${
        state.view === "dashboard"
          ? renderDashboardView()
          : state.view === "read"
          ? renderReadView()
          : state.view === "characters"
          ? renderCharactersView()
          : renderNotesView()
      }
    </main>
    <footer class="app-footer">
      Scripture text: ${escapeHtml(translationName(state.translation))} (public domain) via bible-api.com. Notes stay in this browser only.
    </footer>
  `;
  attachHandlers();
  updateHeaderHeightVar();
  if (headerResizeObserver) {
    headerResizeObserver.disconnect();
    const header = document.querySelector("header.top-bar");
    if (header) headerResizeObserver.observe(header);
  }
}

// Keeps --header-h in sync with the sticky header's actual rendered height, so
// the narrator bar (position: sticky, see styles.css) always docks directly
// under it -- whether the header is expanded or scroll-collapsed.
function updateHeaderHeightVar() {
  const header = document.querySelector("header.top-bar");
  if (header) document.documentElement.style.setProperty("--header-h", `${header.offsetHeight}px`);
}

// Collapses the header to a compact bar once the user scrolls a bit into the
// chapter, freeing screen space for reading; expands again near the top.
// Toggles the class directly (no render()) so scrolling stays smooth. Uses
// two different thresholds (rather than one) so small scroll fluctuations
// right at the boundary -- momentum scrolling, mobile rubber-banding -- don't
// make the header flicker collapsed/expanded/collapsed in a row.
function handleHeaderScroll() {
  const y = window.scrollY;
  const shouldCollapse = headerScrolled ? y > 20 : y > 60;
  if (shouldCollapse !== headerScrolled) {
    headerScrolled = shouldCollapse;
    document.querySelector("header.top-bar")?.classList.toggle("scrolled", headerScrolled);
  }
}

// ---------- Verse of the Day (welcome overlay) ----------

function pickVerseOfDayRef() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - startOfYear) / 86400000);
  return VERSE_OF_DAY_REFS[dayOfYear % VERSE_OF_DAY_REFS.length];
}

async function loadVerseOfDay() {
  const ref = pickVerseOfDayRef();
  try {
    const verses = await BibleApi.fetchChapter(ref.book, ref.chapter, state.translation || "web");
    const v = verses.find((x) => x.verse === ref.verse);
    state.votd = v ? { book: ref.book, chapter: ref.chapter, verse: ref.verse, text: v.text } : null;
  } catch (err) {
    state.votd = null;
  } finally {
    state.votdLoading = false;
    render();
  }
}

function closeVerseOfDay() {
  state.showVerseOfDay = false;
  render();
}

function goToVerseOfDay() {
  if (!state.votd) return;
  const { book, chapter, verse } = state.votd;
  state.showVerseOfDay = false;
  state.view = "read";
  loadChapter(book, chapter, state.translation).then(() => {
    document.querySelector(`.verse-text[data-verse="${verse}"]`)?.scrollIntoView({ block: "center" });
  });
}

// ---------- Reading settings (font size / text color / spacing) ----------

const READING_FONT_SIZES = [
  { id: "sm", label: "S" },
  { id: "md", label: "M" },
  { id: "lg", label: "L" },
  { id: "xl", label: "XL" },
];
const READING_COLOR_THEMES = [
  { id: "default", label: "Default" },
  { id: "sepia", label: "Sepia" },
  { id: "contrast", label: "High Contrast" },
  { id: "soft", label: "Soft" },
];
const READING_SPACINGS = [
  { id: "compact", label: "Compact" },
  { id: "normal", label: "Normal" },
  { id: "relaxed", label: "Relaxed" },
];

function openSettings() {
  state.showSettings = true;
  render();
}

function closeSettings() {
  state.showSettings = false;
  render();
}

function applyReadingSetting(key, value) {
  state[key] = value;
  localStorage.setItem(
    "bsa:readingSettings",
    JSON.stringify({
      fontSize: state.readingFontSize,
      colorTheme: state.readingColorTheme,
      spacing: state.readingSpacing,
    })
  );
  render();
}

function renderSettingsOptionRow(options, stateKey, activeValue) {
  return options
    .map(
      (o) =>
        `<button class="settings-opt-btn ${activeValue === o.id ? "active" : ""}" data-setting="${stateKey}" data-setting-value="${o.id}">${escapeHtml(o.label)}</button>`
    )
    .join("");
}

function renderSettingsOverlay() {
  return `
    <div class="settings-overlay">
      <div class="settings-card">
        <div class="settings-head">
          <span class="settings-title">Reading Settings</span>
          <button class="settings-close" data-settings-close aria-label="Close">&times;</button>
        </div>
        <div class="settings-group">
          <div class="settings-label">Font size</div>
          <div class="settings-opt-row">${renderSettingsOptionRow(READING_FONT_SIZES, "readingFontSize", state.readingFontSize)}</div>
        </div>
        <div class="settings-group">
          <div class="settings-label">Text color</div>
          <div class="settings-opt-row">${renderSettingsOptionRow(READING_COLOR_THEMES, "readingColorTheme", state.readingColorTheme)}</div>
        </div>
        <div class="settings-group">
          <div class="settings-label">Spacing</div>
          <div class="settings-opt-row">${renderSettingsOptionRow(READING_SPACINGS, "readingSpacing", state.readingSpacing)}</div>
        </div>
      </div>
    </div>
  `;
}

function renderVerseOfDayOverlay() {
  let inner;
  if (state.votdLoading) {
    inner = `<p class="votd-loading">Loading today's verse…</p>`;
  } else if (!state.votd) {
    inner = `<p class="votd-loading">Couldn't load today's verse right now.</p>`;
  } else {
    const { book, chapter, verse, text } = state.votd;
    inner = `
      <div class="votd-welcome">Welcome back</div>
      <div class="votd-label">Verse of the Day</div>
      <p class="votd-text">&ldquo;${escapeHtml(text)}&rdquo;</p>
      <p class="votd-ref">${escapeHtml(book)} ${chapter}:${verse}</p>
      <div class="votd-actions">
        <button class="votd-find-btn" data-votd-find>Find this verse</button>
        <button class="votd-continue-btn" data-votd-close>Continue to Dashboard</button>
      </div>
    `;
  }

  return `
    <div class="votd-overlay">
      <div class="votd-card">
        <button class="votd-close" data-votd-close aria-label="Close">&times;</button>
        ${inner}
      </div>
    </div>
  `;
}

function renderHeader() {
  const bookOptions = BIBLE_BOOKS.map(
    (b) => `<option value="${escapeHtml(b.name)}" ${b.name === state.book ? "selected" : ""}>${escapeHtml(b.name)}</option>`
  ).join("");

  const currentBook = bookByName(state.book) || BIBLE_BOOKS[0];
  const chapterOptions = Array.from({ length: currentBook.chapters }, (_, i) => i + 1)
    .map((c) => `<option value="${c}" ${c === state.chapter ? "selected" : ""}>${c}</option>`)
    .join("");

  const translationOptions = TRANSLATIONS.map(
    (t) => `<option value="${t.id}" ${t.id === state.translation ? "selected" : ""}>${escapeHtml(t.name)}</option>`
  ).join("");

  return `
    <header class="top-bar${headerScrolled ? " scrolled" : ""}">
      <div class="top-row">
        <div class="brand">📖 Verse by Verse</div>
        <button class="settings-btn" data-settings-open title="Reading settings" aria-label="Reading settings">⚙</button>
      </div>
      <div class="nav-links">
        <button data-nav="dashboard" class="${state.view === "dashboard" ? "active" : ""}">Dashboard</button>
        <button data-nav="read" class="${state.view === "read" ? "active" : ""}">Read</button>
        <button data-nav="characters" class="${state.view === "characters" ? "active" : ""}">Characters</button>
        <button data-nav="notes" class="${state.view === "notes" ? "active" : ""}">My Notes</button>
      </div>
      ${state.view === "read" ? renderHeaderProgress() : ""}
      ${
        state.view === "read"
          ? `
      <div class="picker-row">
        <select id="book-select">${bookOptions}</select>
        <select id="chapter-select">${chapterOptions}</select>
        <select id="translation-select" title="Translation">${translationOptions}</select>
        <button class="chapter-nav-btn" id="prev-btn" title="Previous chapter">&larr;</button>
        <button class="chapter-nav-btn" id="next-btn" title="Next chapter">&rarr;</button>
      </div>`
          : ""
      }
    </header>
  `;
}

function renderHeaderProgress() {
  const currentBook = bookByName(state.book) || BIBLE_BOOKS[0];
  const bookReadCounts = Store.getReadCountsByBook();
  const bookRead = bookReadCounts[currentBook.name] || 0;
  const bookPct = Math.round((bookRead / currentBook.chapters) * 100);

  const overallRead = Store.getReadCount();
  const overallPct = Math.round((overallRead / TOTAL_CHAPTERS) * 100);

  const quizStats = Store.getOverallQuizStats();
  const collapsed = state.progressCollapsed;

  return `
    <div class="header-progress ${collapsed ? "collapsed" : ""}">
      <button class="progress-toggle-btn" data-progress-toggle title="${collapsed ? "Show" : "Hide"} progress bars">
        <span class="progress-toggle-caret">${collapsed ? "▸" : "▾"}</span> ${collapsed ? "Show progress" : "Hide progress"}
      </button>
      ${
        collapsed
          ? ""
          : `
      <div class="mini-bar-row" title="${bookRead} of ${currentBook.chapters} chapters completed (quiz finished) in ${escapeHtml(currentBook.name)}">
        <span class="mini-bar-label">${escapeHtml(currentBook.name)}</span>
        <div class="mini-bar-track"><div class="mini-bar-fill read-fill" style="width:${bookPct}%"></div></div>
        <span class="mini-bar-value">${bookPct}% <small>(${bookRead}/${currentBook.chapters})</small></span>
      </div>
      <div class="mini-bar-row" title="${overallRead} of ${TOTAL_CHAPTERS} chapters completed (quiz finished) across the Bible">
        <span class="mini-bar-label">Bible</span>
        <div class="mini-bar-track"><div class="mini-bar-fill read-fill" style="width:${overallPct}%"></div></div>
        <span class="mini-bar-value">${overallPct}% <small>(${overallRead}/${TOTAL_CHAPTERS})</small></span>
      </div>
      <div class="mini-bar-row" title="${quizStats.sumBestCorrect} of ${quizStats.sumBestTotal} best-attempt answers correct across ${quizStats.chaptersQuizzed} quizzed chapters">
        <span class="mini-bar-label">Quiz score</span>
        <div class="mini-bar-track"><div class="mini-bar-fill quiz-fill" style="width:${quizStats.percentage}%"></div></div>
        <span class="mini-bar-value">${quizStats.sumBestTotal > 0 ? quizStats.percentage + "%" : "—"}</span>
      </div>`
      }
    </div>
  `;
}

function toggleProgressCollapsed() {
  state.progressCollapsed = !state.progressCollapsed;
  localStorage.setItem("bsa:progressCollapsed", String(state.progressCollapsed));
  render();
}

// ---------- Dashboard (landing page) ----------

function renderDashboardView() {
  const last = Store.getLastPosition();
  const lastBook = bookByName(last.book) || BIBLE_BOOKS[0];
  const bookReadCounts = Store.getReadCountsByBook();
  const lastBookRead = bookReadCounts[lastBook.name] || 0;
  const lastBookPct = Math.round((lastBookRead / lastBook.chapters) * 100);

  const quizStats = Store.getOverallQuizStats();

  const readCount = Store.getReadCount();
  const annotatedChapters = Store.getAnnotatedChapterCount();
  const notesPct = readCount > 0 ? Math.round((annotatedChapters / readCount) * 100) : 0;

  const continueRing = renderDashRingButton({
    action: "continue",
    percent: lastBookPct,
    centerText: `${lastBookPct}%`,
    colorClass: "ring-continue",
    heading: `${escapeHtml(last.book)} ${last.chapter}`,
    caption: "Continue Reading",
  });

  const quizRing = renderDashRingButton({
    action: "quiz",
    percent: quizStats.percentage,
    centerText: quizStats.sumBestTotal > 0 ? `${quizStats.percentage}%` : "—",
    colorClass: "ring-quiz",
    heading: "Quiz Score",
    caption:
      quizStats.chaptersQuizzed > 0
        ? `${quizStats.chaptersQuizzed} chapter${quizStats.chaptersQuizzed === 1 ? "" : "s"} quizzed`
        : "No quizzes yet",
  });

  const notesRing = renderDashRingButton({
    action: "notes",
    percent: notesPct,
    centerText: "📝",
    colorClass: "ring-notes",
    heading: "Notes &amp; Highlights",
    caption: `${annotatedChapters} chapter${annotatedChapters === 1 ? "" : "s"} annotated`,
  });

  return `
    <div class="dashboard-view">
      <h1 class="dashboard-title">Welcome back</h1>
      <p class="dashboard-sub">Here's your progress at a glance.</p>
      <div class="dash-ring-row">
        ${continueRing}
        ${quizRing}
        ${notesRing}
      </div>
    </div>
  `;
}

function renderDashRingButton({ action, percent, centerText, colorClass, heading, caption }) {
  const r = 45;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, percent || 0));
  const offset = circumference * (1 - clamped / 100);

  return `
    <button class="dash-ring-btn" data-dash-action="${action}">
      <div class="ring-wrap">
        <svg viewBox="0 0 100 100" class="ring-svg">
          <circle class="ring-track" cx="50" cy="50" r="${r}"></circle>
          <circle class="ring-fill ${colorClass}" cx="50" cy="50" r="${r}"
            stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"></circle>
        </svg>
        <div class="ring-center">${escapeHtml(centerText)}</div>
      </div>
      <div class="dash-ring-heading">${heading}</div>
      <div class="dash-ring-caption">${escapeHtml(caption)}</div>
    </button>
  `;
}

// ---------- Narrator (read-aloud via the browser's built-in text-to-speech) ----------

const SPEECH_SUPPORTED = "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
const NARRATOR_RATES = [0.75, 1, 1.25, 1.5];
let narratorVoices = []; // [0] holds the single voice used for narration
let narratorVerseOffsets = []; // [{ verse, start, end }] -- maps a boundary event's charIndex (into the joined paragraph text) back to a verse and local offset
let narratorActiveWordEl = null; // the .narr-word span currently highlighted as "being read"

function clearNarratorWordHighlight() {
  if (narratorActiveWordEl) narratorActiveWordEl.classList.remove("narr-word-active");
  narratorActiveWordEl = null;
}

// Web Speech fires a "word" boundary event (in browsers that support it) right
// as each word starts being spoken, with charIndex into the utterance text --
// used to highlight that word live in the reading paragraph.
function handleNarratorBoundary(e) {
  if (e.name && e.name !== "word") return;
  const vo = narratorVerseOffsets.find((o) => e.charIndex >= o.start && e.charIndex < o.end);
  if (!vo) return;
  const localOffset = e.charIndex - vo.start;
  const container = document.querySelector(`.verse-text[data-verse="${vo.verse}"]`);
  if (!container) return;
  const target = Array.from(container.querySelectorAll(".narr-word")).find(
    (w) => localOffset >= Number(w.dataset.wordStart) && localOffset < Number(w.dataset.wordEnd)
  );
  if (narratorActiveWordEl && narratorActiveWordEl !== target) narratorActiveWordEl.classList.remove("narr-word-active");
  if (target) {
    target.classList.add("narr-word-active");
    narratorActiveWordEl = target;
  }
}

function loadNarratorVoices() {
  if (!SPEECH_SUPPORTED) return;
  const all = window.speechSynthesis.getVoices();
  if (!all.length) return; // not ready yet; onvoiceschanged will retry
  const english = all.filter((v) => v.lang && v.lang.toLowerCase().startsWith("en"));
  narratorVoices = (english.length ? english : all).slice(0, 1);
  if (state.view === "read") render();
}

function stopNarrator() {
  if (SPEECH_SUPPORTED) window.speechSynthesis.cancel();
  state.narratorActive = false;
  state.narratorPlaying = false;
  state.narratorParagraphIndex = 0;
  clearNarratorWordHighlight();
  narratorVerseOffsets = [];
}

function speakParagraph(index) {
  if (!SPEECH_SUPPORTED) return;
  const paragraphs = chunkVersesIntoParagraphs(state.verses, CHAPTER_PARAGRAPH_SIZE);
  if (index < 0 || index >= paragraphs.length || !paragraphs.length) {
    stopNarrator();
    render();
    return;
  }
  window.speechSynthesis.cancel();
  state.narratorParagraphIndex = index;
  state.narratorActive = true;
  state.narratorPlaying = true;
  clearNarratorWordHighlight();

  const text = paragraphs[index].map((v) => v.text).join(" ");
  narratorVerseOffsets = [];
  let cursor = 0;
  paragraphs[index].forEach((v) => {
    narratorVerseOffsets.push({ verse: v.verse, start: cursor, end: cursor + v.text.length });
    cursor += v.text.length + 1; // +1 for the space chunkVersesIntoParagraphs' join(" ") inserts
  });

  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = state.narratorRate;
  const voice = narratorVoices[0];
  if (voice) utter.voice = voice;
  utter.onboundary = handleNarratorBoundary;
  utter.onend = () => {
    // Only auto-advance if this utterance wasn't cut off by cancel()/stop/skip.
    if (state.narratorActive && state.narratorPlaying && state.narratorParagraphIndex === index) {
      speakParagraph(index + 1);
    }
  };
  utter.onerror = () => {
    // Skipping/rewinding/stopping calls speechSynthesis.cancel() on this very
    // utterance, which fires "error" (not just "end") -- ignore that stale
    // event so it doesn't clobber the state a newer speakParagraph() call
    // already set.
    if (state.narratorParagraphIndex !== index) return;
    state.narratorPlaying = false;
    render();
  };
  window.speechSynthesis.speak(utter);
  render();
}

function toggleNarratorPlayPause() {
  if (!SPEECH_SUPPORTED || !state.verses.length) return;
  if (!state.narratorActive) {
    speakParagraph(0);
  } else if (state.narratorPlaying) {
    window.speechSynthesis.pause();
    state.narratorPlaying = false;
    render();
  } else {
    window.speechSynthesis.resume();
    state.narratorPlaying = true;
    render();
  }
}

function narratorPrevParagraph() {
  if (!state.narratorActive) return;
  speakParagraph(Math.max(0, state.narratorParagraphIndex - 1));
}

function narratorNextParagraph() {
  if (!state.narratorActive) return;
  speakParagraph(state.narratorParagraphIndex + 1);
}

function selectNarratorRate(rate) {
  state.narratorRate = rate;
  localStorage.setItem("bsa:narratorRate", String(rate));
  if (state.narratorActive) {
    speakParagraph(state.narratorParagraphIndex); // restart current paragraph at the new speed
  } else {
    render();
  }
}

function renderNarratorBar() {
  if (!SPEECH_SUPPORTED) return "";

  const playPauseLabel = !state.narratorActive ? "Read Aloud" : state.narratorPlaying ? "Pause" : "Resume";
  const playPauseIcon = state.narratorActive && state.narratorPlaying ? "⏸" : "▶";

  const rateButtons = NARRATOR_RATES.map(
    (r) =>
      `<button class="narrator-rate-btn ${state.narratorRate === r ? "active" : ""}" data-narrator-rate="${r}">${r}x</button>`
  ).join("");

  return `
    <div class="narrator-bar">
      <div class="narrator-controls">
        ${
          state.narratorActive
            ? `<button class="narrator-btn" data-narrator-action="prev" title="Previous paragraph">⏮</button>`
            : ""
        }
        <button class="narrator-btn narrator-play-btn" data-narrator-action="playpause">${playPauseIcon} ${playPauseLabel}</button>
        ${
          state.narratorActive
            ? `<button class="narrator-btn" data-narrator-action="next" title="Next paragraph">⏭</button>
               <button class="narrator-btn" data-narrator-action="stop" title="Stop">⏹</button>`
            : ""
        }
      </div>
      <div class="narrator-rates">
        <span class="narrator-rates-label">Speed:</span>
        ${rateButtons}
      </div>
    </div>
  `;
}

function renderReadView() {
  if (state.loading) {
    return `<p class="status-msg">Loading ${escapeHtml(state.book)} ${state.chapter}…</p>`;
  }
  if (state.error) {
    return `<p class="error-msg">${escapeHtml(state.error)}</p>`;
  }

  const paragraphs = chunkVersesIntoParagraphs(state.verses, CHAPTER_PARAGRAPH_SIZE);
  const paragraphsHtml = paragraphs.map((group, i) => renderParagraph(group, i)).join("");

  return `
    ${renderNarratorBar()}
    <h1 class="chapter-title">${escapeHtml(state.book)} ${state.chapter}</h1>
    <p class="chapter-hint">Select any text to highlight it, look up a word, explain the verse, or add a note.</p>
    <div id="verses" class="chapter-text font-${state.readingFontSize} theme-${state.readingColorTheme} spacing-${state.readingSpacing}">${paragraphsHtml}</div>
    ${renderQuizSection()}
    <div class="bottom-nav">
      <button id="bottom-prev">&larr; Previous chapter</button>
      <button id="bottom-next">Next chapter &rarr;</button>
    </div>
  `;
}

// Groups verses into fixed-size chunks so the chapter reads as flowing
// paragraphs instead of one row per verse. The source text has no real
// paragraph markers, so this is a readability heuristic, not a translator's
// actual paragraph breaks.
function chunkVersesIntoParagraphs(verses, size) {
  const groups = [];
  for (let i = 0; i < verses.length; i += size) {
    groups.push(verses.slice(i, i + size));
  }
  return groups;
}

function renderParagraph(group, index) {
  const isNarrating = state.narratorActive && state.narratorParagraphIndex === index;
  return `<div class="chapter-paragraph${isNarrating ? " narrating" : ""}">${group
    .map((v) => renderVerseBlock(v, isNarrating))
    .join(" ")}</div>`;
}

// A verse's inline text plus, when open, its note/explanation panel -- those
// panels are block-level so they naturally break the paragraph flow right
// after the verse they belong to, rather than living in a separate column.
function renderVerseBlock(v, isNarrating) {
  const data = Store.getVerseData(state.book, state.chapter, v.verse) || {};
  const noteOpen = state.openNoteVerse === v.verse;
  const explainOpen = state.openExplainVerse === v.verse;

  return `${renderVerseInline(v, data, isNarrating)}${explainOpen ? renderExplainBox(v.verse) : ""}${
    noteOpen ? renderNoteBox(v.verse, data) : ""
  }`;
}

function renderVerseInline(v, data, isNarrating) {
  const highlights = data.highlights || [];
  const hasNote = !!(data.note && data.note.trim());
  const noteIndicator = hasNote
    ? `<button class="note-indicator" data-note-toggle="${v.verse}" title="View note on verse ${v.verse}">📝</button>`
    : "";
  // While this verse's paragraph is being read aloud, swap in per-word spans
  // (instead of the highlight-color overlay) so the current word can be
  // marked live from the narrator's speech-boundary events.
  const textHtml = isNarrating ? renderNarratorWords(v.text) : renderHighlightedText(v.text, highlights);

  return `<span class="verse-inline"><sup class="verse-num-inline">${v.verse}</sup><span class="verse-text" data-verse="${v.verse}">${textHtml}</span>${noteIndicator}</span>`;
}

// Wraps each word of `text` in a span carrying its character offsets (within
// this same string), so the narrator's onboundary handler can look up and
// highlight the word currently being spoken.
function renderNarratorWords(text) {
  let html = "";
  const re = /\S+|\s+/g;
  let m;
  while ((m = re.exec(text))) {
    if (/\S/.test(m[0])) {
      html += `<span class="narr-word" data-word-start="${m.index}" data-word-end="${m.index + m[0].length}">${escapeHtml(m[0])}</span>`;
    } else {
      html += m[0];
    }
  }
  return html;
}

function renderNoteBox(verseNum, data) {
  return `
    <div class="verse-note-box">
      <div class="note-box-label">Note on verse ${verseNum}</div>
      <textarea data-note-verse="${verseNum}" placeholder="Your thoughts on this verse...">${escapeHtml(data.note || "")}</textarea>
      <div class="note-box-footer">
        <div class="save-hint" id="vnote-hint-${verseNum}"></div>
        <div class="note-box-actions">
          <button class="delete-note-btn" data-delete-note="${verseNum}">Delete note</button>
          <button class="note-close-btn" data-note-toggle="${verseNum}">Close</button>
        </div>
      </div>
    </div>
  `;
}

// Splits verse text into plain and highlighted spans per the verse's saved
// {start, end, color} ranges (assumed sorted, non-overlapping).
function renderHighlightedText(text, highlights) {
  if (!highlights.length) return escapeHtml(text);
  let html = "";
  let cursor = 0;
  highlights.forEach((h) => {
    if (h.start > cursor) html += escapeHtml(text.slice(cursor, h.start));
    html += `<span class="hl-span hl-${h.color}">${escapeHtml(text.slice(h.start, h.end))}</span>`;
    cursor = h.end;
  });
  if (cursor < text.length) html += escapeHtml(text.slice(cursor));
  return html;
}

function renderExplainBoxHead(verseNum) {
  return `
    <div class="explain-box-head">
      <span class="explain-box-label">Explanation of verse ${verseNum}</span>
      <button class="explain-close-btn" data-explain-close>&times;</button>
    </div>
  `;
}

function renderExplainBox(verseNum) {
  if (state.commentaryLoading) {
    return `<div class="explain-box">${renderExplainBoxHead(verseNum)}<p class="explain-loading">Looking up an explanation…</p></div>`;
  }
  if (state.commentaryError) {
    return `
      <div class="explain-box">
        ${renderExplainBoxHead(verseNum)}
        <p class="explain-error">${escapeHtml(state.commentaryError)}</p>
        <button class="explain-retry-btn" id="explain-retry-btn">Try again</button>
      </div>
    `;
  }
  const text = CommentaryApi.explainVerse(state.commentary, verseNum);
  if (!text) {
    return `<div class="explain-box">${renderExplainBoxHead(verseNum)}<p class="explain-loading">No explanation available for this verse.</p></div>`;
  }
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("");

  return `
    <div class="explain-box">
      ${renderExplainBoxHead(verseNum)}
      ${paragraphs}
      <p class="explain-source">Jamieson-Fausset-Brown Bible Commentary (1871, public domain)</p>
    </div>
  `;
}

function closeExplainBox() {
  state.openExplainVerse = null;
  render();
}

function openExplainForVerse(verseNum) {
  state.openExplainVerse = verseNum;
  render();
  loadCommentaryIfNeeded();
}

function openNoteForVerse(verseNum) {
  state.openNoteVerse = verseNum;
  render();
  const ta = document.querySelector(`[data-note-verse="${verseNum}"]`);
  if (ta) {
    ta.focus();
    const len = ta.value.length;
    ta.setSelectionRange(len, len);
  }
}

function renderQuizSection() {
  if (!state.quiz.length) {
    return `
      <section class="reflection">
        <h2>Chapter Quiz</h2>
        <p class="hint">This chapter was too short to generate quiz questions.</p>
      </section>
    `;
  }

  const quizState = Store.getQuizState(state.translation, state.book, state.chapter);
  const answers = quizState.answers || {};
  const answeredCount = Object.keys(answers).length;
  const correctCount = Object.values(answers).filter((a) => a.correct).length;
  const allAnswered = answeredCount >= state.quiz.length;
  const hasBest = quizState.attempts > 0;

  const questionsHtml = state.quiz
    .map((q, qIndex) => renderQuizQuestion(q, qIndex, answers[qIndex]))
    .join("");

  const bestLine = hasBest
    ? `<span class="quiz-best-line">Best: ${quizState.bestCorrect}/${quizState.bestTotal} · ${quizState.attempts} attempt${quizState.attempts === 1 ? "" : "s"}</span>`
    : "";

  return `
    <section class="reflection">
      <h2>Chapter Quiz</h2>
      <p class="hint">Fill in the blank from the text of ${escapeHtml(state.book)} ${state.chapter} to check you read closely.</p>
      ${
        allAnswered
          ? `<div class="quiz-score-banner">
              <span>Score: ${correctCount} / ${state.quiz.length} correct ${bestLine}</span>
              <button class="quiz-clear-btn" id="quiz-clear-btn">Retake quiz</button>
            </div>`
          : `<div class="quiz-progress">${answeredCount} / ${state.quiz.length} answered ${bestLine}</div>`
      }
      ${questionsHtml}
    </section>
  `;
}

function renderQuizQuestion(q, qIndex, answer) {
  const answered = !!answer;
  const optionsHtml = q.options
    .map((opt, optIndex) => {
      let cls = "quiz-option-btn";
      if (answered) {
        if (optIndex === q.correctIndex) cls += " correct";
        else if (optIndex === answer.selected) cls += " incorrect";
      }
      return `<button class="${cls}" data-quiz-q="${qIndex}" data-quiz-opt="${optIndex}" ${answered ? "disabled" : ""}>${escapeHtml(opt)}</button>`;
    })
    .join("");

  return `
    <div class="quiz-question-card">
      <div class="quiz-prompt"><span class="quiz-q-num">${qIndex + 1}.</span> ${escapeHtml(q.prompt)} <span class="quiz-verse-tag">(v${q.verse})</span></div>
      <div class="quiz-options">${optionsHtml}</div>
      ${
        answered
          ? `<div class="quiz-feedback ${answer.correct ? "is-correct" : "is-incorrect"}">${
              answer.correct ? "Correct!" : `Not quite — the answer was "${escapeHtml(q.options[q.correctIndex])}".`
            }</div>`
          : ""
      }
    </div>
  `;
}

function isCharacterMet(character, maxReadByBook) {
  return (maxReadByBook[character.book] || 0) >= character.chapter;
}

function bookOrderIndex(bookName) {
  return BIBLE_BOOKS.findIndex((b) => b.name === bookName);
}

function renderCharactersView() {
  const tabs = `
    <div class="notes-tabs">
      <button data-chars-tab="new" class="${state.charactersTab === "new" ? "active" : ""}">New Characters</button>
      <button data-chars-tab="all" class="${state.charactersTab === "all" ? "active" : ""}">All Characters</button>
    </div>
  `;

  const body = state.charactersTab === "new" ? renderNewCharactersTab() : renderAllCharactersTab();

  return `
    <div class="notes-page">
      <h1>Bible Characters</h1>
      ${tabs}
      ${body}
    </div>
  `;
}

function renderNewCharactersTab() {
  const maxReadByBook = Store.getMaxReadChapterPerBook();
  const met = BIBLE_CHARACTERS.filter((c) => isCharacterMet(c, maxReadByBook)).sort(
    (a, b) => bookOrderIndex(a.book) - bookOrderIndex(b.book) || a.chapter - b.chapter
  );

  return `
    <p class="hint">People revealed so far, in the order you've read them. Finish a chapter's quiz to reveal more.</p>
    <div class="char-progress-banner">${met.length} / ${BIBLE_CHARACTERS.length} characters revealed</div>
    ${
      met.length
        ? met.map((c) => renderCharacterCard(c, true)).join("")
        : `<p class="empty-state">Nobody yet — finish a chapter's quiz to reveal its characters here.</p>`
    }
  `;
}

function renderAllCharactersTab() {
  const maxReadByBook = Store.getMaxReadChapterPerBook();
  const bookOptions = BIBLE_BOOKS.map(
    (b) => `<option value="${escapeHtml(b.name)}" ${state.charFilterBook === b.name ? "selected" : ""}>${escapeHtml(b.name)}</option>`
  ).join("");

  let list = BIBLE_CHARACTERS.slice();
  if (state.charFilterBook !== "all") {
    list = list.filter((c) => c.book === state.charFilterBook);
  }
  if (state.charSort === "alpha") {
    list.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    list.sort((a, b) => bookOrderIndex(a.book) - bookOrderIndex(b.book) || a.chapter - b.chapter);
  }

  return `
    <div class="char-filter-row">
      <select id="char-book-filter">
        <option value="all" ${state.charFilterBook === "all" ? "selected" : ""}>All books</option>
        ${bookOptions}
      </select>
      <div class="char-sort-toggle">
        <button data-char-sort="book" class="${state.charSort === "book" ? "active" : ""}">By book</button>
        <button data-char-sort="alpha" class="${state.charSort === "alpha" ? "active" : ""}">A&ndash;Z</button>
      </div>
      <span class="char-count-label">${list.length} character${list.length === 1 ? "" : "s"}</span>
    </div>
    ${
      list.length
        ? list.map((c) => renderCharacterCard(c, isCharacterMet(c, maxReadByBook))).join("")
        : `<p class="empty-state">No characters match this filter.</p>`
    }
  `;
}

function renderCharacterCard(c, met) {
  return `
    <div class="note-card char-card">
      <div class="char-card-head">
        <span class="char-name">${escapeHtml(c.name)}</span>
        ${met ? `<span class="char-met-badge met">Met</span>` : `<span class="char-met-badge">Not yet read</span>`}
      </div>
      <button class="ref char-ref" data-jump-book="${escapeHtml(c.book)}" data-jump-chapter="${c.chapter}">
        First appears: ${escapeHtml(c.book)} ${c.chapter}
      </button>
      <div class="note-text">${escapeHtml(c.importance)}</div>
    </div>
  `;
}

function renderNotesView() {
  const tabs = `
    <div class="notes-tabs">
      <button data-notes-tab="verses" class="${state.notesTab === "verses" ? "active" : ""}">Verse notes &amp; highlights</button>
      <button data-notes-tab="quiz" class="${state.notesTab === "quiz" ? "active" : ""}">Quiz results</button>
      <button data-notes-tab="progress" class="${state.notesTab === "progress" ? "active" : ""}">Progress</button>
    </div>
  `;

  let body;
  if (state.notesTab === "verses") {
    const items = Store.listAllAnnotatedVerses();
    body = items.length
      ? items.map((item) => renderVerseNoteCard(item)).join("")
      : `<p class="empty-state">No highlights or verse notes yet. Open a chapter and start reading.</p>`;
  } else if (state.notesTab === "quiz") {
    const items = Store.listAllQuizResults();
    body = items.length
      ? items.map((item) => renderQuizResultCard(item)).join("")
      : `<p class="empty-state">No quizzes taken yet.</p>`;
  } else {
    body = renderProgressTab();
  }

  return `
    <div class="notes-page">
      <h1>My Notes</h1>
      ${tabs}
      ${body}
      <div class="data-tools">
        <button id="export-btn">Export all notes (.json)</button>
        <label class="chapter-nav-btn" style="cursor:pointer;">
          Import notes
          <input type="file" id="import-input" accept="application/json" style="display:none;">
        </label>
      </div>
    </div>
  `;
}

function renderVerseNoteCard(item) {
  const highlights = item.highlights || [];
  let highlightsHtml = "";
  if (highlights.length) {
    const cached = Store.getCachedChapter(state.translation, item.book, item.chapter);
    const verseObj = cached && cached.verses.find((v) => v.verse === item.verse);
    if (verseObj) {
      const spans = highlights
        .map((h) => `<span class="hl-span hl-${h.color}">${escapeHtml(verseObj.text.slice(h.start, h.end))}</span>`)
        .join(" &hellip; ");
      highlightsHtml = `<div class="verse-preview">${spans}</div>`;
    } else {
      highlightsHtml = `<div class="verse-preview">${highlights.length} highlighted section${highlights.length === 1 ? "" : "s"}</div>`;
    }
  }
  const hasNote = item.note && item.note.trim();
  return `
    <div class="note-card">
      <div class="note-card-head">
        <button class="ref" data-jump-book="${escapeHtml(item.book)}" data-jump-chapter="${item.chapter}" data-jump-verse="${item.verse}">
          ${escapeHtml(item.book)} ${item.chapter}:${item.verse}
        </button>
        ${
          hasNote
            ? `<button class="delete-note-btn" data-delete-note-card="${escapeHtml(item.book)}:${item.chapter}:${item.verse}">Delete note</button>`
            : ""
        }
      </div>
      ${highlightsHtml}
      ${hasNote ? `<div class="note-text">${escapeHtml(item.note)}</div>` : ""}
    </div>
  `;
}

function renderQuizResultCard(item) {
  const inProgress = item.inProgressAnswered > 0 && item.inProgressAnswered < item.bestTotal;
  return `
    <div class="note-card">
      <button class="ref" data-jump-book="${escapeHtml(item.book)}" data-jump-chapter="${item.chapter}" data-jump-translation="${escapeHtml(item.translation)}">
        ${escapeHtml(item.book)} ${item.chapter}
      </button>
      <div class="verse-preview">${escapeHtml(translationName(item.translation))}</div>
      ${
        item.attempts > 0
          ? `<div class="note-text">Best score: ${item.bestCorrect} / ${item.bestTotal} · ${item.attempts} attempt${item.attempts === 1 ? "" : "s"}</div>`
          : ""
      }
      ${inProgress ? `<div class="verse-preview">In progress: ${item.inProgressCorrect}/${item.inProgressAnswered} so far</div>` : ""}
    </div>
  `;
}

function renderProgressTab() {
  const readCount = Store.getReadCount();
  const readPct = Math.round((readCount / TOTAL_CHAPTERS) * 100);
  const quizStats = Store.getOverallQuizStats();
  const byBook = Store.getReadCountsByBook();

  const testamentSummary = (testament) => {
    const books = BIBLE_BOOKS.filter((b) => b.testament === testament);
    const total = books.reduce((s, b) => s + b.chapters, 0);
    const read = books.reduce((s, b) => s + (byBook[b.name] || 0), 0);
    return { total, read };
  };
  const ot = testamentSummary("OT");
  const nt = testamentSummary("NT");

  const bookRows = BIBLE_BOOKS.map((b) => {
    const read = byBook[b.name] || 0;
    const pct = Math.round((read / b.chapters) * 100);
    return `
      <div class="book-progress-row">
        <button class="book-progress-name" data-jump-book="${escapeHtml(b.name)}" data-jump-chapter="1">${escapeHtml(b.name)}</button>
        <div class="mini-bar-track"><div class="mini-bar-fill read-fill" style="width:${pct}%"></div></div>
        <span class="mini-bar-value">${pct}% <small>(${read}/${b.chapters})</small></span>
      </div>
    `;
  }).join("");

  return `
    <div class="progress-summary-card">
      <h2>Reading progress</h2>
      <div class="big-bar-row">
        <div class="mini-bar-track big"><div class="mini-bar-fill read-fill" style="width:${readPct}%"></div></div>
        <span class="mini-bar-value">${readCount} / ${TOTAL_CHAPTERS} chapters (${readPct}%)</span>
      </div>
      <p class="hint">Old Testament: ${ot.read}/${ot.total} &nbsp;·&nbsp; New Testament: ${nt.read}/${nt.total}</p>
      <p class="hint">A chapter counts once you finish its quiz -- just opening the page doesn't count.</p>
    </div>

    <div class="progress-summary-card">
      <h2>Quiz score</h2>
      <div class="big-bar-row">
        <div class="mini-bar-track big"><div class="mini-bar-fill quiz-fill" style="width:${quizStats.percentage}%"></div></div>
        <span class="mini-bar-value">${quizStats.sumBestTotal > 0 ? quizStats.percentage + "%" : "No quizzes yet"}</span>
      </div>
      <p class="hint">
        ${quizStats.sumBestCorrect} / ${quizStats.sumBestTotal} best-attempt answers correct across ${quizStats.chaptersQuizzed} chapter${quizStats.chaptersQuizzed === 1 ? "" : "s"}
        &nbsp;·&nbsp; ${quizStats.totalAttempts} total attempt${quizStats.totalAttempts === 1 ? "" : "s"}
      </p>
      <p class="hint">This score only goes up — retaking a chapter's quiz and beating your best raises it.</p>
    </div>

    <div class="progress-summary-card">
      <h2>By book</h2>
      <div class="book-progress-list">${bookRows}</div>
    </div>
  `;
}

// ---------- Event wiring ----------

function attachHandlers() {
  const progressToggleBtn = document.querySelector("[data-progress-toggle]");
  if (progressToggleBtn) progressToggleBtn.addEventListener("click", toggleProgressCollapsed);

  document.querySelectorAll("[data-narrator-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.narratorAction;
      if (action === "playpause") toggleNarratorPlayPause();
      else if (action === "prev") narratorPrevParagraph();
      else if (action === "next") narratorNextParagraph();
      else if (action === "stop") {
        stopNarrator();
        render();
      }
    });
  });

  document.querySelectorAll("[data-narrator-rate]").forEach((btn) => {
    btn.addEventListener("click", () => selectNarratorRate(Number(btn.dataset.narratorRate)));
  });

  const settingsOpenBtn = document.querySelector("[data-settings-open]");
  if (settingsOpenBtn) settingsOpenBtn.addEventListener("click", openSettings);

  document.querySelectorAll("[data-settings-close]").forEach((btn) => {
    btn.addEventListener("click", closeSettings);
  });

  const settingsOverlay = document.querySelector(".settings-overlay");
  if (settingsOverlay) {
    settingsOverlay.addEventListener("click", (e) => {
      if (e.target === settingsOverlay) closeSettings();
    });
  }

  document.querySelectorAll("[data-setting]").forEach((btn) => {
    btn.addEventListener("click", () => applyReadingSetting(btn.dataset.setting, btn.dataset.settingValue));
  });

  document.querySelectorAll("[data-votd-close]").forEach((btn) => {
    btn.addEventListener("click", closeVerseOfDay);
  });
  const votdFindBtn = document.querySelector("[data-votd-find]");
  if (votdFindBtn) votdFindBtn.addEventListener("click", goToVerseOfDay);
  const votdOverlay = document.querySelector(".votd-overlay");
  if (votdOverlay) {
    votdOverlay.addEventListener("click", (e) => {
      if (e.target === votdOverlay) closeVerseOfDay();
    });
  }

  document.querySelectorAll("[data-nav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.view = btn.dataset.nav;
      render();
    });
  });

  document.querySelectorAll("[data-dash-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.dashAction;
      if (action === "continue") {
        const last = Store.getLastPosition();
        state.view = "read";
        goToChapter(last.book, last.chapter, last.translation);
      } else if (action === "quiz") {
        state.view = "notes";
        state.notesTab = "quiz";
        render();
      } else if (action === "notes") {
        state.view = "notes";
        state.notesTab = "verses";
        render();
      }
    });
  });

  const bookSelect = document.getElementById("book-select");
  if (bookSelect) bookSelect.addEventListener("change", (e) => changeBook(e.target.value));

  const chapterSelect = document.getElementById("chapter-select");
  if (chapterSelect) chapterSelect.addEventListener("change", (e) => changeChapter(Number(e.target.value)));

  const translationSelect = document.getElementById("translation-select");
  if (translationSelect) translationSelect.addEventListener("change", (e) => changeTranslation(e.target.value));

  const prevBtn = document.getElementById("prev-btn");
  if (prevBtn) prevBtn.addEventListener("click", prevChapter);
  const nextBtn = document.getElementById("next-btn");
  if (nextBtn) nextBtn.addEventListener("click", nextChapter);
  const bottomPrev = document.getElementById("bottom-prev");
  if (bottomPrev) bottomPrev.addEventListener("click", prevChapter);
  const bottomNext = document.getElementById("bottom-next");
  if (bottomNext) bottomNext.addEventListener("click", nextChapter);

  document.querySelectorAll("[data-note-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => toggleNoteBox(Number(btn.dataset.noteToggle)));
  });

  document.querySelectorAll("[data-note-verse]").forEach((ta) => {
    ta.addEventListener("input", (e) => saveVerseNote(Number(ta.dataset.noteVerse), e.target.value));
  });

  document.querySelectorAll("[data-delete-note]").forEach((btn) => {
    btn.addEventListener("click", () => deleteNote(state.book, state.chapter, Number(btn.dataset.deleteNote)));
  });

  document.querySelectorAll("[data-delete-note-card]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const [book, chapter, verse] = btn.dataset.deleteNoteCard.split(":");
      deleteNote(book, Number(chapter), Number(verse));
    });
  });

  document.querySelectorAll("[data-explain-close]").forEach((btn) => {
    btn.addEventListener("click", closeExplainBox);
  });

  const explainRetryBtn = document.getElementById("explain-retry-btn");
  if (explainRetryBtn) explainRetryBtn.addEventListener("click", retryExplain);

  document.querySelectorAll("[data-quiz-q]").forEach((btn) => {
    btn.addEventListener("click", () => answerQuiz(Number(btn.dataset.quizQ), Number(btn.dataset.quizOpt)));
  });

  const quizClearBtn = document.getElementById("quiz-clear-btn");
  if (quizClearBtn) quizClearBtn.addEventListener("click", clearQuiz);

  document.querySelectorAll("[data-notes-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.notesTab = btn.dataset.notesTab;
      render();
    });
  });

  document.querySelectorAll("[data-chars-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.charactersTab = btn.dataset.charsTab;
      render();
    });
  });

  const charBookFilter = document.getElementById("char-book-filter");
  if (charBookFilter) {
    charBookFilter.addEventListener("change", (e) => {
      state.charFilterBook = e.target.value;
      render();
    });
  }

  document.querySelectorAll("[data-char-sort]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.charSort = btn.dataset.charSort;
      render();
    });
  });

  document.querySelectorAll("[data-jump-book]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.view = "read";
      const verse = btn.dataset.jumpVerse ? Number(btn.dataset.jumpVerse) : null;
      const translation = btn.dataset.jumpTranslation || state.translation;
      loadChapter(btn.dataset.jumpBook, Number(btn.dataset.jumpChapter), translation).then(() => {
        if (verse) {
          state.openNoteVerse = verse;
          render();
          document.querySelector(`[data-note-verse="${verse}"]`)?.scrollIntoView({ block: "center" });
        }
      });
    });
  });

  const exportBtn = document.getElementById("export-btn");
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      const data = Store.exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bible-study-notes-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  }

  const importInput = document.getElementById("import-input");
  if (importInput) {
    importInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          Store.importAll(data);
          render();
        } catch (err) {
          alert("Could not read that file as valid notes export.");
        }
      };
      reader.readAsText(file);
    });
  }
}

// ---------- Text selection popup: highlight a range and/or look up a word ----------
// Lives outside the normal render() cycle since it tracks a live text selection.

let dictPopupEl = null;
let currentSelection = null; // { book, chapter, verse, start, end, text }

// Returns the character offset of (node, offset) relative to the start of container's text.
function textOffsetWithin(container, node, offset) {
  const range = document.createRange();
  range.selectNodeContents(container);
  range.setEnd(node, offset);
  return range.toString().length;
}

function initDictionaryPopup() {
  dictPopupEl = document.createElement("div");
  dictPopupEl.id = "dict-popup";
  dictPopupEl.hidden = true;
  document.body.appendChild(dictPopupEl);
  // Keep the browser selection visible while interacting with the popup's
  // buttons on desktop. (Not done for touch: calling preventDefault() on
  // touchstart suppresses the browser's synthesized click event entirely on
  // some mobile browsers, so buttons would silently stop responding to taps.
  // It's unnecessary anyway -- our handlers use the `currentSelection` object
  // captured at selection-time, not a live re-read of window.getSelection().)
  dictPopupEl.addEventListener("mousedown", (e) => e.preventDefault());

  // `selectionchange` fires for every input method (mouse drag, double-click,
  // keyboard, and -- unlike "mouseup" -- touch: mobile selects text via a
  // long-press-and-drag gesture that never fires a mouseup at all. Debounced
  // so we react once the selection has settled rather than on every tick of
  // a drag or of the mobile selection handles being adjusted.
  let selectionDebounce = null;
  document.addEventListener("selectionchange", () => {
    clearTimeout(selectionDebounce);
    selectionDebounce = setTimeout(handleVerseSelection, 300);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      hideDictPopup();
      if (state.showVerseOfDay) closeVerseOfDay();
      if (state.showSettings) closeSettings();
    }
  });

  // Long-pressing verse text on mobile can trigger the browser/OS's own
  // native selection menu (copy/share/etc.), which pops up over our custom
  // popup and steals the next tap -- suppress it there so our popup (from
  // handleVerseSelection above) is the only UI offered on a selection.
  document.addEventListener("contextmenu", (e) => {
    if (e.target.closest && e.target.closest(".verse-text")) e.preventDefault();
  });
}

function hideDictPopup() {
  if (dictPopupEl) dictPopupEl.hidden = true;
  currentSelection = null;
}

function elementOf(node) {
  return node && (node.nodeType === 3 ? node.parentElement : node);
}

function handleVerseSelection() {
  const sel = window.getSelection();
  const text = sel && sel.toString();
  if (!text || !text.trim() || sel.isCollapsed) {
    hideDictPopup();
    return;
  }
  const range = sel.getRangeAt(0);

  // A touch drag easily starts or ends a hair outside the verse's own text
  // node -- e.g. right on the small superscript verse number just before it,
  // or the note icon just after it -- which used to make the whole selection
  // silently not count as highlightable. Fall back through the start
  // container, end container, and finally the range's common ancestor to
  // find which verse this selection belongs to.
  const verseTextEl =
    elementOf(range.startContainer)?.closest(".verse-text") ||
    elementOf(range.endContainer)?.closest(".verse-text") ||
    elementOf(range.commonAncestorContainer)?.closest(".verse-text") ||
    elementOf(range.commonAncestorContainer)?.querySelector(".verse-text");
  if (!verseTextEl) {
    hideDictPopup();
    return;
  }

  // Clamp each endpoint into verseTextEl's own text when it actually landed
  // outside it (e.g. on the verse-number label or the note icon button).
  const start = verseTextEl.contains(range.startContainer)
    ? textOffsetWithin(verseTextEl, range.startContainer, range.startOffset)
    : 0;
  const end = verseTextEl.contains(range.endContainer)
    ? textOffsetWithin(verseTextEl, range.endContainer, range.endOffset)
    : verseTextEl.textContent.length;
  currentSelection = {
    book: state.book,
    chapter: state.chapter,
    verse: Number(verseTextEl.dataset.verse),
    start: Math.min(start, end),
    end: Math.max(start, end),
    text: text.trim(),
  };

  const rect = range.getBoundingClientRect();
  showSelectionPopup(rect);
}

function showSelectionPopup(rect) {
  dictPopupEl.hidden = false;
  const isSingleWord = /^[A-Za-z']+$/.test(currentSelection.text);
  dictPopupEl.innerHTML = renderSelectionPopupShell(isSingleWord);
  positionDictPopup(rect);
  attachSelectionPopupHandlers();
  if (isSingleWord) loadDefinitionInto(currentSelection.text);
}

function renderSelectionPopupShell(isSingleWord) {
  const swatches = HIGHLIGHT_COLORS.map(
    (c) => `<button class="hl-swatch ${c.id}" data-apply-hl="${c.id}" title="${c.label}" aria-label="Highlight ${c.label}"></button>`
  ).join("");
  const existingNote = Store.getVerseData(state.book, state.chapter, currentSelection.verse) || {};
  const hasNote = !!(existingNote.note && existingNote.note.trim());

  return `
    <div class="dict-head">
      <span class="dict-word">${escapeHtml(currentSelection.text)}</span>
      <button class="dict-close" data-dict-close aria-label="Close">&times;</button>
    </div>
    <div class="hl-swatch-row">
      ${swatches}
      <button class="hl-swatch hl-erase" data-apply-hl="" title="Remove highlight" aria-label="Remove highlight">&times;</button>
    </div>
    <div class="popup-verse-actions">
      <button class="popup-action-btn" data-popup-explain>? Explain verse ${currentSelection.verse}</button>
      <button class="popup-action-btn" data-popup-note>${hasNote ? "View/edit note" : "+ Add note"}</button>
    </div>
    <div id="dict-def-area">${isSingleWord ? "" : `<p class="dict-none">Select a single word to see its definition.</p>`}</div>
  `;
}

async function loadDefinitionInto(word) {
  const area = dictPopupEl.querySelector("#dict-def-area");
  if (!area) return;
  area.innerHTML = `<div class="dict-loading">Looking up &ldquo;${escapeHtml(word)}&rdquo;…</div>`;
  try {
    const entries = await DictionaryApi.lookup(word);
    if (dictPopupEl.hidden) return; // dismissed while the lookup was in flight
    const target = dictPopupEl.querySelector("#dict-def-area");
    if (target) target.innerHTML = renderDefinitionEntries(entries);
  } catch (err) {
    const target = dictPopupEl.querySelector("#dict-def-area");
    if (target) target.innerHTML = `<div class="dict-error">Couldn't look that up right now.</div>`;
  }
}

function renderDefinitionEntries(entries) {
  if (!entries.length) {
    return `<p class="dict-none">No dictionary entry found for this word.</p>`;
  }
  const body = entries
    .map(
      (e) => `
      <div class="dict-entry">
        ${e.partOfSpeech ? `<div class="dict-pos">${escapeHtml(e.partOfSpeech)}</div>` : ""}
        <ol>${e.definitions.map((d) => `<li>${escapeHtml(d)}</li>`).join("")}</ol>
      </div>
    `
    )
    .join("");
  return `${body}<div class="dict-credit">Wiktionary</div>`;
}

function attachSelectionPopupHandlers() {
  const closeBtn = dictPopupEl.querySelector("[data-dict-close]");
  if (closeBtn) closeBtn.addEventListener("click", () => window.getSelection().removeAllRanges());

  dictPopupEl.querySelectorAll("[data-apply-hl]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!currentSelection) return;
      const color = btn.dataset.applyHl || null;
      applyHighlight(currentSelection.verse, currentSelection.start, currentSelection.end, color);
      window.getSelection().removeAllRanges();
      hideDictPopup();
    });
  });

  const explainBtn = dictPopupEl.querySelector("[data-popup-explain]");
  if (explainBtn) {
    explainBtn.addEventListener("click", () => {
      if (!currentSelection) return;
      const verseNum = currentSelection.verse;
      window.getSelection().removeAllRanges();
      hideDictPopup();
      openExplainForVerse(verseNum);
    });
  }

  const noteBtn = dictPopupEl.querySelector("[data-popup-note]");
  if (noteBtn) {
    noteBtn.addEventListener("click", () => {
      if (!currentSelection) return;
      const verseNum = currentSelection.verse;
      window.getSelection().removeAllRanges();
      hideDictPopup();
      openNoteForVerse(verseNum);
    });
  }
}

function positionDictPopup(rect) {
  const margin = 8;
  const popupWidth = 280;
  let left = rect.left + window.scrollX;
  const maxLeft = window.scrollX + document.documentElement.clientWidth - popupWidth - margin;
  if (left > maxLeft) left = Math.max(margin, maxLeft);
  if (left < margin) left = margin;
  const top = rect.bottom + window.scrollY + margin;
  dictPopupEl.style.left = `${left}px`;
  dictPopupEl.style.top = `${top}px`;
}

// ---------- Init ----------

(function init() {
  Store.pruneEmptyVerseEntries();
  initDictionaryPopup();
  const last = Store.getLastPosition();
  loadChapter(last.book, last.chapter, last.translation || "web");
  loadVerseOfDay();
  if (SPEECH_SUPPORTED) {
    loadNarratorVoices();
    window.speechSynthesis.onvoiceschanged = loadNarratorVoices;
  }
  window.addEventListener("scroll", handleHeaderScroll, { passive: true });
  window.addEventListener("resize", updateHeaderHeightVar);
})();
