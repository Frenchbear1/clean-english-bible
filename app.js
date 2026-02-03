const MANIFEST_URL = "./data/manifest.json";
const STORAGE_KEY = "cleanBibleApp.v1";

const bookOrder = [
  "Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth",
  "1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra","Nehemiah",
  "Esther","Job","Psalms","Proverbs","Ecclesiastes","Song of Songs","Isaiah","Jeremiah",
  "Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos","Obadiah","Jonah","Micah",
  "Nahum","Habakkuk","Zephaniah","Haggai","Zechariah","Malachi","Matthew","Mark","Luke",
  "John","Acts","Romans","1 Corinthians","2 Corinthians","Galatians","Ephesians","Philippians",
  "Colossians","1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon",
  "Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"
];

const palette = [
  { id: "red", name: "Red", hex: "#ff6259" },
  { id: "orange", name: "Orange", hex: "#ffaa33" },
  { id: "amber", name: "Amber", hex: "#ffcc33" },
  { id: "yellow", name: "Yellow", hex: "#ffd633" },
  { id: "lime", name: "Lime", hex: "#d2ee6b" },
  { id: "green", name: "Green", hex: "#5dd27a" },
  { id: "mint", name: "Mint", hex: "#33d2b4" },
  { id: "teal", name: "Teal", hex: "#33c6dd" },
  { id: "cyan", name: "Cyan", hex: "#5bbdeb" },
  { id: "sky", name: "Sky", hex: "#7bd3fb" },
  { id: "blue", name: "Blue", hex: "#3395ff" },
  { id: "indigo", name: "Indigo", hex: "#7978de" },
  { id: "violet", name: "Violet", hex: "#bf75e5" },
  { id: "magenta", name: "Magenta", hex: "#ff5777" },
  { id: "rose", name: "Rose", hex: "#ff9595" }
];

const state = {
  data: null,
  currentBook: "Genesis",
  currentChapter: "1",
  currentVerse: "1",
  selected: new Set(),
  favorites: {},
  memorize: {},
  highlights: {},
  searchIndex: [],
  searchQuery: "",
  manifest: [],
  translationId: "",
  view: "read",
  startupEnabled: false,
  startupMemoryId: "",
  startupActiveMemoryId: ""
};

const aliasOverrides = {
  "ps": "Psalms",
  "psalm": "Psalms",
  "psalms": "Psalms",
  "jn": "John",
  "jhn": "John",
  "1jn": "1 John",
  "2jn": "2 John",
  "3jn": "3 John",
  "songofsongs": "Song of Songs",
  "song": "Song of Songs",
  "sos": "Song of Songs",
  "canticles": "Song of Songs",
  "rev": "Revelation",
  "revelation": "Revelation"
};

const bookAliasMap = buildBookAliases();
const aliasKeys = Object.keys(bookAliasMap).sort((a, b) => b.length - a.length);
const chapterVerseCache = new Map();
const translationLabels = {
  "KING JAMES BIBLE": "KJV",
  "ENGLISH STANDARD VERSION": "ESV",
  "INTERNATIONAL STANDARD VERSION": "ISV",
  "NEW INTERNATIONAL VERSION": "NIV",
  "NEW LIVING TRANSLATION": "NLT",
  "WESTMINSTER LENINGRAD CODEX": "WLC",
  "NESTLE GREEK NEW TESTAMENT 1904": "GNT",
  "PESHITTA HOLY BIBLE TRANSLATED": "PESHITTA"
};

const elements = {
  bookSelect: document.getElementById("bookSelect"),
  chapterSelect: document.getElementById("chapterSelect"),
  verseSelect: document.getElementById("verseSelect"),
  translationSelect: document.getElementById("translationSelect"),
  verseList: document.getElementById("verseList"),
  statusLine: document.getElementById("statusLine"),
  palette: document.getElementById("palette"),
  paletteGrid: document.getElementById("paletteGrid"),
  favoriteBtn: document.getElementById("favoriteBtn"),
  copyBtn: document.getElementById("copyBtn"),
  searchOriginalBtn: document.getElementById("searchOriginalBtn"),
  removeHighlightPill: document.getElementById("removeHighlightPill"),
  searchInput: document.getElementById("searchInput"),
  searchResults: document.getElementById("searchResults"),
  resultsList: document.getElementById("resultsList"),
  resultsCount: document.getElementById("resultsCount"),
  controls: document.querySelector(".controls"),
  topbarControls: document.getElementById("topbarControls"),
  highlightList: document.getElementById("highlightList"),
  favoriteList: document.getElementById("favoriteList"),
  memorizeList: document.getElementById("memorizeList"),
  highlightFilter: document.getElementById("highlightFilter"),
  highlightSort: document.getElementById("highlightSort"),
  favoriteFilter: document.getElementById("favoriteFilter"),
  favoriteSort: document.getElementById("favoriteSort"),
  viewRead: document.getElementById("view-read"),
  memorizeBtn: document.getElementById("memorizeBtn"),
  startupToggle: document.getElementById("startupToggle"),
  startupSelect: document.getElementById("startupSelect"),
  startupOverlay: document.getElementById("startupOverlay"),
  startupCard: document.getElementById("startupCard"),
  startupReference: document.getElementById("startupReference"),
  startupText: document.getElementById("startupText"),
  startupContinue: document.getElementById("startupContinue"),
  windowMinimize: document.getElementById("windowMinimize"),
  windowMaximize: document.getElementById("windowMaximize"),
  windowClose: document.getElementById("windowClose"),
  appMinimize: document.getElementById("appMinimize"),
  appMaximize: document.getElementById("appMaximize"),
  appClose: document.getElementById("appClose")
};

let copyResetTimer = null;
let appClosed = false;
let startupLocked = false;
const customSelects = new Map();

function makeVerseId(book, chapter, verse) {
  return `${book}|${chapter}|${verse}`;
}

function parseVerseId(id) {
  const [book, chapter, verse] = id.split("|");
  return { book, chapter, verse };
}

