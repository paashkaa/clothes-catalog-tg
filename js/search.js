// ==============================
// 🔧 НАСТРОЙКИ
// ==============================

const SearchConfig = {
    maxLevenshteinDistance: 1, // допуск опечаток
    minWordLength: 2           // игнор коротких слов
};

// Синонимы (можно расширять)
const SYNONYMS = {
    "кофт": ["худи", "свитер"],
    "ботинк": ["обув", "сапог"],
    "шт": ["брюк"],
};

// ==============================
// 🧠 УТИЛИТЫ
// ==============================

function normalizeString(str) {
    if (!str) return '';
    return str
        .toLowerCase()
        .replace(/ё/g, 'е')
        .replace(/[^\w\sа-я]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// "Лёгкий" стемминг
function stemWord(word) {
    return word
        // прилагательные
        .replace(/(ый|ий|ой|ая|ое|ее|ые|ие|ую|юю|ого|ему|ими|ых|их)$/g, '')
        // существительные
        .replace(/(а|я|ы|и|е|о|у|ю|ой|ей|ам|ям|ами|ями|ах|ях)$/g, '');
}

function tokenize(str) {
    return normalizeString(str)
        .split(/\s+/)
        .map(stemWord)
        .filter(w => w.length >= SearchConfig.minWordLength);
}

// ==============================
// 🔁 СИНОНИМЫ
// ==============================

function expandQuery(words) {
    const result = new Set(words);

    words.forEach(w => {
        if (SYNONYMS[w]) {
            SYNONYMS[w].forEach(s => result.add(stemWord(s)));
        }
    });

    return Array.from(result);
}

// ==============================
// 🔍 LEVENSHTEIN
// ==============================

function levenshtein(a, b) {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            matrix[i][j] = b[i - 1] === a[j - 1]
                ? matrix[i - 1][j - 1]
                : Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
        }
    }

    return matrix[b.length][a.length];
}

function fuzzyMatch(q, w) {
    if (w.includes(q)) return true;
    if (Math.abs(w.length - q.length) > 1) return false;

    return levenshtein(q, w) <= SearchConfig.maxLevenshteinDistance;
}

// ==============================
// ⚡ КЕШ ДАННЫХ
// ==============================

function buildSearchIndex(flatList) {
    return flatList.map(item => {
        const text = [
            item.name,
            item.folder,
            item.gender,
            item.category,
            ...(item.items || []),
            ...(item.colors || [])
        ].filter(Boolean).join(' ');

        return {
            original: item,
            words: tokenize(text)
        };
    });
}

// ==============================
// 🧮 СКОРИНГ
// ==============================

function scoreItem(itemWords, queryWords) {
    let matchedCount = 0;
    let matchStrength = 0;

    for (const q of queryWords) {
        let found = false;

        for (const w of itemWords) {
            if (w === q) {
                found = true;
                matchStrength += 3;
                break;
            }

            if (w.includes(q)) {
                found = true;
                matchStrength += 2;
                break;
            }

            if (fuzzyMatch(q, w)) {
                found = true;
                matchStrength += 1;
                break;
            }
        }

        if (found) matchedCount++;
    }

    // если не найдено ВСЕ слова — сильно режем результат
    if (matchedCount < queryWords.length) {
        return 0;
    }

    // бонус за полное совпадение всех слов
    const completenessBonus = matchedCount === queryWords.length ? 10 : 0;

    return matchStrength + completenessBonus;
}

// ==============================
// 🚀 ОСНОВНОЙ ПОИСК
// ==============================

window.createSearchEngine = function(flatList) {
    const index = buildSearchIndex(flatList);

    function search(query) {
        if (!query || !query.trim()) {
            return flatList;
        }

        let queryWords = tokenize(query);
        if (queryWords.length === 0) return flatList;

        queryWords = expandQuery(queryWords);

        const results = [];

        for (const entry of index) {
            const score = scoreItem(entry.words, queryWords);

            if (score > 0) {
                results.push({
                    item: entry.original,
                    score
                });
            }
        }

        results.sort((a, b) => b.score - a.score);

        return results.map(r => r.item);
    }

    return { search };
};