/**
 * Clean cell text exactly as Python re.sub(r"\s+", " ", ...).strip()
 */
export function cleanText(val: any): string {
  if (val === null || val === undefined) return "";
  return String(val).replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Normalize text for string matching
 */
export function norm(s: string): string {
  const upper = String(s || "").toUpperCase().replace(/[^A-Z0-9]+/g, " ");
  return upper.replace(/\s+/g, " ").trim();
}

/**
 * Extract project code and name: e.g. "09010106 - CIREBON SUPER BLOK" -> ("09010106", "CIREBON SUPER BLOK")
 */
export function pisahProyek(teks: string): [string, string] {
  const m = (teks || "").match(/^\s*(\d+)\s*-\s*(.+?)\s*$/);
  if (m) {
    return [m[1], m[2]];
  }
  return ["", (teks || "").trim()];
}

/**
 * Safe filename for project folder / zip
 */
export function namaAman(teks: string): string {
  let t = (teks || "").replace(/[\\/:*?"<>|]+/g, "-");
  t = t.replace(/\s+/g, " ").replace(/^[. ]+|[. ]+$/g, "");
  return t || "PROYEK";
}

/**
 * SequenceMatcher ratio calculation matching Python difflib
 */
export function stringSimilarity(a: string, b: string): number {
  if (!a && !b) return 1.0;
  if (!a || !b) return 0.0;
  if (a === b) return 1.0;

  function findMatchingBlocks(s1: string, s2: string): number {
    let matches = 0;
    const l1 = s1.length;
    const l2 = s2.length;
    const dp: number[][] = Array(l1 + 1).fill(0).map(() => Array(l2 + 1).fill(0));
    let maxLen = 0;
    let end1 = 0;
    let end2 = 0;

    for (let i = 1; i <= l1; i++) {
      for (let j = 1; j <= l2; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
          if (dp[i][j] > maxLen) {
            maxLen = dp[i][j];
            end1 = i;
            end2 = j;
          }
        }
      }
    }

    if (maxLen === 0) return 0;
    matches += maxLen;

    const left1 = s1.slice(0, end1 - maxLen);
    const left2 = s2.slice(0, end2 - maxLen);
    const right1 = s1.slice(end1);
    const right2 = s2.slice(end2);

    matches += findMatchingBlocks(left1, left2);
    matches += findMatchingBlocks(right1, right2);
    return matches;
  }

  const matches = findMatchingBlocks(a, b);
  return (2.0 * matches) / (a.length + b.length);
}

