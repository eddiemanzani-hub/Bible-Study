// App state
const state = {
  view: "read", // "read" | "characters" | "notes"
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
  hideDictPopup();
  Store.setLastPosition(book, chapter, translation);
  render();
  try {
    const verses = await BibleApi.fetchChapter(book, chapter, translation);
    state.verses = verses;
    state.quiz = generateQuiz(translation, book, chapter, verses);
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
  render();
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Rendering ----------

function render() {
  const app = document.getElementById("app");
  app.innerHTML = `
    ${renderHeader()}
    <main>
      ${state.view === "read" ? renderReadView() : state.view === "characters" ? renderCharactersView() : renderNotesView()}
    </main>
    <footer class="app-footer">
      Scripture text: ${escapeHtml(translationName(state.translation))} (public domain) via bible-api.com. Notes stay in this browser only.
    </footer>
  `;
  attachHandlers();
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
    <header class="top-bar">
      <div class="top-row">
        <div class="brand">📖 Verse by Verse</div>
        <div class="nav-links">
          <button data-nav="read" class="${state.view === "read" ? "active" : ""}">Read</button>
          <button data-nav="characters" class="${state.view === "characters" ? "active" : ""}">Characters</button>
          <button data-nav="notes" class="${state.view === "notes" ? "active" : ""}">My Notes</button>
        </div>
      </div>
      ${renderHeaderProgress()}
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

  return `
    <div class="header-progress">
      <div class="mini-bar-row" title="${bookRead} of ${currentBook.chapters} chapters completed (quiz finished) in ${escapeHtml(currentBook.name)}">
        <span class="mini-bar-label">${escapeHtml(currentBook.name)}</span>
        <div class="mini-bar-track"><div class="mini-bar-fill read-fill" style="width:${bookPct}%"></div></div>
        <span class="mini-bar-value">${bookPct}% <small>(${bookRead}/${currentBook.chapters})</small></span>
      </div>
      <div class="mini-bar-row" title="${overallRead} of ${TOTAL_CHAPTERS} chapters completed (quiz finished) across the whole Bible">
        <span class="mini-bar-label">Whole Bible</span>
        <div class="mini-bar-track"><div class="mini-bar-fill read-fill" style="width:${overallPct}%"></div></div>
        <span class="mini-bar-value">${overallPct}% <small>(${overallRead}/${TOTAL_CHAPTERS})</small></span>
      </div>
      <div class="mini-bar-row" title="${quizStats.sumBestCorrect} of ${quizStats.sumBestTotal} best-attempt answers correct across ${quizStats.chaptersQuizzed} quizzed chapters">
        <span class="mini-bar-label">Quiz score</span>
        <div class="mini-bar-track"><div class="mini-bar-fill quiz-fill" style="width:${quizStats.percentage}%"></div></div>
        <span class="mini-bar-value">${quizStats.sumBestTotal > 0 ? quizStats.percentage + "%" : "—"}</span>
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

  const paragraphs = chunkVersesIntoParagraphs(state.verses, 6);
  const paragraphsHtml = paragraphs.map((group) => renderParagraph(group)).join("");

  return `
    <h1 class="chapter-title">${escapeHtml(state.book)} ${state.chapter}</h1>
    <p class="chapter-hint">Select any text to highlight it, look up a word, explain the verse, or add a note.</p>
    <div id="verses" class="chapter-text">${paragraphsHtml}</div>
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

function renderParagraph(group) {
  return `<div class="chapter-paragraph">${group.map((v) => renderVerseBlock(v)).join(" ")}</div>`;
}

// A verse's inline text plus, when open, its note/explanation panel -- those
// panels are block-level so they naturally break the paragraph flow right
// after the verse they belong to, rather than living in a separate column.
function renderVerseBlock(v) {
  const data = Store.getVerseData(state.book, state.chapter, v.verse) || {};
  const noteOpen = state.openNoteVerse === v.verse;
  const explainOpen = state.openExplainVerse === v.verse;

  return `${renderVerseInline(v, data)}${explainOpen ? renderExplainBox(v.verse) : ""}${
    noteOpen ? renderNoteBox(v.verse, data) : ""
  }`;
}

function renderVerseInline(v, data) {
  const highlights = data.highlights || [];
  const hasNote = !!(data.note && data.note.trim());
  const noteIndicator = hasNote
    ? `<button class="note-indicator" data-note-toggle="${v.verse}" title="View note on verse ${v.verse}">📝</button>`
    : "";

  return `<span class="verse-inline"><sup class="verse-num-inline">${v.verse}</sup><span class="verse-text" data-verse="${v.verse}">${renderHighlightedText(v.text, highlights)}</span>${noteIndicator}</span>`;
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
  document.querySelectorAll("[data-nav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.view = btn.dataset.nav;
      render();
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
  // Keep the browser selection alive while interacting with the popup's buttons.
  dictPopupEl.addEventListener("mousedown", (e) => e.preventDefault());

  document.addEventListener("mouseup", () => {
    // Deferred so the browser has finished updating the selection (matters for double-click).
    setTimeout(handleVerseSelection, 0);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hideDictPopup();
  });
}

function hideDictPopup() {
  if (dictPopupEl) dictPopupEl.hidden = true;
  currentSelection = null;
}

function handleVerseSelection() {
  const sel = window.getSelection();
  const text = sel && sel.toString();
  if (!text || !text.trim() || sel.isCollapsed) {
    hideDictPopup();
    return;
  }
  const range = sel.getRangeAt(0);
  const anchorNode = range.startContainer;
  const container = anchorNode && (anchorNode.nodeType === 3 ? anchorNode.parentElement : anchorNode);
  const verseTextEl = container && container.closest(".verse-text");
  if (!verseTextEl) {
    hideDictPopup();
    return;
  }

  const start = textOffsetWithin(verseTextEl, range.startContainer, range.startOffset);
  const end = textOffsetWithin(verseTextEl, range.endContainer, range.endOffset);
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
})();
