// Generates 5 multiple-choice "fill in the blank" questions straight from the
// chapter's own verse text -- no external question bank or AI call needed.
// Questions are steered toward people, places, and theologically significant
// terms rather than arbitrary vocabulary (see categorizeWord below).
// Generation is seeded (hash of translation+book+chapter+verse+word) so the
// same chapter always produces the same questions, options in the same order,
// letting a user's score stay meaningful across visits.

function hashStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle(arr, seed) {
  const rng = mulberry32(seed);
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isContentWord(word) {
  const w = word.toLowerCase();
  return w.length >= 3 && !QUIZ_STOPWORDS.has(w);
}

// Words to ignore when pulling person-name tokens out of BIBLE_CHARACTERS
// entries -- generic titles/descriptors, not part of the actual name.
const NAME_TOKEN_STOPWORDS = new Set(["great", "young", "old", "elder", "the", "of", "and", "son", "daughter"]);

// Built once from BIBLE_CHARACTERS (characters.js) -- every distinctive word
// that appears in a notable character's name, lowercased. Divine names/titles
// are seeded in directly since they're not in the character list but are
// clearly top-priority ("person") terms.
const QUIZ_PERSON_TOKENS = (function () {
  const set = new Set(["god", "lord", "yahweh", "christ", "messiah", "almighty"]);
  (typeof BIBLE_CHARACTERS !== "undefined" ? BIBLE_CHARACTERS : []).forEach((c) => {
    const cleaned = c.name.replace(/\([^)]*\)/g, "");
    cleaned.split(/[\s,]+/).forEach((tok) => {
      const t = tok.replace(/[^A-Za-z']/g, "").toLowerCase();
      if (t.length >= 3 && !QUIZ_STOPWORDS.has(t) && !NAME_TOKEN_STOPWORDS.has(t)) set.add(t);
    });
  });
  return set;
})();

const QUIZ_PLACE_SET = new Set(QUIZ_PLACE_NAMES.map((w) => w.toLowerCase()));
const QUIZ_IMPORTANT_SET = new Set(QUIZ_IMPORTANT_TERMS.map((w) => w.toLowerCase()));

// True if the character at `index` in `text` starts a new sentence (so a
// capital letter there is just normal capitalization, not necessarily a name).
function isSentenceStart(text, index) {
  let i = index - 1;
  while (i >= 0 && /[\s"'‘’“”]/.test(text[i])) i--;
  if (i < 0) return true;
  return /[.!?]/.test(text[i]);
}

// Category ranks: 1 = known person, 2 = known place, 3 = important term,
// 4 = unrecognized but capitalized mid-sentence (likely a name/place anyway),
// 5 = generic content word (last-resort fallback so a quiz can still be built).
function categorizeWord(word, text, index) {
  const lower = word.toLowerCase();
  if (QUIZ_PERSON_TOKENS.has(lower)) return { rank: 1, kind: "person" };
  if (QUIZ_PLACE_SET.has(lower)) return { rank: 2, kind: "place" };
  if (QUIZ_IMPORTANT_SET.has(lower)) return { rank: 3, kind: "important" };
  if (/^[A-Z]/.test(word) && !isSentenceStart(text, index)) return { rank: 4, kind: "proper" };
  return { rank: 5, kind: "other" };
}

// Returns every eligible content word in the text, each tagged with a category rank.
function findCandidates(text) {
  const out = [];
  const re = /[A-Za-z']+/g;
  let m;
  while ((m = re.exec(text))) {
    if (isContentWord(m[0])) {
      const { rank, kind } = categorizeWord(m[0], text, m.index);
      out.push({ word: m[0], index: m.index, length: m[0].length, rank, kind });
    }
  }
  return out;
}

// Collapses every candidate occurrence in the chapter down to one entry per
// distinct word (case-insensitive), keeping its best (lowest-rank) occurrence.
// Without this, a dominant word like "God" would end up as every question.
function collectDistinctWords(perVerse) {
  const byWord = new Map();
  perVerse.forEach((v) => {
    v.candidates.forEach((c) => {
      const key = c.word.toLowerCase();
      const existing = byWord.get(key);
      if (!existing || c.rank < existing.candidate.rank) {
        byWord.set(key, { verse: v.verse, verseEntry: v, candidate: c });
      }
    });
  });
  return Array.from(byWord.values());
}

// Maps each verse number to its reading-paragraph index (same grouping the
// Read view uses), so the quiz can avoid picking two questions that would
// land in the same paragraph on the page.
function buildParagraphIndex(verses) {
  const map = new Map();
  verses.forEach((v, i) => map.set(v.verse, Math.floor(i / CHAPTER_PARAGRAPH_SIZE)));
  return map;
}

// Picks up to `want` distinct-word entries, preferring the lowest-rank
// (most important) category first, scanning each tier in verse order and
// taking the first candidate from each not-yet-used paragraph -- so, within
// the limits of what's available, no two questions come from the same
// paragraph, and picks still end up spread across the chapter.
function pickDistinctWordsByTier(entries, want, paragraphIndex) {
  const maxRank = Math.max(...entries.map((e) => e.candidate.rank));
  const picked = [];
  const usedParagraphs = new Set();

  for (let tier = 1; tier <= maxRank && picked.length < want; tier++) {
    const pool = entries.filter((e) => e.candidate.rank === tier).sort((a, b) => a.verse - b.verse);
    for (const entry of pool) {
      if (picked.length >= want) break;
      const p = paragraphIndex.get(entry.verse);
      if (usedParagraphs.has(p)) continue;
      usedParagraphs.add(p);
      picked.push(entry);
    }
  }
  return picked;
}

function generateQuiz(translation, book, chapter, verses) {
  const perVerse = verses
    .map((v) => ({
      verse: v.verse,
      text: v.text,
      candidates: findCandidates(v.text).sort((a, b) => a.rank - b.rank || b.length - a.length),
    }))
    .filter((v) => v.candidates.length > 0);

  if (perVerse.length === 0) return [];

  // Distractor pools grouped by category, so wrong answers are plausible
  // (a name's distractors are other names, not random nouns).
  const poolByKind = { person: new Set(), place: new Set(), important: new Set(), proper: new Set(), other: new Set() };
  perVerse.forEach((v) => v.candidates.forEach((c) => poolByKind[c.kind].add(c.word.toLowerCase())));

  // One entry per distinct word in the chapter (not per verse), so a
  // frequently repeated word like "God" doesn't become every question.
  const distinctWords = collectDistinctWords(perVerse);
  const paragraphIndex = buildParagraphIndex(verses);
  const picks = pickDistinctWordsByTier(distinctWords, 5, paragraphIndex);

  return picks.map((pick, qIndex) => {
    const { verseEntry, candidate } = pick;
    const correctWord = candidate.word;
    const prompt =
      verseEntry.text.slice(0, candidate.index) + "_____" + verseEntry.text.slice(candidate.index + candidate.length);

    // Prefer distractors from the same category, then widen the net.
    const kindOrder = [candidate.kind, "person", "place", "important", "proper", "other"];
    const seedBase = `${translation}:${book}:${chapter}:${verseEntry.verse}:${correctWord.toLowerCase()}:${qIndex}`;
    let distractors = [];
    for (const kind of kindOrder) {
      if (distractors.length >= 3) break;
      const pool = Array.from(poolByKind[kind]).filter(
        (w) => w !== correctWord.toLowerCase() && !distractors.includes(w)
      );
      const need = 3 - distractors.length;
      distractors = distractors.concat(seededShuffle(pool, hashStr(seedBase + ":" + kind)).slice(0, need));
    }

    if (distractors.length < 3) {
      const fallback = QUIZ_FALLBACK_WORDS.filter(
        (w) => w.toLowerCase() !== correctWord.toLowerCase() && !distractors.includes(w.toLowerCase())
      ).map((w) => w.toLowerCase());
      const need = 3 - distractors.length;
      distractors = distractors.concat(seededShuffle(fallback, hashStr(seedBase + ":fallback")).slice(0, need));
    }

    // Capitalize distractors to roughly match a typical sentence-start/proper-noun look.
    const capitalize = (w) => w.charAt(0).toUpperCase() + w.slice(1);
    const optionObjs = [
      { text: correctWord, correct: true },
      ...distractors.map((w) => ({ text: capitalize(w), correct: false })),
    ];
    const shuffledOptions = seededShuffle(optionObjs, hashStr(seedBase + ":options"));
    const correctIndex = shuffledOptions.findIndex((o) => o.correct);

    return {
      verse: verseEntry.verse,
      prompt,
      options: shuffledOptions.map((o) => o.text),
      correctIndex,
    };
  });
}
