import { db } from "./db";

const STOP = new Set(
  "de la que el en y a los las del se por un una para con no es al lo como mas más o pero sus su le ya este esta son entre cuando muy sin sobre ser tiene también me hasta hay donde quien desde todo nos durante uno ni contra ese eso mi qué que cómo como cual cuál puedo debo hacer".split(
    " ",
  ),
);

export function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function terms(query: string) {
  return [...new Set(normalize(query).split(/[^a-z0-9ñ]+/).filter((t) => t.length > 2 && !STOP.has(t)))];
}

/** Divide un documento en fragmentos por párrafos (~1200 caracteres). */
function chunks(content: string, size = 1200) {
  const paras = content.split(/\n\s*\n/);
  const out: string[] = [];
  let cur = "";
  for (const p of paras) {
    if ((cur + "\n\n" + p).length > size && cur) {
      out.push(cur);
      cur = p;
    } else cur = cur ? `${cur}\n\n${p}` : p;
  }
  if (cur) out.push(cur);
  return out;
}

export type SearchHit = { docId: string; title: string; category: string; sourceUrl: string | null; excerpt: string; score: number };

/**
 * Búsqueda léxica por fragmentos (sin dependencias externas). Suficiente para bases
 * de conocimiento de cientos de documentos; para escalar, reemplazar por embeddings
 * (pgvector) manteniendo la misma firma.
 */
export async function searchKnowledge(organizationId: string, query: string, limit = 5): Promise<SearchHit[]> {
  const qs = terms(query);
  if (!qs.length) return [];
  const docs = await db.knowledgeDoc.findMany({ where: { organizationId } });
  const hits: SearchHit[] = [];
  for (const d of docs) {
    const title = normalize(d.title + " " + d.category);
    for (const c of chunks(d.content)) {
      const body = normalize(c);
      let score = 0;
      for (const t of qs) {
        const stem = t.length > 5 ? t.slice(0, -2) : t; // tolera plurales/conjugaciones simples
        const n = body.split(stem).length - 1;
        if (n) score += 1 + Math.log(1 + n);
        if (title.includes(stem)) score += 2;
      }
      if (score > 0) hits.push({ docId: d.id, title: d.title, category: d.category, sourceUrl: d.sourceUrl, excerpt: c, score });
    }
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
