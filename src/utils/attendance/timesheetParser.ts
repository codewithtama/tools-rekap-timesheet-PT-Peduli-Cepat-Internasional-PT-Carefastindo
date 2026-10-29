import { Employee, TimesheetData } from "../../types/attendance";
import { cleanText } from "./stringUtils";
import { parseISODate, daftarTanggal } from "./dateUtils";

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
      H: c.filter(x => x.toUpperCase() === "H").length,
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
      sys: [],
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

