// Word definitions come from Wiktionary's public REST API -- free, no key,
// and covers archaic/biblical vocabulary (thee, firmament, beget, etc.).

function stripHtml(html) {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

const DictionaryApi = {
  async lookup(word) {
    const key = word.toLowerCase();
    const cached = Store.getCachedDefinition(key);
    if (cached) return cached.entries;

    const url = `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(key)}`;
    const res = await fetch(url);
    if (res.status === 404) {
      Store.setCachedDefinition(key, []);
      return [];
    }
    if (!res.ok) throw new Error(`Lookup failed (HTTP ${res.status})`);
    const json = await res.json();
    const englishSenses = json.en || [];
    const entries = englishSenses.slice(0, 4).map((sense) => ({
      partOfSpeech: sense.partOfSpeech || "",
      definitions: (sense.definitions || []).slice(0, 3).map((d) => stripHtml(d.definition || "")),
    }));
    Store.setCachedDefinition(key, entries);
    return entries;
  },
};
