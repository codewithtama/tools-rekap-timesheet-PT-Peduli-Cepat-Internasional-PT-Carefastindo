import {
  RekapProjectData,
  PROYEK_TEMPLATE,
  ALIAS,
  FUZZY_MIN,
} from "../../types/attendance";
import { norm, stringSimilarity } from "./stringUtils";

/**
 * Match projects with PROYEK_TEMPLATE rows via Alias, Exact, and Fuzzy (>=85%)
 */
export function cocokkan(
  projects: RekapProjectData[],
  templateNames: string[] = PROYEK_TEMPLATE
): Record<number, [number, string]> {
  const tn = templateNames.map(n => norm(n));
  const hasil: Record<number, [number, string]> = {};
  const pakai = new Set<number>();

  const aliasNorm: Record<string, string> = {};
  Object.keys(ALIAS).forEach(k => {
    aliasNorm[norm(k)] = ALIAS[k];
  });

  projects.forEach((p, i) => {
    const tujuan = aliasNorm[norm(p.kode)] || aliasNorm[norm(p.nama)];
    if (tujuan && tn.includes(norm(tujuan))) {
      const j = tn.indexOf(norm(tujuan));
      if (!pakai.has(j)) {
        hasil[i] = [j, "alias"];
        pakai.add(j);
      }
    }
  });

  projects.forEach((p, i) => {
    if (i in hasil) return;
    const n = norm(p.nama);
    const j = tn.indexOf(n);
    if (j !== -1 && !pakai.has(j)) {
      hasil[i] = [j, "sama"];
      pakai.add(j);
    }
  });

  const kandidat: [number, number, number][] = [];
  projects.forEach((p, i) => {
    if (i in hasil) return;
    const pNorm = norm(p.nama);
    tn.forEach((t, j) => {
      if (pakai.has(j)) return;
      const rasio = stringSimilarity(pNorm, t);
      if (rasio >= FUZZY_MIN) {
        kandidat.push([rasio, i, j]);
      }
    });
  });

  kandidat.sort((a, b) => b[0] - a[0]);

  for (const [rasio, i, j] of kandidat) {
    if (i in hasil || pakai.has(j)) continue;
    hasil[i] = [j, `mirip ${Math.round(rasio * 100)}%`];
    pakai.add(j);
  }

  return hasil;
}

