// Verse explanations come from the Jamieson-Fausset-Brown Bible Commentary
// (1871, public domain), served free with no API key by bible.helloao.org.
// It covers all 66 books, so every verse in the app can be explained.

// Book codes in the exact canonical order bible.helloao.org expects, lined up
// index-for-index with BIBLE_BOOKS in data.js.
const HELLOAO_BOOK_CODES = [
  "GEN", "EXO", "LEV", "NUM", "DEU", "JOS", "JDG", "RUT", "1SA", "2SA",
  "1KI", "2KI", "1CH", "2CH", "EZR", "NEH", "EST", "JOB", "PSA", "PRO",
  "ECC", "SNG", "ISA", "JER", "LAM", "EZK", "DAN", "HOS", "JOL", "AMO",
  "OBA", "JON", "MIC", "NAM", "HAB", "ZEP", "HAG", "ZEC", "MAL",
  "MAT", "MRK", "LUK", "JHN", "ACT", "ROM", "1CO", "2CO", "GAL", "EPH",
  "PHP", "COL", "1TH", "2TH", "1TI", "2TI", "TIT", "PHM", "HEB", "JAS",
  "1PE", "2PE", "1JN", "2JN", "3JN", "JUD", "REV",
];

function helloaoBookCode(bookName) {
  const idx = BIBLE_BOOKS.findIndex((b) => b.name === bookName);
  return idx >= 0 ? HELLOAO_BOOK_CODES[idx] : null;
}

// Strips the "Next: Genesis Chapter 2" navigation boilerplate the source
// embeds at the end of each chapter, and collapses excess blank lines.
function cleanCommentaryText(text) {
  return text
    .replace(/\n?\s*Next:\s*[A-Za-z0-9 ]+ Chapter \d+\s*$/i, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const CommentaryApi = {
  async fetchChapterCommentary(book, chapter) {
    const cached = Store.getCachedCommentary(book, chapter);
    if (cached) return cached;

    const code = helloaoBookCode(book);
    if (!code) throw new Error(`No commentary mapping for ${book}`);
    const url = `https://bible.helloao.org/api/c/jamieson-fausset-brown/${code}/${chapter}.simple.json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load commentary for ${book} ${chapter} (HTTP ${res.status})`);
    const json = await res.json();
    const ch = json.chapter || {};
    const data = {
      introduction: ch.introduction ? cleanCommentaryText(ch.introduction) : "",
      blocks: (ch.content || [])
        .filter((c) => c.type === "verse" && typeof c.number === "number")
        .map((c) => ({ number: c.number, text: cleanCommentaryText(c.text || "") })),
    };
    Store.setCachedCommentary(book, chapter, data);
    return data;
  },

  // A commentary entry covers from its verse number up to (but not including)
  // the next entry's number, so find the closest one at or before verseNum.
  explainVerse(chapterCommentary, verseNum) {
    if (!chapterCommentary) return null;
    let match = null;
    for (const block of chapterCommentary.blocks) {
      if (block.number <= verseNum) match = block;
      else break;
    }
    if (match) return match.text;
    if (chapterCommentary.introduction) return chapterCommentary.introduction;
    return null;
  },
};
