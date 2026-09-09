// Fetches chapter text from bible-api.com. Multiple public-domain translations
// are supported (see TRANSLATIONS in data.js) -- none require an API key.
const BibleApi = {
  async fetchChapter(book, chapter, translation) {
    const cached = Store.getCachedChapter(translation, book, chapter);
    if (cached) return cached.verses;

    const ref = encodeURIComponent(`${book} ${chapter}`);
    const url = `https://bible-api.com/${ref}?translation=${encodeURIComponent(translation)}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to load ${book} ${chapter} (HTTP ${res.status})`);
    }
    const json = await res.json();
    if (!json.verses || !json.verses.length) {
      throw new Error(`No verses returned for ${book} ${chapter}`);
    }
    const verses = json.verses.map((v) => ({
      verse: v.verse,
      text: v.text.replace(/\s+/g, " ").trim(),
    }));
    Store.setCachedChapter(translation, book, chapter, verses);
    return verses;
  },
};
