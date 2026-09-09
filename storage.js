// All persistence lives in localStorage. Nothing ever leaves the browser.
const STORAGE_KEYS = {
  verseData: "bsa:verseData",       // { "Book:Ch:V": { note, highlight, updatedAt } }
  quizData: "bsa:quizData",         // { "translation:Book:Ch": { answers, bestCorrect, bestTotal, attempts, updatedAt } }
  readChapters: "bsa:readChapters", // { "Book:Ch": firstReadTimestamp }
  lastPosition: "bsa:lastPosition", // { book, chapter, translation }
  cache: "bsa:chapterCache",        // { "translation:Book:Ch": { verses:[...], fetchedAt } }
  commentaryCache: "bsa:commentaryCache", // { "Book:Ch": { introduction, blocks:[...], fetchedAt } }
  dictionaryCache: "bsa:dictionaryCache", // { "word": { entries:[...], fetchedAt } }
};

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.warn("Failed to read storage key", key, e);
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("Failed to write storage key", key, e);
  }
}

const Store = {
  verseKey(book, chapter, verse) {
    return `${book}:${chapter}:${verse}`;
  },
  chapterKey(translation, book, chapter) {
    return `${translation}:${book}:${chapter}`;
  },
  readKey(book, chapter) {
    return `${book}:${chapter}`;
  },

  getAllVerseData() {
    return readJSON(STORAGE_KEYS.verseData, {});
  },
  getVerseData(book, chapter, verse) {
    const all = this.getAllVerseData();
    return all[this.verseKey(book, chapter, verse)] || null;
  },
  setVerseData(book, chapter, verse, data) {
    const all = this.getAllVerseData();
    const key = this.verseKey(book, chapter, verse);
    const existing = all[key] || {};
    const merged = { ...existing, ...data, updatedAt: Date.now() };
    // Drop entries that are now empty (no note, no highlights) to keep storage tidy.
    const hasNote = merged.note && merged.note.trim();
    if (!hasNote && (!merged.highlights || merged.highlights.length === 0)) {
      delete all[key];
    } else {
      all[key] = merged;
    }
    writeJSON(STORAGE_KEYS.verseData, all);
    return merged;
  },

  // Deletes just the note text (keeps any highlights). If nothing else is
  // left on the verse, setVerseData's own cleanup removes the entry entirely.
  deleteVerseNote(book, chapter, verse) {
    return this.setVerseData(book, chapter, verse, { note: "" });
  },

  // One-time cleanup for entries saved before the empty-note check was
  // whitespace-aware (e.g. a note that's just "\n"), so stale empty notes
  // don't linger in My Notes forever.
  pruneEmptyVerseEntries() {
    const all = this.getAllVerseData();
    let changed = false;
    Object.keys(all).forEach((key) => {
      const data = all[key];
      const hasNote = data.note && data.note.trim();
      const hasHighlights = data.highlights && data.highlights.length > 0;
      if (!hasNote && !hasHighlights) {
        delete all[key];
        changed = true;
      }
    });
    if (changed) writeJSON(STORAGE_KEYS.verseData, all);
  },

  // Word/phrase-level highlights, stored as non-overlapping {start, end, color}
  // character ranges into that verse's raw text.
  getVerseHighlights(book, chapter, verse) {
    const data = this.getVerseData(book, chapter, verse);
    return (data && data.highlights) || [];
  },
  // Applies `color` to [start, end) of the verse's text, trimming/splitting any
  // existing ranges it overlaps. Pass color = null to erase highlights in that range.
  setHighlightRange(book, chapter, verse, start, end, color) {
    const existing = this.getVerseHighlights(book, chapter, verse);
    const updated = [];
    existing.forEach((h) => {
      if (h.end <= start || h.start >= end) {
        updated.push(h);
      } else {
        const left = { start: h.start, end: Math.min(h.end, start), color: h.color };
        const right = { start: Math.max(h.start, end), end: h.end, color: h.color };
        if (left.end > left.start) updated.push(left);
        if (right.end > right.start) updated.push(right);
      }
    });
    if (color) updated.push({ start, end, color });
    updated.sort((a, b) => a.start - b.start);
    this.setVerseData(book, chapter, verse, { highlights: updated });
    return updated;
  },

  // ---- Reading progress (translation-independent: reading the passage counts) ----

  getReadChapters() {
    return readJSON(STORAGE_KEYS.readChapters, {});
  },
  isChapterRead(book, chapter) {
    const all = this.getReadChapters();
    return !!all[this.readKey(book, chapter)];
  },
  markChapterRead(book, chapter) {
    const all = this.getReadChapters();
    const key = this.readKey(book, chapter);
    if (!all[key]) {
      all[key] = Date.now();
      writeJSON(STORAGE_KEYS.readChapters, all);
    }
  },
  getReadCount() {
    return Object.keys(this.getReadChapters()).length;
  },
  // Chapters read per book, e.g. { Genesis: 12, Exodus: 3 }
  getReadCountsByBook() {
    const all = this.getReadChapters();
    const counts = {};
    Object.keys(all).forEach((key) => {
      const book = key.slice(0, key.lastIndexOf(":"));
      counts[book] = (counts[book] || 0) + 1;
    });
    return counts;
  },
  // Highest chapter number read per book, e.g. { Genesis: 12 } -- used to tell
  // whether a character (first appearing at some book+chapter) has been "met" yet.
  getMaxReadChapterPerBook() {
    const all = this.getReadChapters();
    const maxByBook = {};
    Object.keys(all).forEach((key) => {
      const idx = key.lastIndexOf(":");
      const book = key.slice(0, idx);
      const chapter = Number(key.slice(idx + 1));
      if (!maxByBook[book] || chapter > maxByBook[book]) maxByBook[book] = chapter;
    });
    return maxByBook;
  },

  // ---- Chapter quizzes: current answers plus a running best score ----

  getAllQuizData() {
    return readJSON(STORAGE_KEYS.quizData, {});
  },
  getQuizState(translation, book, chapter) {
    const all = this.getAllQuizData();
    return all[this.chapterKey(translation, book, chapter)] || { answers: {}, bestCorrect: 0, bestTotal: 0, attempts: 0 };
  },
  // Records an answer; when it completes the quiz (all totalQuestions answered)
  // this counts as one attempt and updates the best score if it's an improvement.
  setQuizAnswer(translation, book, chapter, qIndex, selected, correct, totalQuestions) {
    const all = this.getAllQuizData();
    const key = this.chapterKey(translation, book, chapter);
    const existing = all[key] || { answers: {}, bestCorrect: 0, bestTotal: 0, attempts: 0 };
    const wasComplete = Object.keys(existing.answers).length >= totalQuestions;
    const answers = { ...existing.answers, [qIndex]: { selected, correct } };
    const nowComplete = Object.keys(answers).length >= totalQuestions;

    let { bestCorrect = 0, bestTotal = 0, attempts = 0 } = existing;
    if (nowComplete && !wasComplete) {
      const correctCount = Object.values(answers).filter((a) => a.correct).length;
      attempts += 1;
      // Reading progress is earned by finishing a chapter's quiz, not just
      // opening the page -- this is the one place a chapter gets marked read.
      this.markChapterRead(book, chapter);
      if (correctCount > bestCorrect || bestTotal === 0) {
        bestCorrect = correctCount;
        bestTotal = totalQuestions;
      }
    }

    const merged = { answers, bestCorrect, bestTotal, attempts, updatedAt: Date.now() };
    all[key] = merged;
    writeJSON(STORAGE_KEYS.quizData, all);
    return merged;
  },
  // Clears the in-progress answers so the user can retake the quiz, but keeps
  // the best score and attempt history so a retake can only improve the record.
  clearQuizState(translation, book, chapter) {
    const all = this.getAllQuizData();
    const key = this.chapterKey(translation, book, chapter);
    const existing = all[key];
    if (!existing) return;
    all[key] = { ...existing, answers: {}, updatedAt: Date.now() };
    writeJSON(STORAGE_KEYS.quizData, all);
  },

  // Returns every chapter with at least one answered quiz question, newest first.
  listAllQuizResults() {
    const all = this.getAllQuizData();
    return Object.entries(all)
      .filter(([, data]) => (data.attempts || 0) > 0 || (data.answers && Object.keys(data.answers).length > 0))
      .map(([key, data]) => {
        const [translation, book, chapter] = key.split(":");
        const answered = Object.values(data.answers || {});
        return {
          translation,
          book,
          chapter: Number(chapter),
          inProgressAnswered: answered.length,
          inProgressCorrect: answered.filter((a) => a.correct).length,
          bestCorrect: data.bestCorrect || 0,
          bestTotal: data.bestTotal || 0,
          attempts: data.attempts || 0,
          updatedAt: data.updatedAt,
        };
      })
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  },

  // Cumulative "Bible score": sums each quizzed chapter's BEST attempt, so it
  // only ever goes up as retakes improve a chapter's record.
  getOverallQuizStats() {
    const all = this.getAllQuizData();
    let sumBestCorrect = 0;
    let sumBestTotal = 0;
    let chaptersQuizzed = 0;
    let totalAttempts = 0;
    Object.values(all).forEach((data) => {
      if ((data.attempts || 0) > 0) {
        sumBestCorrect += data.bestCorrect || 0;
        sumBestTotal += data.bestTotal || 0;
        chaptersQuizzed += 1;
        totalAttempts += data.attempts || 0;
      }
    });
    const percentage = sumBestTotal > 0 ? Math.round((sumBestCorrect / sumBestTotal) * 100) : 0;
    return { sumBestCorrect, sumBestTotal, chaptersQuizzed, totalAttempts, percentage };
  },

  getLastPosition() {
    return readJSON(STORAGE_KEYS.lastPosition, { book: "Genesis", chapter: 1, translation: "web" });
  },
  setLastPosition(book, chapter, translation) {
    writeJSON(STORAGE_KEYS.lastPosition, { book, chapter, translation });
  },

  getCachedChapter(translation, book, chapter) {
    const all = readJSON(STORAGE_KEYS.cache, {});
    return all[this.chapterKey(translation, book, chapter)] || null;
  },
  setCachedChapter(translation, book, chapter, verses) {
    const all = readJSON(STORAGE_KEYS.cache, {});
    all[this.chapterKey(translation, book, chapter)] = { verses, fetchedAt: Date.now() };
    writeJSON(STORAGE_KEYS.cache, all);
  },

  // Commentary is translation-independent (it explains the passage, not a specific wording).
  getCachedCommentary(book, chapter) {
    const all = readJSON(STORAGE_KEYS.commentaryCache, {});
    return all[this.readKey(book, chapter)] || null;
  },
  setCachedCommentary(book, chapter, data) {
    const all = readJSON(STORAGE_KEYS.commentaryCache, {});
    all[this.readKey(book, chapter)] = { ...data, fetchedAt: Date.now() };
    writeJSON(STORAGE_KEYS.commentaryCache, all);
  },

  getCachedDefinition(word) {
    const all = readJSON(STORAGE_KEYS.dictionaryCache, {});
    return all[word.toLowerCase()] || null;
  },
  setCachedDefinition(word, entries) {
    const all = readJSON(STORAGE_KEYS.dictionaryCache, {});
    all[word.toLowerCase()] = { entries, fetchedAt: Date.now() };
    writeJSON(STORAGE_KEYS.dictionaryCache, all);
  },

  // Returns every verse that has a note or highlight, newest first.
  listAllAnnotatedVerses() {
    const all = this.getAllVerseData();
    return Object.entries(all)
      .map(([key, data]) => {
        const [book, chapter, verse] = key.split(":");
        return { book, chapter: Number(chapter), verse: Number(verse), ...data };
      })
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  },

  // Number of distinct chapters that have at least one note or highlight
  // (used for the dashboard's "Notes" progress ring).
  getAnnotatedChapterCount() {
    const all = this.getAllVerseData();
    const chapters = new Set();
    Object.keys(all).forEach((key) => {
      const parts = key.split(":");
      parts.pop(); // verse
      chapters.add(parts.join(":")); // "Book:Chapter"
    });
    return chapters.size;
  },

  exportAll() {
    return {
      verseData: this.getAllVerseData(),
      quizData: this.getAllQuizData(),
      readChapters: this.getReadChapters(),
      exportedAt: new Date().toISOString(),
    };
  },

  importAll(data) {
    if (data.verseData) writeJSON(STORAGE_KEYS.verseData, data.verseData);
    if (data.quizData) writeJSON(STORAGE_KEYS.quizData, data.quizData);
    if (data.readChapters) writeJSON(STORAGE_KEYS.readChapters, data.readChapters);
  },
};
