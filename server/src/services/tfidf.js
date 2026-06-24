/**
 * tfidf.js — Pure-JS TF-IDF + cosine similarity for RAG retrieval.
 *
 * No external dependencies. Interview talking point:
 * "I implemented TF-IDF from scratch to avoid adding a vector-DB dependency
 *  while still demonstrating the full RAG retrieval pattern."
 *
 * Pipeline:
 *   text → tokenize → tf() per chunk → buildIDF(all chunks) → tfidfVec()
 *   query → same → cosineSim(query vec, chunk vec) → rank → top-k
 */

// Common English + code stopwords to skip
const STOPWORDS = new Set([
  "the","a","an","and","or","but","in","on","at","to","for","of","with",
  "as","by","from","is","it","its","this","that","be","are","was","were",
  "has","have","had","not","no","if","do","did","so","we","you","i","he",
  "she","they","what","which","who","how","all","can","will","would","may",
  "use","used","using","new","add","get","set","let","var","const","return",
  "import","export","default","function","class","extends","implements",
  "true","false","null","undefined","void","type","interface","async","await",
]);

/**
 * Tokenize text into meaningful terms.
 * Splits on non-alphanumeric/underscore chars, lowercases, removes short words
 * and stopwords.
 */
export function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t) && !/^\d+$/.test(t));
}

/**
 * Term frequency map for a token array.
 * Values are normalized to [0,1] so short and long chunks are comparable.
 */
export function tf(tokens) {
  const freq = {};
  for (const t of tokens) freq[t] = (freq[t] || 0) + 1;
  const max = Math.max(...Object.values(freq), 1);
  for (const t of Object.keys(freq)) freq[t] /= max;
  return freq;
}

/**
 * Build IDF map from an array of token arrays (one per chunk).
 * Uses smoothed IDF: log((N+1)/(df+1)) + 1 so unseen terms don't blow up.
 */
export function buildIDF(allTokenArrays) {
  const N = allTokenArrays.length;
  const df = {};
  for (const tokens of allTokenArrays) {
    for (const t of new Set(tokens)) {
      df[t] = (df[t] || 0) + 1;
    }
  }
  const idf = {};
  for (const [t, count] of Object.entries(df)) {
    idf[t] = Math.log((N + 1) / (count + 1)) + 1;
  }
  return idf;
}

/**
 * Multiply TF by IDF to get a weighted sparse vector.
 */
export function tfidfVec(tfMap, idf) {
  const vec = {};
  for (const [t, freq] of Object.entries(tfMap)) {
    if (idf[t]) vec[t] = freq * idf[t];
  }
  return vec;
}

/**
 * Cosine similarity between two sparse term vectors (plain objects).
 */
export function cosineSim(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (const [t, w] of Object.entries(a)) {
    if (b[t]) dot += w * b[t];
    normA += w * w;
  }
  for (const w of Object.values(b)) normB += w * w;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
}

/**
 * Split text into overlapping chunks of ~chunkSize chars.
 * Overlap keeps context across chunk boundaries.
 */
export function chunkText(text, chunkSize = 600, overlap = 150) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, start + chunkSize).trim());
    if (start + chunkSize >= text.length) break;
    start += chunkSize - overlap;
  }
  return chunks.filter((c) => c.length > 40); // skip tiny trailing scraps
}