function saveState() {
  const payload = {
    favorites: state.favorites,
    memorize: state.memorize,
    highlights: state.highlights,
    view: "read",
    currentBook: state.currentBook,
    currentChapter: state.currentChapter,
    currentVerse: state.currentVerse,
    searchQuery: "",
    translationId: state.translationId,
    startupEnabled: state.startupEnabled,
    startupMemoryId: state.startupMemoryId
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const payload = JSON.parse(raw);
    state.favorites = payload.favorites || {};
    state.memorize = payload.memorize || {};
    state.highlights = payload.highlights || {};
    state.view = "read";
    state.currentBook = payload.currentBook || state.currentBook;
    state.currentChapter = payload.currentChapter || state.currentChapter;
    state.currentVerse = payload.currentVerse || state.currentVerse;
    state.searchQuery = "";
    state.translationId = payload.translationId || "";
    state.startupEnabled = payload.startupEnabled || false;
    state.startupMemoryId = payload.startupMemoryId || "";
  } catch (err) {
    console.warn("Failed to parse saved state", err);
  }
}

function setStatus(text) {
  elements.statusLine.textContent = text;
}

function buildPalette() {
  elements.paletteGrid.innerHTML = "";
  palette.forEach((color) => {
    const swatch = document.createElement("button");
    swatch.className = "palette-swatch";
    swatch.style.background = color.hex;
    swatch.title = color.name;
    swatch.addEventListener("click", () => applyHighlight(color.id));
    elements.paletteGrid.appendChild(swatch);
  });
  elements.highlightFilter.innerHTML = `<option value="all">All colors</option>`;
  if (elements.favoriteFilter) {
    elements.favoriteFilter.innerHTML = `<option value="all">All colors</option>`;
  }
  palette.forEach((color) => {
    const option = document.createElement("option");
    option.value = color.id;
    option.textContent = color.name;
    option.dataset.color = color.hex;
    elements.highlightFilter.appendChild(option);
    if (elements.favoriteFilter) {
      const favOption = document.createElement("option");
      favOption.value = color.id;
      favOption.textContent = color.name;
      favOption.dataset.color = color.hex;
      elements.favoriteFilter.appendChild(favOption);
    }
  });
  initCustomSelect(elements.highlightFilter);
  initCustomSelect(elements.favoriteFilter);
  syncCustomSelect(elements.highlightFilter);
  syncCustomSelect(elements.favoriteFilter);
}

function buildTranslationSelect() {
  elements.translationSelect.innerHTML = "";
  const sorted = [...state.manifest].sort((a, b) => {
    const langA = a.lang || "";
    const langB = b.lang || "";
    if (langA !== langB) return langA.localeCompare(langB);
    return a.name.localeCompare(b.name);
  });
  sorted.forEach((entry) => {
    const option = document.createElement("option");
    const label = translationLabels[entry.name] || entry.name;
    option.value = entry.id;
    option.textContent = label;
    elements.translationSelect.appendChild(option);
  });
  elements.translationSelect.value = state.translationId;
  syncCustomSelect(elements.translationSelect);
}

function loadTranslation(id) {
  const entry = state.manifest.find((item) => item.id === id) || state.manifest[0];
  if (!entry) return Promise.resolve();
  state.translationId = entry.id;
  return fetch(entry.path)
    .then((res) => res.json())
    .then((data) => {
      if (appClosed) return;
      state.data = data;
      chapterVerseCache.clear();
      const availableBooks = bookOrder.filter((book) => data[book]);
      state.currentBook = availableBooks.includes(state.currentBook)
        ? state.currentBook
        : (availableBooks[0] || Object.keys(data)[0]);
      const chapters = Object.keys(data[state.currentBook] || {});
      state.currentChapter = chapters.includes(state.currentChapter) ? state.currentChapter : (chapters[0] || "1");
      const verses = Object.keys(data[state.currentBook]?.[state.currentChapter] || {});
      state.currentVerse = verses.includes(state.currentVerse) ? state.currentVerse : (verses[0] || "1");
      buildSelectors(availableBooks);
      buildSearchIndex();
      render();
      if (state.searchQuery) handleSearch(state.searchQuery);
      setStatus("");
      saveState();
      if (startupLocked) updateStartupOverlayContent();
    });
}

function loadData() {
  return fetch(MANIFEST_URL)
    .then((res) => res.json())
    .then((manifest) => {
      state.manifest = manifest;
      if (!state.translationId) {
        const niv = manifest.find((entry) => entry.lang === "en" && entry.name === "NEW INTERNATIONAL VERSION");
        state.translationId = niv ? niv.id : (manifest[0] ? manifest[0].id : "");
      }
      buildTranslationSelect();
      return loadTranslation(state.translationId);
    });
}

function buildSelectors(availableBooks) {
  elements.bookSelect.innerHTML = "";
  availableBooks.forEach((book) => {
    const option = document.createElement("option");
    option.value = book;
    option.textContent = book;
    elements.bookSelect.appendChild(option);
  });
  elements.bookSelect.value = state.currentBook;
  syncCustomSelect(elements.bookSelect);
  updateChapterOptions();
  updateVerseOptions();
}

function updateChapterOptions() {
  const chapters = Object.keys(state.data[state.currentBook]);
  elements.chapterSelect.innerHTML = "";
  chapters.forEach((chapter) => {
    const option = document.createElement("option");
    option.value = chapter;
    option.textContent = chapter;
    elements.chapterSelect.appendChild(option);
  });
  if (!chapters.includes(state.currentChapter)) {
    state.currentChapter = chapters[0];
  }
  elements.chapterSelect.value = state.currentChapter;
  syncCustomSelect(elements.chapterSelect);
  saveState();
}

function updateVerseOptions() {
  const verses = Object.keys(state.data[state.currentBook][state.currentChapter]);
  elements.verseSelect.innerHTML = "";
  verses.forEach((verse) => {
    const option = document.createElement("option");
    option.value = verse;
    option.textContent = verse;
    elements.verseSelect.appendChild(option);
  });
  if (!verses.includes(state.currentVerse)) {
    state.currentVerse = verses[0];
  }
  elements.verseSelect.value = state.currentVerse;
  syncCustomSelect(elements.verseSelect);
  saveState();
}

function getChapterOrder() {
  return Object.keys(state.data[state.currentBook]).sort((a, b) => Number(a) - Number(b));
}

