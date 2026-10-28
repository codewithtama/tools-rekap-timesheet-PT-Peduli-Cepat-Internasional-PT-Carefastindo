/**
 * Core Business Logic Engine for Proses Absensi
 * Faithfully matches Python implementation in /public/assets/aistudio/proses_absensi_b4f1e61c.py
 */

import {
  Employee,
  TimesheetData,
  RekapProjectData,
  KaryawanCek,
  PolaDetail,
  PicPackage,
  HARI,
  BLN,
  BULAN,
  BLN_SHORT,
  PROYEK_TEMPLATE,
  ALIAS,
  KODE_KOSONG,
  FUZZY_MIN,
  KODE_MAP,
  POLA_MIN_BERUNTUN,
  POLA_MIN_FREKUENSI,
} from "../types/attendance";

/**
 * Format Date into Indonesian display: e.g. "15 Okt 2026"
 */
export function tglId(d: Date): string {
  return `${d.getDate()} ${BLN[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Format Date to ISO YYYY-MM-DD
 */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISODate(str: string): Date {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Generate inclusive list of Dates between d0 and d1
 */
export function daftarTanggal(d0: Date, d1: Date): Date[] {
  const list: Date[] = [];
  const cur = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate());
  const end = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate());
  while (cur <= end) {
    list.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return list;
}

export function jmlHari(d0: Date, d1: Date): number {
  const diffTime = Math.abs(d1.getTime() - d0.getTime());
  return Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

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

  // Find matching blocks (longest common contiguous sequences)
  function findMatchingBlocks(s1: string, s2: string): number {
    let matches = 0;
    const l1 = s1.length;
    const l2 = s2.length;
    // Simple dynamic programming for common substrings
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

/**
 * Parse HTML timesheet raw content (from downloaded .xls / .html files)
 */
export function parseTimesheet(raw: string, fileName: string): TimesheetData {
  if (!raw.toLowerCase().includes("<table")) {
    throw new Error(
      "File ini bukan timesheet hasil download sistem (tidak ada tabel HTML). " +
      "Pastikan file yang diunggah berisi tabel timesheet."
    );
  }

  const judulMatch = raw.match(/Rekapitulasi Absensi\s*-\s*([^<\r\n]+)/i);
  const proyekMatch = raw.match(/Project\s*:\s*([^<\r\n]+)/i);
  const kodeMatch = raw.match(/Payroll Period Code\s*([^<\r\n]+)/i);
  const periodeMatch = raw.match(/Periode\s*:\s*(\d{4}-\d{2}-\d{2})\s*-\s*(\d{4}-\d{2}-\d{2})/i);

  // Parse HTML tables via DOMParser
  const parser = new DOMParser();
  const doc = parser.parseFromString(raw, "text/html");

  let tableElem = doc.getElementById("list_table") as HTMLTableElement | null;
  if (!tableElem) {
    const allTables = Array.from(doc.querySelectorAll("table"));
    if (allTables.length > 0) {
      tableElem = allTables.reduce((prev, curr) =>
        curr.querySelectorAll("tr").length > prev.querySelectorAll("tr").length ? curr : prev
      );
    }
  }

  if (!tableElem) {
    throw new Error("Tabel absensi tidak ditemukan di file");
  }

  // Extract heads
  const ths = Array.from(tableElem.querySelectorAll("th"));
  let heads: string[] = [];
  if (ths.length > 0) {
    heads = ths.map(th => cleanText(th.textContent));
  } else {
    const firstRow = tableElem.querySelector("tr");
    if (firstRow) {
      heads = Array.from(firstRow.querySelectorAll("td")).map(td => cleanText(td.textContent));
    }
  }

  const idxH = heads.findIndex((h, idx) => idx >= 3 && h.trim().toUpperCase() === "H");
  if (idxH === -1) {
    throw new Error("Kolom rekap H/I/A/G/O/S/SR/IR tidak ditemukan di header");
  }

  const nd = idxH - 3;
  const day_labels = heads.slice(3, idxH);

  // Extract employees
  const trs = Array.from(tableElem.querySelectorAll("tr"));
  const emps: Employee[] = [];
  let cur: Employee | null = null;

  for (const tr of trs) {
    const cells = Array.from(tr.querySelectorAll("td, th")).map(c => cleanText(c.textContent));
    if (cells.length === 0) continue;
    const first = cells[0] || "";

    if (first.toLowerCase().startsWith("total")) {
      continue;
    }

    if (/^\d+$/.test(first)) {
      // Row 1 of employee
      const codes = (cells.slice(3, 3 + nd).concat(Array(nd).fill(""))).slice(0, nd);
      const sys = cells.slice(3 + nd, 3 + nd + 8);
      const ket = cells.length > 3 + nd + 8 ? cells[3 + nd + 8] : "";

      cur = {
        nik: cells.length > 1 ? cells[1] : "",
        jab: cells.length > 2 ? cells[2] : "",
        codes,
        sys,
        ket,
        nama: "",
        g: 0,
        g_hari: [],
      };
      emps.push(cur);
    } else if (first === "" && cur !== null && !cur.nama) {
      // Sub-row of employee containing name in cell 1 and 'G' (Lembur) codes in date columns
      cur.nama = cells.length > 1 ? cells[1] : "";
      const bawah = cells.slice(3, 3 + nd);
      const g_hari: number[] = [];
      bawah.forEach((c, idx) => {
        if (c.trim().toUpperCase() === "G") {
          g_hari.push(idx);
        }
      });
      cur.g_hari = g_hari;
      cur.g = g_hari.length;
    }
  }

  if (emps.length === 0) {
    throw new Error("Tidak ada data karyawan di file " + fileName);
  }

  // Calculate dates per column
  const dates: (Date | null)[] = Array(nd).fill(null);
  let periode: [Date, Date] | null = null;

  if (periodeMatch) {
    const d0 = parseISODate(periodeMatch[1]);
    const d1 = parseISODate(periodeMatch[2]);
    periode = [d0, d1];
    const range = daftarTanggal(d0, d1);

    day_labels.forEach((lab, i) => {
      if (/^\d+$/.test(lab.trim())) {
        const dayNum = parseInt(lab.trim(), 10);
        const match = range.find(d => d.getDate() === dayNum);
        if (match) {
          dates[i] = match;
        }
      }
    });
  }

  const timesheetData: TimesheetData = {
    id: fileName + "_" + Math.random().toString(36).substring(2, 9),
    fileName,
    judul: judulMatch ? judulMatch[1].trim() : "",
    proyek: proyekMatch ? proyekMatch[1].trim() : "-",
    kode: kodeMatch ? kodeMatch[1].trim() : "-",
    periode,
    day_labels,
    dates,
    emps,
  };

  timesheetData.warnings = cekSilangSistem(timesheetData);
  return timesheetData;
}

/**
 * Cross-check script calculation with system values
 */
export function cekSilangSistem(data: TimesheetData): string[] {
  const warn: string[] = [];
  for (const e of data.emps) {
    const s = e.sys;
    if (s.length < 8 || !s.every(x => /^-?\d+(\.\d+)?$/.test(x))) {
      continue;
    }
    const [H, I, A, , O, S, SR, IR] = s.map(x => parseInt(parseFloat(x).toString(), 10));
    const c = e.codes;
    const mine = {
      H: c.filter(x => x.toUpperCase() === "H").length, // 'h' (BA) is counted in system Hadir
      I: c.filter(x => x.toUpperCase() === "I").length,
      A: c.filter(x => x.toUpperCase() === "A").length,
      O: c.filter(x => x.toUpperCase() === "O").length,
      S: c.filter(x => x.toUpperCase() === "S").length,
      SR: c.filter(x => x.toUpperCase() === "SR").length,
      IR: c.filter(x => x.toUpperCase() === "IR").length,
    };
    const theirs = { H, I, A, O, S, SR, IR };
    const beda: string[] = [];
    (Object.keys(mine) as (keyof typeof mine)[]).forEach(k => {
      if (mine[k] !== theirs[k]) {
        beda.push(`${k} (sistem: ${theirs[k]}, hasil: ${mine[k]})`);
      }
    });
    if (beda.length > 0) {
      warn.push(`${e.nik} ${e.nama}: beda di ${beda.join(", ")}`);
    }
  }
  return warn;
}

/**
 * Detect unfinalized days (hari berjalan) where system didn't count 'A' in system total yet.
 */
export function analisisHariBerjalan(
  timesheets: TimesheetData[],
  maksHari = 3,
  minAlfa = 3,
  rasioMin = 0.5
): Record<string, [number, number]> {
  const tot: Record<string, [number, number]> = {};
  const semuaTgl: Date[] = [];

  for (const data of timesheets) {
    const n = data.day_labels.length;
    data.dates.forEach(d => {
      if (d) semuaTgl.push(d);
    });

    const limit = Math.min(maksHari, n - 1);
    for (let k = 1; k <= limit; k++) {
      const idx = n - k;
      const d = data.dates[idx];
      if (!d) break;
      const iso = toISODate(d);

      for (const e of data.emps) {
        const sv = e.sys;
        if (sv.length < 8 || !sv.every(x => /^-?\d+(\.\d+)?$/.test(x))) {
          continue;
        }
        if (e.codes[idx]?.toUpperCase() !== "A") {
          continue;
        }
        const aSistem = parseInt(parseFloat(sv[2]).toString(), 10);
        const aSisa = e.codes.slice(0, idx).filter(c => c.toUpperCase() === "A").length;

        if (!tot[iso]) tot[iso] = [0, 0];
        tot[iso][0] += 1;
        if (aSistem === aSisa) {
          tot[iso][1] += 1;
        }
      }
    }
  }

  const hasil: Record<string, [number, number]> = {};
  if (semuaTgl.length === 0) return hasil;

  // Sort dates descending
  const sortedDates = Array.from(new Set(semuaTgl.map(d => toISODate(d)))).sort().reverse();

  for (const iso of sortedDates) {
    if (!tot[iso]) break;
    const [a, tdk] = tot[iso];
    if (a < minAlfa || tdk < rasioMin * a) {
      break;
    }
    hasil[iso] = [a, tdk];
  }

  return hasil;
}

/**
 * Slice timesheet data into d0..d1 range
 */
export function potongData(data: TimesheetData, d0: Date, d1: Date): { data: TimesheetData; dipotong: boolean } {
  if (!data.dates.some(d => d !== null)) {
    return { data, dipotong: false };
  }

  const keep: number[] = [];
  data.dates.forEach((d, i) => {
    if (d && d >= d0 && d <= d1) {
      keep.push(i);
    }
  });

  if (keep.length === 0) {
    throw new Error(`Periode file ${data.fileName} di luar rentang tanggal yang dipilih`);
  }

  if (keep.length === data.day_labels.length) {
    return { data, dipotong: false };
  }

  const baruIdx: Record<number, number> = {};
  keep.forEach((lama, n) => {
    baruIdx[lama] = n;
  });

  const emps: Employee[] = data.emps.map(e => {
    const newCodes = keep.map(i => e.codes[i]);
    const newGHari = e.g_hari.filter(i => i in baruIdx).map(i => baruIdx[i]);
    return {
      ...e,
      codes: newCodes,
      g_hari: newGHari,
      g: newGHari.length,
      sys: [], // system totals not valid for sliced range
    };
  });

  const tgl = keep.map(i => data.dates[i]);
  const day_labels = keep.map(i => data.day_labels[i]);

  const sliced: TimesheetData = {
    ...data,
    day_labels,
    dates: tgl,
    emps,
    periode: tgl[0] && tgl[tgl.length - 1] ? [tgl[0]!, tgl[tgl.length - 1]!] : null,
    dipotong_dari: data.day_labels.length,
  };

  return { data: sliced, dipotong: true };
}

/**
 * Format label for a date column: e.g. "Kamis 15 Okt"
 */
export function labelHari(data: TimesheetData, i: number): string {
  const d = data.dates[i];
  if (d) {
    const dayName = HARI[(d.getDay() + 6) % 7]; // 0=Monday in HARI
    return `${dayName} ${d.getDate()} ${BLN[d.getMonth()]}`;
  }
  return data.day_labels[i] || "";
}

/**
 * Aggregate single project stats from TimesheetData (Langkah 2)
 */
export function hitungRekapProject(data: TimesheetData): RekapProjectData {
  const [kode, nama] = pisahProyek(data.proyek);
  const tot = {
    H: 0,
    OFF: 0,
    G: 0,
    A: 0,
    IZIN: 0,
    SAKIT: 0,
    BA: 0,
    BAT: 0,
  };
  const asing: Record<string, number> = {};
  let kosong_n = 0;

  for (const e of data.emps) {
    tot.G += e.g;
    for (let i = 0; i < data.day_labels.length; i++) {
      const raw = e.codes[i];
      const kd = raw === null || raw === undefined ? "" : raw.trim();
      if (KODE_KOSONG.has(kd)) {
        if (kd) kosong_n++;
        continue;
      }
      const up = kd.toUpperCase();
      if (kd === "H") {
        tot.H += 1;
      } else if (kd === "h") {
        tot.BA += 1;
        tot.H += 1; // 'h' (BA diterima) is also counted in Hadir!
      } else if (up === "I" || up === "IR") {
        tot.IZIN += 1;
      } else if (up === "S" || up === "SR") {
        tot.SAKIT += 1;
      } else if (up === "A") {
        tot.A += 1;
        if (kd === "a") {
          tot.BAT += 1; // 'a' kecil = BA ditolak (also counted in Alfa)
        }
      } else if (up === "O") {
        tot.OFF += 1;
      } else {
        const key = `${kd} (${e.nik} ${e.nama})`;
        asing[key] = (asing[key] || 0) + 1;
      }
    }
  }

  let periode_txt = "-";
  if (data.periode) {
    periode_txt = `${tglId(data.periode[0])} s/d ${tglId(data.periode[1])}`;
  }

  return {
    fileName: data.fileName,
    kode,
    nama,
    periode: data.periode,
    periode_txt,
    mp: data.emps.length,
    H: tot.H,
    OFF: tot.OFF,
    G: tot.G,
    A: tot.A,
    IZIN: tot.IZIN,
    SAKIT: tot.SAKIT,
    BA: tot.BA,
    BAT: tot.BAT,
    asing,
    kosong_n,
    warn: data.warnings || [],
  };
}

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

  // 1. Alias manual
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

  // 2. Exact match
  projects.forEach((p, i) => {
    if (i in hasil) return;
    const n = norm(p.nama);
    const j = tn.indexOf(n);
    if (j !== -1 && !pakai.has(j)) {
      hasil[i] = [j, "sama"];
      pakai.add(j);
    }
  });

  // 3. Fuzzy match (>= 85%)
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

/**
 * Extract attendance anomalies and events for Step 3 (Cek Absensi)
 */
export function ekstraksiCekAbsensi(
  timesheets: TimesheetData[],
  gPeta: Record<string, Record<string, string[]>> = {}
): KaryawanCek[] {
  const semuaKaryawan: KaryawanCek[] = [];

  for (const data of timesheets) {
    const [, projectName] = pisahProyek(data.proyek);
    const project = projectName || data.proyek || data.fileName;
    const projectGPeta = gPeta[data.fileName] || {};

    for (const e of data.emps) {
      const kejadian: [string, string, "ALFA" | "LEMBUR" | "SAKIT" | "IZIN" | "BA"][] = [];
      const harian: [string, string, Date | null][] = [];

      for (let i = 0; i < data.day_labels.length; i++) {
        const kodeAsli = e.codes[i] || "";
        const label = labelHari(data, i);
        const tgl = data.dates[i];
        harian.push([label, kodeAsli, tgl]);

        const up = kodeAsli.toUpperCase();
        let kategori: "ALFA" | "LEMBUR" | "SAKIT" | "IZIN" | "BA" | null = null;

        if (kodeAsli === "h") {
          kategori = "BA";
        } else if (kodeAsli === "a") {
          // 'a' kecil = remains Alfa AND also recorded as BA rejected
          kejadian.push([label, kodeAsli, "BA"]);
          kategori = "ALFA";
        } else if (up in KODE_MAP) {
          kategori = KODE_MAP[up];
        }

        // Avoid double counting lembur from codes when G is tracked via bottom row
        if (kategori === "LEMBUR") {
          continue;
        }

        if (kategori) {
          kejadian.push([label, kodeAsli, kategori]);
        }
      }

      // Add Overtime (G) from bottom row
      if (e.g > 0) {
        const datesG = projectGPeta[e.nik] || e.g_hari.map(idx => labelHari(data, idx));
        if (datesG.length === e.g) {
          datesG.forEach(t => {
            kejadian.push([t, "G", "LEMBUR"]);
          });
        } else {
          for (let k = 0; k < e.g; k++) {
            kejadian.push(["-", "G", "LEMBUR"]);
          }
        }
      }

      semuaKaryawan.push({
        nuc: e.nik,
        nama: e.nama,
        jabatan: e.jab,
        project,
        kejadian,
        harian,
      });
    }
  }

  return semuaKaryawan;
}

const POLA_KATEGORI: Record<string, "ALFA" | "SAKIT" | "IZIN"> = {
  A: "ALFA",
  S: "SAKIT",
  SR: "SAKIT",
  I: "IZIN",
  IR: "IZIN",
};

/**
 * Detect patterns needing follow-up:
 * - Beruntun: >= POLA_MIN_BERUNTUN (3) consecutive days
 * - Mengapit Off: same category immediately before and after Off days (e.g. A, O, A)
 * - Sering: >= POLA_MIN_FREKUENSI (3) occurrences in period
 */
export function hitungPola(
  karyawan: KaryawanCek[],
  kat: "ALFA" | "SAKIT" | "IZIN",
  hariBelumFinal: Set<string> = new Set()
): PolaDetail[] {
  const hasil: {
    polaCount: number;
    jumlah: number;
    k: KaryawanCek;
    polaStr: string;
    detailStr: string;
  }[] = [];

  for (const k of karyawan) {
    const harian = k.harian || [];
    const seq: [string, "ALFA" | "SAKIT" | "IZIN" | null, string | null][] = [];

    for (const [label, kode, tgl] of harian) {
      const iso = tgl ? toISODate(tgl) : "";
      if (iso && hariBelumFinal.has(iso)) {
        seq.push([label, null, null]);
      } else {
        const up = (kode || "").toUpperCase();
        seq.push([label, POLA_KATEGORI[up] || null, up]);
      }
    }

    const jumlah = seq.filter(([, kt]) => kt === kat).length;
    if (jumlah === 0) continue;

    const pola: string[] = [];
    const detail: string[] = [];

    // 1. Beruntun
    let i = 0;
    while (i < seq.length) {
      if (seq[i][1] === kat) {
        let j = i;
        while (j + 1 < seq.length && seq[j + 1][1] === kat) {
          j++;
        }
        const n = j - i + 1;
        if (n >= POLA_MIN_BERUNTUN) {
          if (!pola.includes("Beruntun")) {
            pola.push("Beruntun");
          }
          detail.push(`Beruntun ${n} hari: ${seq[i][0]} s/d ${seq[j][0]}`);
        }
        i = j + 1;
      } else {
        i++;
      }
    }

    // 2. Mengapit Off
    const idx = seq.map((item, index) => (item[1] === kat ? index : -1)).filter(x => x !== -1);
    for (let m = 0; m < idx.length - 1; m++) {
      const a = idx[m];
      const b = idx[m + 1];
      const tengah = seq.slice(a + 1, b);
      if (tengah.length > 0 && tengah.every(([, , kd]) => kd === "O")) {
        if (!pola.includes("Mengapit Off")) {
          pola.push("Mengapit Off");
        }
        detail.push(
          `Mengapit Off: ${seq[a][0]} (${seq[a][2]}), Off ${tengah.length} hari, ${seq[b][0]} (${seq[b][2]})`
        );
      }
    }

    // 3. Sering
    if (jumlah >= POLA_MIN_FREKUENSI) {
      pola.push("Sering");
      detail.push(`${jumlah} kali dalam periode`);
    }

    if (pola.length > 0) {
      hasil.push({
        polaCount: pola.length,
        jumlah,
        k,
        polaStr: pola.join("; "),
        detailStr: detail.join(" | "),
      });
    }
  }

  // Sort: -polaCount, -jumlah, project, nama
  hasil.sort((a, b) => {
    if (b.polaCount !== a.polaCount) return b.polaCount - a.polaCount;
    if (b.jumlah !== a.jumlah) return b.jumlah - a.jumlah;
    if (a.k.project !== b.k.project) return a.k.project.localeCompare(b.k.project);
    return a.k.nama.localeCompare(b.k.nama);
  });

  return hasil.map((item, index) => ({
    no: index + 1,
    nuc: item.k.nuc,
    nama: item.k.nama,
    jabatan: item.k.jabatan,
    project: item.k.project,
    jumlah: item.jumlah,
    pola: item.polaStr,
    detail: item.detailStr,
  }));
}

/**
 * Format title for period
 */
export function periodeJudul(d0: Date, d1: Date): string {
  if (d0.getFullYear() === d1.getFullYear()) {
    return `${d0.getDate()} ${BULAN[d0.getMonth()]} - ${d1.getDate()} ${BULAN[d1.getMonth()]} ${d1.getFullYear()}`;
  }
  return `${d0.getDate()} ${BULAN[d0.getMonth()]} ${d0.getFullYear()} - ${d1.getDate()} ${BULAN[d1.getMonth()]} ${d1.getFullYear()}`;
}

/**
 * Draft PIC Message for WhatsApp / Email
 */
export function susunPesan(
  proyek: string,
  periodeTxt: string,
  jmlKaryawan: number,
  tot: { ALFA: number; SAKIT: number; IZIN: number; LEMBUR: number; BA_h: number; BA_a: number },
  tlBaris: [number, string, string, string, string, number, string, string][],
  hariBelumFinal: Set<string> = new Set()
): string {
  const baris: string[] = [];
  baris.push(`Selamat siang Bapak/Ibu PIC ${proyek},`);
  baris.push("");
  baris.push(`Berikut kami kirimkan rekap absensi${periodeTxt ? " periode " + periodeTxt : ""}.`);
  baris.push("");
  baris.push(`RINGKASAN (total karyawan terdata: ${jmlKaryawan})`);
  baris.push(`- Alfa   : ${tot.ALFA} hari`);
  baris.push(`- Sakit  : ${tot.SAKIT} hari`);
  baris.push(`- Izin   : ${tot.IZIN} hari`);
  baris.push(`- Lembur : ${tot.LEMBUR} hari`);
  baris.push(`- BA     : ${tot.BA_h} diterima, ${tot.BA_a} ditolak`);
  baris.push("");

  if (tlBaris.length > 0) {
    const per: Record<string, string[]> = {};
    for (const [, nuc, nama, , kat, jml, pola] of tlBaris) {
      const key = `${nama} (${nuc})`;
      if (!per[key]) per[key] = [];
      const katCapital = kat.charAt(0).toUpperCase() + kat.slice(1).toLowerCase();
      per[key].push(`${katCapital} ${jml}x (${pola})`);
    }

    const perKeys = Object.keys(per);
    baris.push(`PERLU KLARIFIKASI (${perKeys.length} karyawan):`);
    perKeys.forEach((key, idx) => {
      if (idx >= 15) {
        if (idx === 15) {
          baris.push(`- dan ${perKeys.length - 15} karyawan lainnya (lihat file Excel, sheet Perlu Tindak Lanjut)`);
        }
        return;
      }
      baris.push(`${idx + 1}. ${key}: ${per[key].join("; ")}`);
    });
    baris.push("");
    baris.push(
      "Mohon dikonfirmasi alasan ketidakhadiran karyawan di atas beserta bukti pendukungnya " +
      "(surat dokter, surat izin, atau BA) paling lambat 2 hari kerja setelah pesan ini diterima."
    );
  } else {
    baris.push("Tidak ada pola absensi yang perlu ditindaklanjuti pada periode ini.");
  }

  if (hariBelumFinal.size > 0) {
    const listTgl = Array.from(hariBelumFinal)
      .sort()
      .map(iso => tglId(parseISODate(iso)));
    baris.push("");
    baris.push(
      `Catatan: data tanggal ${listTgl.join(", ")} tampaknya belum final di sistem, sehingga Alfa pada tanggal tersebut bisa berubah.`
    );
  }

  baris.push("");
  baris.push("Detail lengkap ada pada file Excel terlampir. Terima kasih.");
  baris.push("");
  baris.push("Salam,");
  baris.push("HRD & Personalia PT Peduli Cepat Internasional");

  return baris.join("\n") + "\n";
}

/**
 * Generate PIC Packages (Langkah 4)
 */
export function bangunPaketPic(
  karyawan: KaryawanCek[],
  periodeTxt: string,
  hariBelumFinal: Set<string> = new Set()
): PicPackage[] {
  const perProyek: Record<string, KaryawanCek[]> = {};
  for (const k of karyawan) {
    if (!perProyek[k.project]) perProyek[k.project] = [];
    perProyek[k.project].push(k);
  }

  const hasil: PicPackage[] = [];

  for (const [proyek, daftar] of Object.entries(perProyek)) {
    const aman = namaAman(proyek);

    // Calculate totals & incidents per employee
    const tot = {
      ALFA: 0,
      SAKIT: 0,
      IZIN: 0,
      LEMBUR: 0,
      BA_h: 0,
      BA_a: 0,
    };
    let nKejadian = 0;

    for (const k of daftar) {
      let hasEvent = false;
      for (const [, kode, kat] of k.kejadian) {
        hasEvent = true;
        if (kat === "BA") {
          if (kode === "h") tot.BA_h++;
          else tot.BA_a++;
        } else if (kat in tot) {
          tot[kat as keyof typeof tot]++;
        }
      }
      if (hasEvent) nKejadian++;
    }

    // Build Pola Tindak Lanjut for ALFA, SAKIT, IZIN
    const tlBaris: [number, string, string, string, string, number, string, string][] = [];
    const tlNuc = new Set<string>();

    (["ALFA", "SAKIT", "IZIN"] as const).forEach(kat => {
      const polas = hitungPola(daftar, kat, hariBelumFinal);
      for (const p of polas) {
        tlNuc.add(`${p.nuc}___${p.nama}`);
        tlBaris.push([0, p.nuc, p.nama, p.jabatan, kat, p.jumlah, p.pola, p.detail]);
      }
    });

    const urut: Record<string, number> = { ALFA: 0, SAKIT: 1, IZIN: 2 };
    tlBaris.sort((a, b) => {
      if (urut[a[4]] !== urut[b[4]]) return urut[a[4]] - urut[b[4]];
      if (b[5] !== a[5]) return b[5] - a[5];
      return a[2].localeCompare(b[2]);
    });

    tlBaris.forEach((r, idx) => {
      r[0] = idx + 1;
    });

    const pesan = susunPesan(proyek, periodeTxt, daftar.length, tot, tlBaris, hariBelumFinal);

    hasil.push({
      proyek,
      aman,
      daftar,
      tl_baris: tlBaris,
      tot,
      n_tl: tlNuc.size,
      n_kejadian: nKejadian,
      pesan,
    });
  }

  return hasil;
}