function goToChapter(delta) {
  const chapters = getChapterOrder();
  const currentIndex = chapters.indexOf(state.currentChapter);
  if (currentIndex === -1) return;
  const nextIndex = currentIndex + delta;
  if (nextIndex < 0 || nextIndex >= chapters.length) {
    const availableBooks = bookOrder.filter((book) => state.data[book]);
    const bookIndex = availableBooks.indexOf(state.currentBook);
    const nextBookIndex = bookIndex + (delta < 0 ? -1 : 1);
    if (nextBookIndex < 0 || nextBookIndex >= availableBooks.length) return;
    state.currentBook = availableBooks[nextBookIndex];
    const nextChapters = Object.keys(state.data[state.currentBook]).sort((a, b) => Number(a) - Number(b));
    state.currentChapter = delta < 0 ? nextChapters[nextChapters.length - 1] : nextChapters[0];
    state.currentVerse = "1";
  } else {
    state.currentChapter = chapters[nextIndex];
    state.currentVerse = "1";
  }
  elements.bookSelect.value = state.currentBook;
  updateChapterOptions();
  updateVerseOptions();
  renderVerses();
  saveState();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function buildSearchIndex() {
  const index = [];
  Object.keys(state.data).forEach((book) => {
    Object.keys(state.data[book]).forEach((chapter) => {
      Object.keys(state.data[book][chapter]).forEach((verse) => {
        const text = state.data[book][chapter][verse];
        index.push({
          book,
          chapter,
          verse,
          text,
          haystack: text.toLowerCase()
        });
      });
    });
  });
  state.searchIndex = index;
}

function getChapterVerses(book, chapter) {
  const key = `${book}|${chapter}`;
  if (chapterVerseCache.has(key)) {
    return chapterVerseCache.get(key);
  }
  const verses = Object.keys(state.data?.[book]?.[chapter] || {}).sort((a, b) => Number(a) - Number(b));
  chapterVerseCache.set(key, verses);
  return verses;
}

function buildKeywordWindows(matches, span = 3) {
  const windows = new Map();
  const maxResults = 10000;
  matches.slice(0, maxResults).forEach((entry) => {
    const verses = getChapterVerses(entry.book, entry.chapter);
    const index = verses.indexOf(entry.verse);
    if (index < 0) return;
    const half = Math.floor((span - 1) / 2);
    const startIndex = Math.max(0, index - half);
    const endIndex = Math.min(verses.length - 1, startIndex + span - 1);
    const startVerse = verses[startIndex];
    const endVerse = verses[endIndex];
    const key = `${entry.book}|${entry.chapter}|${startVerse}|${endVerse}`;
    if (windows.has(key)) return;
    const textParts = [];
    for (let i = startIndex; i <= endIndex; i += 1) {
      const verseNum = verses[i];
      const text = state.data?.[entry.book]?.[entry.chapter]?.[verseNum];
      if (text) textParts.push(`${verseNum} ${text}`);
    }
    windows.set(key, {
      book: entry.book,
      chapter: entry.chapter,
      verse: startVerse,
      endVerse,
      text: textParts.join(" ")
    });
  });
  return Array.from(windows.values());
}

function normalizeQuery(query) {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9:\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getQueryTokens(query) {
  const clean = normalizeQuery(query);
  if (!clean) return [];
  return clean.split(" ").filter((token) => token.length > 1);
}

function matchesWordStart(text, query) {
  const tokens = getQueryTokens(query);
  if (tokens.length === 0) return true;
  const haystack = normalizeQuery(text);
  return tokens.every((token) => new RegExp(`\\b${escapeRegExp(token)}`, "i").test(haystack));
}

function highlightText(text, query) {
  const tokens = getQueryTokens(query);
  if (tokens.length === 0) return escapeHtml(text);
  const ranges = [];
  tokens.forEach((token) => {
    const pattern = new RegExp(`\\b${escapeRegExp(token)}`, "gi");
    let match = null;
    while ((match = pattern.exec(text)) !== null) {
      ranges.push({ start: match.index, end: match.index + match[0].length });
    }
  });
  if (ranges.length === 0) return escapeHtml(text);
  ranges.sort((a, b) => a.start - b.start || a.end - b.end);
  const merged = [];
  ranges.forEach((range) => {
    const last = merged[merged.length - 1];
    if (!last) {
      merged.push({ ...range });
      return;
    }
    if (range.start <= last.end) {
      last.end = Math.max(last.end, range.end);
      return;
    }
    const gap = text.slice(last.end, range.start);
    if (/^\s+$/.test(gap)) {
      last.end = range.end;
      return;
    }
    merged.push({ ...range });
  });
  let result = "";
  let cursor = 0;
  merged.forEach((range) => {
    result += escapeHtml(text.slice(cursor, range.start));
    result += `<span class="keyword-glow">${escapeHtml(text.slice(range.start, range.end))}</span>`;
    cursor = range.end;
  });
  result += escapeHtml(text.slice(cursor));
  return result;
}

function initCustomSelect(select) {
  if (!select) return;
  const shell = select.closest(".select-shell");
  if (!shell) return;
  if (customSelects.has(select)) return;
  const trigger = shell.querySelector(".select-trigger");
  const menu = shell.querySelector(".select-menu");
  if (!trigger || !menu) return;
  customSelects.set(select, { trigger, menu });
  trigger.addEventListener("click", () => {
    closeAllSelectMenus(select);
    menu.hidden = !menu.hidden;
  });
  menu.addEventListener("click", (event) => {
    const item = event.target.closest(".select-item");
    if (!item) return;
    select.value = item.dataset.value;
    select.dispatchEvent(new Event("change"));
    menu.hidden = true;
    syncCustomSelect(select);
  });
  syncCustomSelect(select);
}

function syncCustomSelect(select) {
  if (!select) return;
  const entry = customSelects.get(select);
  if (!entry) return;
  const { trigger, menu } = entry;
  menu.innerHTML = "";
  Array.from(select.options).forEach((opt) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "select-item";
    item.dataset.value = opt.value;
    const color = opt.dataset.color;
    if (color) {
      item.innerHTML = `<span class="color-dot" style="background:${color}"></span><span>${escapeHtml(opt.textContent)}</span>`;
    } else {
      item.innerHTML = `<span>${escapeHtml(opt.textContent)}</span>`;
    }
    menu.appendChild(item);
  });
  const selected = select.options[select.selectedIndex] || select.options[0];
  if (selected) {
    const color = selected.dataset.color;
    if (color) {
      trigger.innerHTML = `<span class="color-dot" style="background:${color}"></span><span>${escapeHtml(selected.textContent)}</span>`;
    } else {
      trigger.innerHTML = `<span>${escapeHtml(selected.textContent)}</span>`;
    }
  } else {
    trigger.textContent = "";
  }
}

function closeAllSelectMenus(exceptSelect) {
  customSelects.forEach((entry, select) => {
    if (select === exceptSelect) return;
    entry.menu.hidden = true;
  });
}

function openCustomSelect(select) {
  if (!select) return;
  initCustomSelect(select);
  const entry = customSelects.get(select);
  if (!entry) return;
  closeAllSelectMenus(select);
  entry.menu.hidden = false;
}

function buildBookAliases() {
  const map = {};
  bookOrder.forEach((book) => {
    const lower = book.toLowerCase();
    const compact = lower.replace(/\s+/g, "");
    map[lower] = book;
    map[compact] = book;
    map[lower.replace(/\s+of\s+/g, " ")] = book;
    map[compact.replace(/of/g, "")] = book;

    const parts = lower.split(" ");
    const firstWord = parts[0];
    map[firstWord] = book;

    if (parts.length > 1) {
      const initials = parts.map((p) => p[0]).join("");
      map[initials] = book;
      map[`${parts[0]}${parts[1]}`] = book;
    }
  });

  Object.keys(aliasOverrides).forEach((key) => {
    map[key] = aliasOverrides[key];
  });

  return map;
}

function parseReference(query) {
  const normalized = normalizeQuery(query);
  if (!normalized) return null;

  let matchedBook = null;
  let remainder = normalized;
  for (const key of aliasKeys) {
    if (normalized === key || normalized.startsWith(`${key} `)) {
      matchedBook = bookAliasMap[key];
      remainder = normalized.slice(key.length).trim();
      break;
    }
  }

  if (!matchedBook) return null;

  if (!remainder) {
    return { book: matchedBook };
  }

  const chapterVerse = remainder.split(":");
  let chapter = null;
  let verse = null;

  if (chapterVerse.length > 1) {
    chapter = chapterVerse[0].trim().split(" ")[0];
    verse = chapterVerse[1].trim().split(" ")[0];
  } else {
    const nums = remainder.split(" ").filter(Boolean);
    if (nums.length >= 1) chapter = nums[0];
    if (nums.length >= 2) verse = nums[1];
  }

  return { book: matchedBook, chapter, verse };
}

function buildReferenceMatches(ref) {
  const matches = [];
  if (!state.data?.[ref.book]) return matches;
  if (!ref.chapter) {
    const chapter = "1";
    const verses = state.data[ref.book][chapter] || {};
    Object.keys(verses).forEach((verse) => {
      matches.push({ book: ref.book, chapter, verse, text: verses[verse] });
    });
    return matches;
  }

  const chapter = String(ref.chapter);
  if (!state.data[ref.book][chapter]) return matches;

  if (ref.verse) {
    const verse = String(ref.verse);
    const text = state.data[ref.book][chapter]?.[verse];
    if (text) matches.push({ book: ref.book, chapter, verse, text });
    return matches;
  }

  const verses = state.data[ref.book][chapter];
  Object.keys(verses).forEach((verse) => {
    matches.push({ book: ref.book, chapter, verse, text: verses[verse] });
  });
  return matches;
}

function render() {
  renderVerses();
  renderHighlights();
  renderFavorites();
  renderMemorize();
  applyView(state.view);
}

function renderVerses() {
  const verses = state.data[state.currentBook][state.currentChapter];
  elements.verseList.innerHTML = "";
  const verseKeys = Object.keys(verses);
  const block = document.createElement("div");
  block.className = "paragraph";
  verseKeys.forEach((verse, index) => {
    const id = makeVerseId(state.currentBook, state.currentChapter, verse);
    const span = document.createElement("span");
    span.className = "verse-inline";
    span.dataset.verseId = id;
    if (state.selected.has(id)) {
      span.classList.add("selected");
    }
    if (state.highlights[id]) {
      const colorId = state.highlights[id].colorId;
      const color = palette.find((entry) => entry.id === colorId);
      if (color) {
        span.classList.add("highlighted");
        span.style.setProperty("--hl", color.hex);
        const prevId = index > 0 ? makeVerseId(state.currentBook, state.currentChapter, verseKeys[index - 1]) : null;
        const nextId = index < verseKeys.length - 1 ? makeVerseId(state.currentBook, state.currentChapter, verseKeys[index + 1]) : null;
        const prevSame = prevId && state.highlights[prevId]?.colorId === colorId;
        const nextSame = nextId && state.highlights[nextId]?.colorId === colorId;
        if (prevSame) span.classList.add("join-top");
        if (nextSame) span.classList.add("join-bottom");
      }
    }
    const favMark = state.favorites[id] ? "★" : "";
    span.innerHTML = `<span class="verse-inline-text"><span class="verse-num">${verse}</span><span class="verse-body">${verses[verse]}</span></span><span class="fav-marker ${favMark ? "" : "hidden"}">★</span>`;
    span.addEventListener("click", (event) => handleVerseClick(event, id));
    block.appendChild(span);
  });
  elements.verseList.appendChild(block);
}

function handleVerseClick(event, id) {
  const multi = event.ctrlKey || event.metaKey;
  const { book, chapter, verse } = parseVerseId(id);
  state.currentBook = book;
  state.currentChapter = chapter;
  state.currentVerse = verse;
  saveState();
  elements.bookSelect.value = book;
  updateChapterOptions();
  updateVerseOptions();
  if (!multi) {
    if (state.selected.size === 1 && state.selected.has(id)) {
      state.selected.clear();
    } else {
      state.selected.clear();
      state.selected.add(id);
    }
  } else {
    if (state.selected.has(id)) {
      state.selected.delete(id);
    } else {
      state.selected.add(id);
    }
  }
  updateSelectionUI();
}

function updateSelectionUI() {
  const count = state.selected.size;
  if (count === 0) {
    elements.palette.hidden = true;
    renderVerses();
    return;
  }
  elements.palette.hidden = false;
  const hasHighlight = Array.from(state.selected).some((id) => state.highlights[id]);
  elements.removeHighlightPill.hidden = !hasHighlight;
  const allFavorite = Array.from(state.selected).every((id) => state.favorites[id]);
  elements.favoriteBtn.textContent = allFavorite ? "Unfavorite" : "Favorite";
  saveState();
  renderVerses();
}

function buildSelectionPayload() {
  const selectedIds = Array.from(state.selected);
  if (selectedIds.length === 0) return "";
  const sorted = selectedIds
    .map((id) => parseVerseId(id))
    .sort((a, b) => {
      const bookIndex = bookOrder.indexOf(a.book) - bookOrder.indexOf(b.book);
      if (bookIndex !== 0) return bookIndex;
      const chapterDiff = Number(a.chapter) - Number(b.chapter);
      if (chapterDiff !== 0) return chapterDiff;
      return Number(a.verse) - Number(b.verse);
    });
  const lines = [];
  let lastGroup = "";
  sorted.forEach((entry) => {
    const text = getVerseText(entry);
    const groupKey = `${entry.book}|${entry.chapter}`;
    if (groupKey !== lastGroup) {
      lines.push(`${entry.book} ${entry.chapter}:${entry.verse} ${text}`);
      lastGroup = groupKey;
    } else {
      lines.push(`${entry.verse} ${text}`);
    }
  });
  return lines.join("\n");
}

function sortVerseEntries(ids) {
  return ids
    .map((id) => parseVerseId(id))
    .sort((a, b) => {
      const bookIndex = bookOrder.indexOf(a.book) - bookOrder.indexOf(b.book);
      if (bookIndex !== 0) return bookIndex;
      const chapterDiff = Number(a.chapter) - Number(b.chapter);
      if (chapterDiff !== 0) return chapterDiff;
      return Number(a.verse) - Number(b.verse);
    });
}

function formatMemorizeLabel(ids) {
  const sorted = sortVerseEntries(ids);
  if (sorted.length === 0) return "Memorize";
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (first.book === last.book && first.chapter === last.chapter) {
    if (first.verse === last.verse) {
      return `${first.book} ${first.chapter}:${first.verse}`;
    }
    return `${first.book} ${first.chapter}:${first.verse}-${last.verse}`;
  }
  return `${first.book} ${first.chapter}:${first.verse} → ${last.book} ${last.chapter}:${last.verse}`;
}

function buildMemorizeText(ids) {
  const sorted = sortVerseEntries(ids);
  const parts = [];
  sorted.forEach(({ book, chapter, verse }) => {
    const text = getVerseText({ book, chapter, verse });
    if (!text) return;
    parts.push(text);
  });
  return parts.join(" ");
}

function addMemorizeFromSelection() {
  if (state.selected.size === 0) return;
  const id = `mem-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const verseIds = Array.from(state.selected);
  state.memorize[id] = { verseIds, ts: Date.now() };
  saveState();
  state.selected.clear();
  elements.palette.hidden = true;
  renderMemorize();
  renderVerses();
}

function buildMemorizeEntries() {
  return Object.keys(state.memorize).map((id) => ({
    id,
    verseIds: state.memorize[id].verseIds || [],
    ts: state.memorize[id].ts || 0
  })).sort((a, b) => b.ts - a.ts);
}

function applyHighlight(colorId) {
  const now = Date.now();
  state.selected.forEach((id) => {
    state.highlights[id] = { colorId, ts: now };
  });
  saveState();
  elements.palette.hidden = true;
  state.selected.clear();
  render();
}

function clearHighlight() {
  state.selected.forEach((id) => {
    delete state.highlights[id];
  });
  saveState();
  render();
}

function clearSelection() {
  state.selected.clear();
  elements.palette.hidden = true;
  saveState();
  renderVerses();
}

function getVerseText({ book, chapter, verse }) {
  return state.data?.[book]?.[chapter]?.[verse] || "";
}

function shouldShowStartup() {
  if (!state.startupEnabled) return false;
  if (state.startupMemoryId === "random") {
    return Object.keys(state.memorize).length > 0;
  }
  return state.startupMemoryId && state.memorize[state.startupMemoryId];
}

function updateStartupOverlayContent() {
  if (!elements.startupOverlay) return;
  if (!state.data) {
    elements.startupReference.textContent = "Loading…";
    elements.startupText.textContent = "Preparing your verse.";
    return;
  }
  const activeId = state.startupActiveMemoryId || state.startupMemoryId;
  const entry = state.memorize[activeId];
  if (!entry) {
    elements.startupReference.textContent = "No verse selected";
    elements.startupText.textContent = "Choose a verse or group in the Memorize tab.";
    return;
  }
  elements.startupReference.textContent = formatMemorizeLabel(entry.verseIds);
  elements.startupText.textContent = buildMemorizeText(entry.verseIds) || "Select a verse to memorize.";
}

function showStartupOverlay() {
  if (state.startupMemoryId === "random") {
    const keys = Object.keys(state.memorize);
    state.startupActiveMemoryId = keys[Math.floor(Math.random() * keys.length)] || "";
  } else {
    state.startupActiveMemoryId = state.startupMemoryId;
  }
  startupLocked = true;
  document.body.classList.add("startup-locked");
  elements.startupOverlay.hidden = false;
  updateStartupOverlayContent();
  if (window.appShell && typeof window.appShell.setStartupMode === "function") {
    requestAnimationFrame(() => {
      const card = elements.startupCard;
      if (!card) {
        window.appShell.setStartupMode("compact");
        return;
      }
      const rect = card.getBoundingClientRect();
      const padding = 48;
      const width = Math.ceil(rect.width + padding);
      const height = Math.ceil(rect.height + padding);
      window.appShell.setStartupMode({ mode: "compact", width, height });
    });
  }
}

function hideStartupOverlay() {
  startupLocked = false;
  state.startupActiveMemoryId = "";
  document.body.classList.remove("startup-locked");
  elements.startupOverlay.hidden = true;
  if (window.appShell && typeof window.appShell.setStartupMode === "function") {
    window.appShell.setStartupMode({ mode: "normal", width: 950, height: 750, center: true });
  }
}

function buildHighlightEntries() {
  return Object.keys(state.highlights).map((id) => {
    const { book, chapter, verse } = parseVerseId(id);
    return {
      id,
      book,
      chapter: parseInt(chapter, 10),
      verse: parseInt(verse, 10),
      text: getVerseText({ book, chapter, verse }),
      colorId: state.highlights[id].colorId,
      ts: state.highlights[id].ts
    };
  });
}

function renderHighlights() {
  if (!state.data) return;
  const filter = elements.highlightFilter?.value || "all";
  const sort = elements.highlightSort.value;
  let entries = buildHighlightEntries();

  if (filter !== "all") {
    entries = entries.filter((entry) => entry.colorId === filter);
  }

  if (state.searchQuery) {
    entries = entries.filter((entry) => matchesWordStart(`${entry.book} ${entry.chapter}:${entry.verse} ${entry.text}`, state.searchQuery));
  }

  const bookIndex = Object.fromEntries(bookOrder.map((book, index) => [book, index]));
  if (sort === "recency") {
    entries.sort((a, b) => b.ts - a.ts);
  } else if (sort === "oldest") {
    entries.sort((a, b) => a.ts - b.ts);
  } else if (sort === "book") {
    entries.sort((a, b) => {
      const bi = (bookIndex[a.book] ?? 999) - (bookIndex[b.book] ?? 999);
      if (bi !== 0) return bi;
      if (a.chapter !== b.chapter) return a.chapter - b.chapter;
      return a.verse - b.verse;
    });
  } else if (sort === "color") {
    entries.sort((a, b) => {
      const ci = palette.findIndex((p) => p.id === a.colorId) - palette.findIndex((p) => p.id === b.colorId);
      if (ci !== 0) return ci;
      const bi = (bookIndex[a.book] ?? 999) - (bookIndex[b.book] ?? 999);
      if (bi !== 0) return bi;
      if (a.chapter !== b.chapter) return a.chapter - b.chapter;
      return a.verse - b.verse;
    });
  }

  elements.highlightList.innerHTML = "";
  if (entries.length === 0) {
    const empty = document.createElement("div");
    empty.className = "card";
    empty.textContent = "No highlights yet. Select verses and choose a color.";
    elements.highlightList.appendChild(empty);
    return;
  }

  entries.forEach((entry) => {
    const verseHtml = highlightText(entry.text, state.searchQuery);
    const color = palette.find((p) => p.id === entry.colorId);
    const card = document.createElement("article");
    card.className = "card highlighted";
    if (color) card.style.setProperty("--hl", color.hex);
    card.innerHTML = `
      <div class="verse">
        <div class="verse-number">${escapeHtml(`${entry.book} ${entry.chapter}:${entry.verse}`)}</div>
        <div class="verse-text">${verseHtml}</div>
        <div class="verse-actions">
          <span class="badge">${color ? color.name : "Highlight"}</span>
        </div>
      </div>
    `;
    card.addEventListener("click", () => {
      jumpToVerse(entry.book, String(entry.chapter), String(entry.verse));
      applyView("read");
    });
    elements.highlightList.appendChild(card);
  });
}

function renderFavorites() {
  if (!state.data) return;
  let entries = Object.keys(state.favorites).map((id) => {
    const { book, chapter, verse } = parseVerseId(id);
    return {
      id,
      book,
      chapter: parseInt(chapter, 10),
      verse: parseInt(verse, 10),
      text: getVerseText({ book, chapter, verse }),
      ts: state.favorites[id].ts,
      colorId: state.highlights[id]?.colorId || null
    };
  });

  const filter = elements.favoriteFilter?.value || "all";
  const sort = elements.favoriteSort?.value || "recency";
  if (filter !== "all") {
    entries = entries.filter((entry) => entry.colorId === filter);
  }
  if (state.searchQuery) {
    entries = entries.filter((entry) => matchesWordStart(`${entry.book} ${entry.chapter}:${entry.verse} ${entry.text}`, state.searchQuery));
  }

  const bookIndex = Object.fromEntries(bookOrder.map((book, index) => [book, index]));
  if (sort === "recency") {
    entries.sort((a, b) => b.ts - a.ts);
  } else if (sort === "oldest") {
    entries.sort((a, b) => a.ts - b.ts);
  } else if (sort === "book") {
    entries.sort((a, b) => {
      const bi = (bookIndex[a.book] ?? 999) - (bookIndex[b.book] ?? 999);
      if (bi !== 0) return bi;
      if (a.chapter !== b.chapter) return a.chapter - b.chapter;
      return a.verse - b.verse;
    });
  } else if (sort === "color") {
    entries.sort((a, b) => {
      const ci = palette.findIndex((p) => p.id === a.colorId) - palette.findIndex((p) => p.id === b.colorId);
      if (ci !== 0) return ci;
      const bi = (bookIndex[a.book] ?? 999) - (bookIndex[b.book] ?? 999);
      if (bi !== 0) return bi;
      if (a.chapter !== b.chapter) return a.chapter - b.chapter;
      return a.verse - b.verse;
    });
  }

  elements.favoriteList.innerHTML = "";
  if (entries.length === 0) {
    const empty = document.createElement("div");
    empty.className = "card";
    empty.textContent = "No favorites yet. Select verses and tap Favorite.";
    elements.favoriteList.appendChild(empty);
    return;
  }

  entries.forEach((entry) => {
    const verseHtml = highlightText(entry.text, state.searchQuery);
    const card = document.createElement("article");
    card.className = "card favorite";
    const highlight = state.highlights[entry.id];
    if (highlight) {
      const color = palette.find((p) => p.id === highlight.colorId);
      if (color) {
        card.classList.add("highlighted");
        card.style.setProperty("--hl", color.hex);
      }
    }
    card.innerHTML = `
      <div class="verse">
        <div class="verse-number">${escapeHtml(`${entry.book} ${entry.chapter}:${entry.verse}`)}</div>
        <div class="verse-text">${verseHtml}</div>
        <div class="verse-actions">
          <span class="badge">Favorite</span>
          ${highlight ? `<span class="badge">${(palette.find((p) => p.id === highlight.colorId) || {}).name || "Highlight"}</span>` : ""}
        </div>
      </div>
    `;
    card.addEventListener("click", () => {
      jumpToVerse(entry.book, String(entry.chapter), String(entry.verse));
      applyView("read");
    });
    elements.favoriteList.appendChild(card);
  });
}

function updateStartupSelect() {
  elements.startupSelect.innerHTML = "";
  const entries = buildMemorizeEntries();
  const emptyOption = document.createElement("option");
  emptyOption.value = "";
  emptyOption.textContent = entries.length ? "Choose a verse or group" : "No memorized verses yet";
  elements.startupSelect.appendChild(emptyOption);
  if (entries.length) {
    const randomOption = document.createElement("option");
    randomOption.value = "random";
    randomOption.textContent = "Random (from memorized)";
    elements.startupSelect.appendChild(randomOption);
  }
  entries.forEach((entry) => {
    const option = document.createElement("option");
    option.value = entry.id;
    option.textContent = formatMemorizeLabel(entry.verseIds);
    elements.startupSelect.appendChild(option);
  });
  if (!state.startupMemoryId || (state.startupMemoryId !== "random" && !state.memorize[state.startupMemoryId])) {
    state.startupMemoryId = "";
  }
  elements.startupSelect.value = state.startupMemoryId;
  initCustomSelect(elements.startupSelect);
  syncCustomSelect(elements.startupSelect);
  elements.startupToggle.checked = state.startupEnabled;
  saveState();
}

function renderMemorize() {
  if (!state.data) return;
  let entries = buildMemorizeEntries();
  elements.memorizeList.innerHTML = "";
  updateStartupSelect();
  if (state.searchQuery) {
    entries = entries.filter((entry) => {
      const label = formatMemorizeLabel(entry.verseIds);
      const text = buildMemorizeText(entry.verseIds);
      return matchesWordStart(`${label} ${text}`, state.searchQuery);
    });
  }
  if (entries.length === 0) {
    const empty = document.createElement("div");
    empty.className = "card";
    empty.textContent = state.searchQuery
      ? "No memorized verses match your search."
      : "No memorized verses yet. Select verses and tap Memorize.";
    elements.memorizeList.appendChild(empty);
    return;
  }
  entries.forEach((entry) => {
    const card = document.createElement("article");
    card.className = "card";
    const label = formatMemorizeLabel(entry.verseIds);
    const text = buildMemorizeText(entry.verseIds);
    const textHtml = highlightText(text, state.searchQuery);
    card.innerHTML = `
      <div class="verse">
        <div class="verse-number">${escapeHtml(label)}</div>
        <div class="verse-text">${textHtml}</div>
        <div class="verse-actions">
          <span class="badge">Memorize</span>
          <button class="ghost" type="button" data-action="remove" data-id="${entry.id}">Remove</button>
        </div>
      </div>
    `;
    card.querySelector('[data-action="remove"]').addEventListener("click", (event) => {
      event.stopPropagation();
      delete state.memorize[entry.id];
      if (state.startupMemoryId === entry.id) {
        state.startupMemoryId = "";
      }
      saveState();
      renderMemorize();
    });
    card.addEventListener("click", () => {
      const first = sortVerseEntries(entry.verseIds)[0];
      if (first) {
        jumpToVerse(first.book, String(first.chapter), String(first.verse));
        applyView("read");
      }
    });
    elements.memorizeList.appendChild(card);
  });
}

function applyView(view) {
  state.view = view;
  saveState();
  document.querySelectorAll(".view").forEach((section) => {
    section.hidden = section.dataset.view !== view;
  });
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.view === view);
  });
  if (elements.controls) {
    elements.controls.hidden = view !== "read";
  }
  if (elements.topbarControls) {
    elements.topbarControls.hidden = view !== "read";
  }
  if (view !== "read") {
    elements.palette.hidden = true;
  }
}

function jumpToVerse(book, chapter, verse) {
  state.currentBook = book;
  state.currentChapter = chapter;
  state.currentVerse = verse;
  saveState();
  elements.bookSelect.value = book;
  updateChapterOptions();
  updateVerseOptions();
  renderVerses();
  const target = document.querySelector(`[data-verse-id="${makeVerseId(book, chapter, verse)}"]`);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => flashVerse(target), 400);
  }
}

function flashVerse(target) {
  target.classList.remove("flash");
  requestAnimationFrame(() => {
    target.classList.add("flash");
    setTimeout(() => target.classList.remove("flash"), 900);
  });
}

function handleSearch(query) {
  const clean = normalizeQuery(query);
  state.searchQuery = clean;
  saveState();
  if (!state.data) return;
  if (state.view !== "read") {
    elements.searchResults.hidden = true;
    elements.resultsList.innerHTML = "";
    elements.viewRead.classList.remove("search-active");
    if (state.view === "highlights") renderHighlights();
    if (state.view === "favorites") renderFavorites();
    if (state.view === "memorize") renderMemorize();
    return;
  }
  if (clean.length < 2) {
    elements.searchResults.hidden = true;
    elements.resultsList.innerHTML = "";
    elements.viewRead.classList.remove("search-active");
    return;
  }
  const ref = parseReference(clean);
  const textMatches = ref
    ? buildReferenceMatches(ref)
    : state.searchIndex.filter((entry) => matchesWordStart(entry.haystack, clean));
  const matches = ref ? textMatches : textMatches;
  elements.resultsList.innerHTML = "";
  const limited = matches.slice(0, 100);
  limited.forEach((entry) => {
    const card = document.createElement("article");
    card.className = "card";
    const rangeLabel = entry.endVerse
      ? `${entry.book} ${entry.chapter}:${entry.verse}-${entry.endVerse}`
      : `${entry.book} ${entry.chapter}:${entry.verse}`;
    const verseHtml = highlightText(entry.text, clean);
    card.innerHTML = `
      <div class="verse">
        <div class="verse-number">${escapeHtml(rangeLabel)}</div>
        <div class="verse-text">${verseHtml}</div>
        <div class="verse-actions"></div>
      </div>
    `;
    card.addEventListener("click", () => {
      elements.searchInput.value = "";
      handleSearch("");
      applyView("read");
      setTimeout(() => jumpToVerse(entry.book, entry.chapter, entry.verse), 0);
    });
    elements.resultsList.appendChild(card);
  });
  elements.searchResults.hidden = false;
  elements.resultsCount.textContent = `${matches.length} results`;
  elements.viewRead.classList.add("search-active");
}

function bindEvents() {
  document.querySelectorAll("select.native-select").forEach((select) => initCustomSelect(select));
  elements.bookSelect.addEventListener("change", (event) => {
    state.currentBook = event.target.value;
    updateChapterOptions();
    updateVerseOptions();
    renderVerses();
    saveState();
    setTimeout(() => openCustomSelect(elements.chapterSelect), 0);
  });

  elements.chapterSelect.addEventListener("change", (event) => {
    state.currentChapter = event.target.value;
    updateVerseOptions();
    renderVerses();
    saveState();
    setTimeout(() => openCustomSelect(elements.verseSelect), 0);
  });

  elements.verseSelect.addEventListener("change", (event) => {
    state.currentVerse = event.target.value;
    jumpToVerse(state.currentBook, state.currentChapter, state.currentVerse);
    saveState();
  });

  elements.translationSelect.addEventListener("change", (event) => {
    loadTranslation(event.target.value);
  });

  elements.favoriteBtn.addEventListener("click", () => {
    const now = Date.now();
    const allFavorite = Array.from(state.selected).every((id) => state.favorites[id]);
    state.selected.forEach((id) => {
      if (allFavorite) {
        delete state.favorites[id];
      } else {
        state.favorites[id] = { ts: now };
      }
    });
    saveState();
    render();
    updateSelectionUI();
  });

  elements.memorizeBtn.addEventListener("click", addMemorizeFromSelection);

  elements.copyBtn.addEventListener("click", async () => {
    const payload = buildSelectionPayload();
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(payload);
      elements.copyBtn.textContent = "Copied";
      if (copyResetTimer) clearTimeout(copyResetTimer);
      copyResetTimer = setTimeout(() => {
        elements.copyBtn.textContent = "Copy";
        copyResetTimer = null;
      }, 1000);
    } catch (err) {
      console.error("Copy failed", err);
    }
  });

  elements.searchOriginalBtn.addEventListener("click", async () => {
    const payload = buildSelectionPayload();
    if (!payload) return;
    const prompt = "break down this in it's original language whether it be Greek, Hebrew, or Aramaic";
    const query = `${payload}\n\n${prompt}`;
    try {
      await navigator.clipboard.writeText(payload);
    } catch (err) {
      console.error("Copy failed", err);
    }
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    window.open(url, "_blank");
  });

  elements.removeHighlightPill.addEventListener("click", clearHighlight);
  elements.searchInput.addEventListener("input", (event) => handleSearch(event.target.value));

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => applyView(tab.dataset.view));
  });

  elements.highlightFilter?.addEventListener("change", renderHighlights);
  elements.highlightSort?.addEventListener("change", renderHighlights);
  elements.favoriteFilter?.addEventListener("change", renderFavorites);
  elements.favoriteSort?.addEventListener("change", renderFavorites);
  elements.startupToggle.addEventListener("change", (event) => {
    state.startupEnabled = event.target.checked;
    saveState();
  });

  elements.startupSelect.addEventListener("change", (event) => {
    state.startupMemoryId = event.target.value;
    state.startupActiveMemoryId = "";
    saveState();
    if (startupLocked) updateStartupOverlayContent();
  });

  elements.startupContinue.addEventListener("click", hideStartupOverlay);
  elements.windowMinimize.addEventListener("click", () => {
    if (window.appShell && typeof window.appShell.minimize === "function") {
      window.appShell.minimize();
    }
  });
  elements.windowMaximize.addEventListener("click", () => {
    if (window.appShell && typeof window.appShell.toggleMaximize === "function") {
      window.appShell.toggleMaximize();
    }
  });
  elements.windowClose.addEventListener("click", () => {
    if (window.appShell && typeof window.appShell.closeApp === "function") {
      window.appShell.closeApp();
    } else {
      window.close();
    }
  });
  elements.appMinimize.addEventListener("click", () => {
    if (window.appShell && typeof window.appShell.minimize === "function") {
      window.appShell.minimize();
    }
  });
  elements.appMaximize.addEventListener("click", () => {
    if (window.appShell && typeof window.appShell.toggleMaximize === "function") {
      window.appShell.toggleMaximize();
    }
  });
  elements.appClose.addEventListener("click", () => {
    if (window.appShell && typeof window.appShell.closeApp === "function") {
      window.appShell.closeApp();
    } else {
      window.close();
    }
  });

  document.addEventListener("click", (event) => {
    if (state.selected.size === 0) return;
    const isVerseCard = event.target.closest(".card");
    const isVerseInline = event.target.closest(".verse-inline");
    const inPalette = event.target.closest("#palette");
    if (isVerseCard || isVerseInline || inPalette) return;
    clearSelection();
  });

  document.addEventListener("click", (event) => {
    const inSelect = event.target.closest(".select-shell");
    if (inSelect) return;
    closeAllSelectMenus();
  });

  document.addEventListener("click", (event) => {
    if (state.view !== "read") return;
    if (event.target.closest(".paragraph")) return;
    if (event.target.closest(".topbar")) return;
    if (event.target.closest(".controls")) return;
    if (event.target.closest("#palette")) return;
    if (event.target.closest(".search-results")) return;

    const x = event.clientX;
    const width = window.innerWidth;
    if (x < width * 0.25) {
      goToChapter(-1);
    } else if (x > width * 0.75) {
      goToChapter(1);
    }
  });

  window.addEventListener("beforeunload", saveState);
}

loadState();
buildPalette();
bindEvents();
if (shouldShowStartup()) {
  showStartupOverlay();
}
loadData().catch((err) => {
  if (appClosed) return;
  console.error(err);
  setStatus("Failed to load the NIV data.");
});
