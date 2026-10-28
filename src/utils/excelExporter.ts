/**
 * Excel and ZIP Generation Engine
 * Uses ExcelJS and JSZip in the browser to produce 100% compliant .xlsx and .zip files
 * matching Python openpyxl styles, borders, fills, formulas, and layouts.
 */

import ExcelJS from "exceljs";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import {
  TimesheetData,
  RekapProjectData,
  KaryawanCek,
  PicPackage,
  HARI,
  BLN,
  PROYEK_TEMPLATE,
  SUM_HEAD,
} from "../types/attendance";
import {
  tglId,
  periodeJudul,
  hitungPola,
  cocokkan,
} from "./attendanceEngine";

const FONT_NAME = "Arial";
const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1F3864" },
};
const TOTAL_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFEDEDED" },
};
const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FF999999" } },
  left: { style: "thin", color: { argb: "FF999999" } },
  bottom: { style: "thin", color: { argb: "FF999999" } },
  right: { style: "thin", color: { argb: "FF999999" } },
};

function getColLetter(colIndex: number): string {
  let temp = "";
  let letter = "";
  while (colIndex > 0) {
    temp = String.fromCharCode(((colIndex - 1) % 26) + 65);
    letter = temp + letter;
    colIndex = Math.floor((colIndex - temp.charCodeAt(0) + 64) / 26);
  }
  return letter;
}

function styleCell(
  cell: ExcelJS.Cell,
  options: {
    font?: Partial<ExcelJS.Font>;
    fill?: ExcelJS.Fill;
    alignment?: Partial<ExcelJS.Alignment>;
    border?: Partial<ExcelJS.Borders>;
  }
) {
  if (options.font) cell.font = { name: FONT_NAME, size: 10, ...options.font };
  if (options.fill) cell.fill = options.fill;
  if (options.alignment) cell.alignment = options.alignment;
  if (options.border) cell.border = options.border;
}

/**
 * LANGKAH 1: Build Rekap-Absensi-<nama>.xlsx
 */
export async function buildRekapXlsx(data: TimesheetData): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Rekap Absensi", {
    views: [{ showGridLines: true }],
  });

  const nd = data.day_labels.length;
  const cDay0 = 5;
  const cDay1 = cDay0 + nd - 1;
  const cSum = cDay1 + 1;
  const cKet = cSum + SUM_HEAD.length;
  const lastCol = cKet;
  const cG = cSum + SUM_HEAD.indexOf("Lembur Ganti");

  ws.getCell("A1").value = "REKAPITULASI ABSENSI";
  ws.getCell("A1").font = { name: FONT_NAME, size: 16, bold: true };

  const perTxt = data.periode
    ? `${tglId(data.periode[0])} s/d ${tglId(data.periode[1])}`
    : "-";

  const metaRows = [
    ["Proyek", data.proyek],
    ["Kode Payroll", data.kode],
    ["Periode", perTxt],
  ];

  metaRows.forEach(([k, v], idx) => {
    const r = idx + 2;
    ws.getCell(`A${r}`).value = k;
    ws.getCell(`A${r}`).font = { name: FONT_NAME, size: 10, bold: true };
    ws.getCell(`C${r}`).value = ":";
    ws.getCell(`C${r}`).font = { name: FONT_NAME, size: 10 };
    ws.getCell(`D${r}`).value = v;
    ws.getCell(`D${r}`).font = { name: FONT_NAME, size: 10 };
  });

  const R1 = 6;
  const R2 = 7;

  ["No", "NIK", "Nama", "Jabatan"].forEach((h, i) => {
    const col = i + 1;
    ws.mergeCells(R1, col, R2, col);
    ws.getCell(R1, col).value = h;
  });

  ws.mergeCells(R1, cDay0, R1, cDay1);
  ws.getCell(R1, cDay0).value = "Kehadiran Harian";

  ws.mergeCells(R1, cSum, R1, cKet - 1);
  ws.getCell(R1, cSum).value = "Rekap Total";

  ws.mergeCells(R1, cKet, R2, cKet);
  ws.getCell(R1, cKet).value = "Keterangan";

  for (let i = 0; i < nd; i++) {
    const d = data.dates[i];
    const col = cDay0 + i;
    if (d) {
      const dayName = HARI[(d.getDay() + 6) % 7];
      ws.getCell(R2, col).value = `${dayName}\n${d.getDate()} ${BLN[d.getMonth()]}`;
    } else {
      ws.getCell(R2, col).value = data.day_labels[i];
    }
  }

  SUM_HEAD.forEach((h, i) => {
    ws.getCell(R2, cSum + i).value = h;
  });

  for (const r of [R1, R2]) {
    for (let c = 1; c <= lastCol; c++) {
      const cell = ws.getCell(r, c);
      styleCell(cell, {
        font: { bold: true, color: { argb: "FFFFFFFF" } },
        fill: HEADER_FILL,
        alignment: { horizontal: "center", vertical: "middle", wrapText: true },
        border: THIN_BORDER,
      });
    }
  }
  ws.getRow(R2).height = 32;

  const firstRow = R2 + 1;
  data.emps.forEach((e, idx) => {
    const r = firstRow + idx;
    ws.getCell(r, 1).value = idx + 1;
    ws.getCell(r, 2).value = e.nik;
    ws.getCell(r, 3).value = e.nama;
    ws.getCell(r, 4).value = e.jab;

    e.codes.forEach((code, cIdx) => {
      const col = cDay0 + cIdx;
      const cell = ws.getCell(r, col);
      cell.value = code;

      const up = (code || "").toUpperCase();
      let fillColor: string | null = null;
      let fontColor = "FF000000";

      if (code === "H") {
        fillColor = "FFC6EFCE";
        fontColor = "FF006100";
      } else if (code === "h") {
        fillColor = "FFDDEBF7";
        fontColor = "FF1F4E78";
      } else if (up === "A") {
        fillColor = "FFFFC7CE";
        fontColor = "FF9C0006";
      } else if (up === "O") {
        fillColor = "FFD9D9D9";
        fontColor = "FF404040";
      } else if (up === "I" || up === "IR" || up === "S" || up === "SR") {
        fillColor = "FFFFEB9C";
        fontColor = "FF7F6000";
      } else if (up === "G") {
        fillColor = "FFE4DFEC";
        fontColor = "FF403151";
      }

      if (fillColor) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: fillColor },
        };
        cell.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: fontColor } };
      }
    });

    const rng = `${getColLetter(cDay0)}${r}:${getColLetter(cDay1)}${r}`;
    ws.getCell(r, cSum).value = { formula: `COUNTIF(${rng},"H")` };
    ws.getCell(r, cSum + 1).value = { formula: `SUMPRODUCT(--EXACT(${rng},"h"))` };
    ws.getCell(r, cSum + 2).value = { formula: `COUNTIF(${rng},"I")+COUNTIF(${rng},"IR")` };
    ws.getCell(r, cSum + 3).value = { formula: `COUNTIF(${rng},"S")+COUNTIF(${rng},"SR")` };
    ws.getCell(r, cSum + 4).value = { formula: `COUNTIF(${rng},"A")` };
    ws.getCell(r, cSum + 5).value = { formula: `COUNTIF(${rng},"O")` };
    ws.getCell(r, cG).value = e.g;

    ws.getCell(r, cKet).value = e.ket === "-" ? "" : e.ket;

    for (let c = 1; c <= lastCol; c++) {
      const cell = ws.getCell(r, c);
      cell.border = THIN_BORDER;
      if (!cell.font) {
        cell.font = {
          name: FONT_NAME,
          size: 10,
          color: c === cG ? { argb: "FF0000FF" } : { argb: "FF000000" },
        };
      }
      cell.alignment = {
        vertical: "middle",
        horizontal: c === 3 || c === 4 || c === cKet ? "left" : "center",
      };
      if (idx % 2 === 1 && c <= 4) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF7F9FC" },
        };
      }
    }
    ws.getRow(r).height = 20;
  });

  const lastRow = firstRow + data.emps.length - 1;
  const tr = lastRow + 1;

  ws.mergeCells(tr, 1, tr, cDay1);
  ws.getCell(tr, 1).value = "TOTAL";
  for (let i = 0; i < SUM_HEAD.length; i++) {
    const col = cSum + i;
    const colLet = getColLetter(col);
    ws.getCell(tr, col).value = { formula: `SUM(${colLet}${firstRow}:${colLet}${lastRow})` };
  }

  for (let c = 1; c <= lastCol; c++) {
    const cell = ws.getCell(tr, c);
    styleCell(cell, {
      font: { bold: true },
      fill: TOTAL_FILL,
      border: THIN_BORDER,
      alignment: { horizontal: "center", vertical: "middle" },
    });
  }
  ws.getRow(tr).height = 22;

  const legR = tr + 2;
  ws.getCell(legR, 1).value = "Keterangan Kode";
  ws.getCell(legR, 1).font = { name: FONT_NAME, size: 10, bold: true };
  const legends = [
    "H = Hadir",
    "h = BA (dihitung Hadir dan BA Diterima)",
    "I / IR = Izin",
    "S / SR = Sakit",
    "A / a = Alpa",
    "O = Off",
    "Lembur Ganti = hari Off yang diminta masuk menggantikan (tulisan biru, bisa diubah manual)",
  ];
  legends.forEach((tx, k) => {
    ws.getCell(legR + k + 1, 1).value = tx;
    ws.getCell(legR + k + 1, 1).font = { name: FONT_NAME, size: 9 };
  });

  ws.getColumn(1).width = 6;
  ws.getColumn(2).width = 14;
  ws.getColumn(3).width = 28;
  ws.getColumn(4).width = 18;
  for (let c = cDay0; c <= cDay1; c++) {
    ws.getColumn(c).width = 10;
  }
  for (let c = cSum; c < cKet; c++) {
    ws.getColumn(c).width = 10;
  }
  ws.getColumn(cKet).width = 24;

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/**
 * LANGKAH 2: Build SUMMARY_ABSENSI_<periode>.xlsx
 */
export async function buildSummaryXlsx(
  projects: RekapProjectData[],
  d0: Date,
  d1: Date
): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Ringkasan Absensi", {
    views: [{ showGridLines: true }],
  });

  ws.mergeCells("A1:M1");
  ws.getCell("A1").value = `RINGKASAN ABSENSI APLIKASI PERIODE ${periodeJudul(d0, d1)}`;
  ws.getCell("A1").font = { name: FONT_NAME, size: 14, bold: true, color: { argb: "FF1F3864" } };
  ws.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 28;

  const headers = [
    "NO",
    "PROJECT / LOKASI KERJA",
    "MP",
    "H",
    "OFF",
    "G",
    "A",
    "IZIN",
    "SAKIT",
    "h (BA DITERIMA)",
    "a (BA DITOLAK)",
    "TOTAL HK\n(H + G)",
    "KETERANGAN",
  ];

  const colWidths = [6, 38, 8, 8, 8, 8, 8, 8, 8, 14, 14, 14, 20];

  headers.forEach((h, idx) => {
    const col = idx + 1;
    const cell = ws.getCell(3, col);
    cell.value = h;
    styleCell(cell, {
      font: { bold: true, color: { argb: "FFFFFFFF" } },
      fill: HEADER_FILL,
      alignment: { horizontal: "center", vertical: "middle", wrapText: true },
      border: THIN_BORDER,
    });
    ws.getColumn(col).width = colWidths[idx];
  });
  ws.getRow(3).height = 30;

  const cocok = cocokkan(projects, PROYEK_TEMPLATE);
  const rowsData: { nama_tampil: string; data: RekapProjectData | null }[] = [];

  PROYEK_TEMPLATE.forEach((nama, j) => {
    let dp: RekapProjectData | null = null;
    Object.keys(cocok).forEach(iStr => {
      const i = parseInt(iStr, 10);
      if (cocok[i][0] === j) {
        dp = projects[i];
      }
    });
    rowsData.push({ nama_tampil: nama, data: dp });
  });

  projects.forEach((p, i) => {
    if (!(i in cocok)) {
      rowsData.push({ nama_tampil: p.nama, data: p });
    }
  });

  const FIRST = 4;
  rowsData.forEach((b, idx) => {
    const r = FIRST + idx;
    ws.getCell(r, 1).value = idx + 1;
    ws.getCell(r, 2).value = b.nama_tampil;

    const p = b.data;
    if (p) {
      ws.getCell(r, 3).value = p.mp;
      ws.getCell(r, 4).value = p.H;
      ws.getCell(r, 5).value = p.OFF;
      ws.getCell(r, 6).value = p.G;
      ws.getCell(r, 7).value = p.A;
      ws.getCell(r, 8).value = p.IZIN;
      ws.getCell(r, 9).value = p.SAKIT;
      ws.getCell(r, 10).value = p.BA;
      ws.getCell(r, 11).value = p.BAT;
    }

    ws.getCell(r, 12).value = {
      formula: `IF(COUNT(D${r},F${r})=0,"",D${r}+F${r})`,
    };
    ws.getCell(r, 13).value = "";

    for (let c = 1; c <= 13; c++) {
      const cell = ws.getCell(r, c);
      cell.border = THIN_BORDER;
      cell.font = { name: FONT_NAME, size: 10 };
      cell.alignment = {
        vertical: "middle",
        horizontal: c === 2 ? "left" : "center",
      };
      if (idx % 2 === 1 && c <= 2) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF7F9FC" },
        };
      }
    }
    ws.getRow(r).height = 20;
  });

  const lastRow = FIRST + rowsData.length - 1;
  const rt = lastRow + 1;

  ws.getCell(rt, 2).value = "GRAND TOTAL";
  for (let c = 3; c <= 12; c++) {
    const colLet = getColLetter(c);
    ws.getCell(rt, c).value = { formula: `SUM(${colLet}${FIRST}:${colLet}${lastRow})` };
  }

  for (let c = 1; c <= 13; c++) {
    const cell = ws.getCell(rt, c);
    styleCell(cell, {
      font: { bold: true },
      fill: TOTAL_FILL,
      border: THIN_BORDER,
      alignment: { horizontal: "center", vertical: "middle" },
    });
  }
  ws.getRow(rt).height = 22;

  const rn = rt + 2;
  ws.mergeCells(`A${rn}:M${rn}`);
  const belumAda = rowsData.filter(b => b.data === null).map(b => b.nama_tampil);
  let noteText = `Catatan: H sudah termasuk h (BA diterima), TOTAL HK = H + G, BA ditolak (a) tetap dihitung di Alfa. Angka dihitung dari file Rekap-Absensi masing-masing proyek (periode ${periodeJudul(d0, d1)}).`;
  if (belumAda.length > 0) {
    const sebut = belumAda.slice(0, 3).join(", ");
    const sisa = belumAda.length > 3 ? ` dan ${belumAda.length - 3} proyek lain` : "";
    noteText += ` Belum ada file untuk: ${sebut}${sisa}.`;
  }
  ws.getCell(`A${rn}`).value = noteText;
  ws.getCell(`A${rn}`).font = { name: FONT_NAME, size: 9, italic: true, color: { argb: "FF666666" } };
  ws.getCell(`A${rn}`).alignment = { vertical: "top", wrapText: true };
  ws.getRow(rn).height = 36;

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/**
 * LANGKAH 3: Build individual Category Workbook
 */
export async function buildCekKategoriXlsx(
  karyawan: KaryawanCek[],
  kat: "ALFA" | "SAKIT" | "IZIN" | "LEMBUR" | "BA",
  kodeTxt: string,
  periodeTxt: string,
  hariBelumFinal: Set<string> = new Set()
): Promise<Blob> {
  const wb = new ExcelJS.Workbook();

  if (kat === "BA") {
    const ws1 = wb.addWorksheet("Summary Karyawan");
    let no1 = 0;
    let totH = 0;
    let totA = 0;
    const perProject: Record<string, [number, number, number]> = {};

    const baris1: any[] = [];
    karyawan.forEach(k => {
      const ev = k.kejadian.filter(e => e[2] === "BA");
      if (ev.length === 0) return;
      const nh = ev.filter(e => e[1] === "h").length;
      const na = ev.length - nh;
      no1++;
      const tgl = ev.map(e => `${e[0]} (${e[1]})`).join(", ");
      baris1.push([no1, k.nuc, k.nama, k.jabatan, k.project, nh, na, ev.length, tgl]);

      if (!perProject[k.project]) perProject[k.project] = [0, 0, 0];
      perProject[k.project][0]++;
      perProject[k.project][1] += nh;
      perProject[k.project][2] += na;
      totH += nh;
      totA += na;
    });

    populateSheetTable(
      ws1,
      `DAFTAR BA (h = DITERIMA/HADIR, a = DITOLAK/ALFA)${periodeTxt ? " PERIODE " + periodeTxt : ""}`,
      ["No", "NUC", "Nama", "Jabatan", "Project", "BA Diterima (h)", "BA Ditolak (a)", "Total BA", "Tanggal"],
      baris1,
      [6, 14, 30, 18, 28, 16, 16, 10, 60],
      [1, 2, 6, 7, 8],
      ["TOTAL", "", "", "", "", totH, totA, totH + totA, ""]
    );

    const ws2 = wb.addWorksheet("Detail Kejadian");
    let no2 = 0;
    const baris2: any[] = [];
    karyawan.forEach(k => {
      k.kejadian.filter(e => e[2] === "BA").forEach(([t, kode]) => {
        no2++;
        const status = kode === "h" ? "BA DITERIMA (HADIR)" : "BA DITOLAK (ALFA)";
        baris2.push([no2, k.nuc, k.nama, k.jabatan, k.project, t, kode, status]);
      });
    });
    populateSheetTable(
      ws2,
      "DETAIL BA",
      ["No", "NUC", "Nama", "Jabatan", "Project", "Tanggal", "Kode", "Status"],
      baris2,
      [6, 14, 30, 18, 28, 16, 8, 24],
      [1, 2, 6, 7]
    );

    const ws3 = wb.addWorksheet("Summary Project");
    const baris3 = Object.entries(perProject).map(([namaP, v], idx) => [
      idx + 1,
      namaP,
      v[0],
      v[1],
      v[2],
      v[1] + v[2],
    ]);
    populateSheetTable(
      ws3,
      "SUMMARY BA PER PROJECT",
      ["No", "Project", "Jumlah Karyawan", "BA Diterima (h)", "BA Ditolak (a)", "Total BA"],
      baris3,
      [6, 34, 16, 16, 16, 12],
      [1, 3, 4, 5, 6],
      ["TOTAL", "", Object.values(perProject).reduce((acc, v) => acc + v[0], 0), totH, totA, totH + totA]
    );
  } else {
    const ws1 = wb.addWorksheet("Summary Karyawan");
    let no1 = 0;
    let total = 0;
    const perProject: Record<string, [number, number]> = {};
    const baris1: any[] = [];
    const baris2: any[] = [];
    let no2 = 0;

    karyawan.forEach(k => {
      const ev = k.kejadian.filter(e => e[2] === kat);
      if (ev.length === 0) return;
      no1++;
      const tgl = ev.map(e => e[0]).filter(t => t !== "-").join(", ");
      baris1.push([no1, k.nuc, k.nama, k.jabatan, k.project, ev.length, tgl || "-"]);

      ev.forEach(([t, kode]) => {
        no2++;
        baris2.push([no2, k.nuc, k.nama, k.jabatan, k.project, t, kode]);
      });

      if (!perProject[k.project]) perProject[k.project] = [0, 0];
      perProject[k.project][0]++;
      perProject[k.project][1] += ev.length;
      total += ev.length;
    });

    populateSheetTable(
      ws1,
      `DAFTAR ${kat} (${kodeTxt})${periodeTxt ? " PERIODE " + periodeTxt : ""}`,
      ["No", "NUC", "Nama", "Jabatan", "Project", "Jumlah", "Tanggal"],
      baris1,
      [6, 14, 30, 18, 28, 10, 50],
      [1, 2, 6],
      ["TOTAL", "", "", "", "", total, ""]
    );

    const ws2 = wb.addWorksheet("Detail Kejadian");
    populateSheetTable(
      ws2,
      `DETAIL ${kat} (${kodeTxt})`,
      ["No", "NUC", "Nama", "Jabatan", "Project", "Tanggal", "Kode"],
      baris2,
      [6, 14, 30, 18, 28, 16, 8],
      [1, 2, 6, 7]
    );

    const ws3 = wb.addWorksheet("Summary Project");
    const baris3 = Object.entries(perProject).map(([namaP, v], idx) => [
      idx + 1,
      namaP,
      v[0],
      v[1],
    ]);
    populateSheetTable(
      ws3,
      `SUMMARY ${kat} PER PROJECT`,
      ["No", "Project", "Jumlah Karyawan", "Total Kejadian"],
      baris3,
      [6, 34, 16, 16],
      [1, 3, 4],
      ["TOTAL", "", Object.values(perProject).reduce((acc, v) => acc + v[0], 0), total]
    );

    if (kat === "ALFA" || kat === "SAKIT" || kat === "IZIN") {
      const polas = hitungPola(karyawan, kat, hariBelumFinal);
      const ws4 = wb.addWorksheet("Perlu Tindak Lanjut");
      const baris4 = polas.map(p => [
        p.no,
        p.nuc,
        p.nama,
        p.jabatan,
        p.project,
        p.jumlah,
        p.pola,
        p.detail,
      ]);
      populateSheetTable(
        ws4,
        `POLA ${kat} YANG PERLU TINDAK LANJUT${periodeTxt ? " PERIODE " + periodeTxt : ""}`,
        ["No", "NUC", "Nama", "Jabatan", "Project", "Jumlah", "Pola", "Detail"],
        baris4,
        [6, 14, 30, 18, 28, 10, 26, 90],
        [1, 2, 6]
      );

      const noteR = 3;
      ws4.getCell(`A${noteR}`).value =
        polas.length > 0
          ? "Pola: Beruntun (minimal 3 hari berturut-turut), Mengapit Off (sebelum & sesudah hari Off), Sering (minimal 3 kejadian)."
          : "Tidak ada pola yang terdeteksi pada periode ini.";
      ws4.getCell(`A${noteR}`).font = {
        name: FONT_NAME,
        size: 9,
        italic: true,
        color: { argb: polas.length > 0 ? "FF666666" : "FF006100" },
      };
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function populateSheetTable(
  ws: ExcelJS.Worksheet,
  title: string,
  headers: string[],
  rows: any[][],
  colWidths: number[],
  centerCols: number[] = [],
  totalRow: any[] | null = null
) {
  ws.getCell("A1").value = title;
  ws.getCell("A1").font = { name: FONT_NAME, size: 13, bold: true };
  ws.getCell("A2").value = `Dibuat: ${new Date().toLocaleDateString("id-ID")} ${new Date().toLocaleTimeString("id-ID")}`;
  ws.getCell("A2").font = { name: FONT_NAME, size: 9, italic: true, color: { argb: "FF666666" } };

  const r0 = 4;
  headers.forEach((h, idx) => {
    const col = idx + 1;
    const cell = ws.getCell(r0, col);
    cell.value = h;
    styleCell(cell, {
      font: { bold: true, color: { argb: "FFFFFFFF" } },
      fill: HEADER_FILL,
      alignment: { horizontal: "center", vertical: "middle", wrapText: true },
      border: THIN_BORDER,
    });
    ws.getColumn(col).width = colWidths[idx] || 15;
  });
  ws.getRow(r0).height = 28;

  rows.forEach((row, rIdx) => {
    const r = r0 + 1 + rIdx;
    row.forEach((v, cIdx) => {
      const col = cIdx + 1;
      const cell = ws.getCell(r, col);
      cell.value = v;
      styleCell(cell, {
        font: { size: 10 },
        border: THIN_BORDER,
        alignment: {
          vertical: "middle",
          horizontal: centerCols.includes(col) ? "center" : "left",
        },
      });
    });
    ws.getRow(r).height = 20;
  });

  const lastR = r0 + rows.length;
  if (totalRow) {
    const tr = lastR + 1;
    totalRow.forEach((v, cIdx) => {
      const col = cIdx + 1;
      const cell = ws.getCell(tr, col);
      cell.value = v;
      styleCell(cell, {
        font: { size: 10, bold: true },
        fill: TOTAL_FILL,
        border: THIN_BORDER,
        alignment: {
          vertical: "middle",
          horizontal: centerCols.includes(col) ? "center" : "left",
        },
      });
    });
    ws.getRow(tr).height = 22;
  }
}

/**
 * LANGKAH 4: Build PIC Excel (ABSENSI_<proyek>_<periode>.xlsx)
 */
export async function buildPicExcel(
  pkg: PicPackage,
  periodeTxt: string
): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  const suffix = periodeTxt ? ` PERIODE ${periodeTxt}` : "";

  const ws1 = wb.addWorksheet("Ringkasan");
  const r1: any[] = [];
  const tlNuc = new Set(pkg.tl_baris.map(r => `${r[1]}___${r[2]}`));

  pkg.daftar.forEach((k, idx) => {
    const c = { ALFA: 0, SAKIT: 0, IZIN: 0, LEMBUR: 0, BA_h: 0, BA_a: 0 };
    k.kejadian.forEach(([, kode, kat]) => {
      if (kat === "BA") {
        if (kode === "h") c.BA_h++;
        else c.BA_a++;
      } else if (kat in c) {
        c[kat as keyof typeof c]++;
      }
    });

    if (Object.values(c).some(v => v > 0)) {
      const flag = tlNuc.has(`${k.nuc}___${k.nama}`) ? "YA" : "-";
      r1.push([
        idx + 1,
        k.nuc,
        k.nama,
        k.jabatan,
        c.ALFA,
        c.SAKIT,
        c.IZIN,
        c.LEMBUR,
        c.BA_h,
        c.BA_a,
        flag,
      ]);
    }
  });

  populateSheetTable(
    ws1,
    `RINGKASAN ABSENSI - ${pkg.proyek}${suffix}`,
    [
      "No",
      "NUC",
      "Nama",
      "Jabatan",
      "Alfa",
      "Sakit",
      "Izin",
      "Lembur",
      "BA Diterima (h)",
      "BA Ditolak (a)",
      "Perlu Tindak Lanjut",
    ],
    r1,
    [6, 14, 30, 20, 8, 8, 8, 10, 16, 16, 20],
    [1, 2, 5, 6, 7, 8, 9, 10, 11],
    [
      "TOTAL",
      "",
      `${r1.length} karyawan dari ${pkg.daftar.length}`,
      "",
      pkg.tot.ALFA,
      pkg.tot.SAKIT,
      pkg.tot.IZIN,
      pkg.tot.LEMBUR,
      pkg.tot.BA_h,
      pkg.tot.BA_a,
      `${pkg.n_tl} orang`,
    ]
  );

  const ws2 = wb.addWorksheet("Detail Kejadian");
  let no = 0;
  const r2: any[] = [];
  pkg.daftar.forEach(k => {
    k.kejadian.forEach(([t, kode, kat]) => {
      no++;
      const ket =
        kat === "BA"
          ? kode === "h"
            ? "BA diterima (hadir)"
            : "BA ditolak (alfa)"
          : "";
      r2.push([no, k.nuc, k.nama, k.jabatan, kat, t, kode, ket]);
    });
  });

  populateSheetTable(
    ws2,
    `DETAIL KEJADIAN - ${pkg.proyek}${suffix}`,
    ["No", "NUC", "Nama", "Jabatan", "Kategori", "Tanggal", "Kode", "Keterangan"],
    r2,
    [6, 14, 30, 20, 12, 16, 8, 24],
    [1, 2, 5, 6, 7]
  );

  const ws3 = wb.addWorksheet("Perlu Tindak Lanjut");
  populateSheetTable(
    ws3,
    `PERLU TINDAK LANJUT - ${pkg.proyek}${suffix}`,
    ["No", "NUC", "Nama", "Jabatan", "Kategori", "Jumlah", "Pola", "Detail"],
    pkg.tl_baris,
    [6, 14, 30, 20, 12, 10, 26, 90],
    [1, 2, 6]
  );

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/**
 * Generate standard SUMMARY_ABSENSI_TEMPLATE.xlsx
 */
export async function buildDefaultTemplateBlob(): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Template Summary", {
    views: [{ showGridLines: true }],
  });

  ws.mergeCells("A1:M1");
  ws.getCell("A1").value = "RINGKASAN ABSENSI APLIKASI PERIODE [TANGGAL AWAL] - [TANGGAL AKHIR]";
  ws.getCell("A1").font = { name: FONT_NAME, size: 14, bold: true, color: { argb: "FF1F3864" } };
  ws.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };

  const headers = [
    "NO", "PROJECT / LOKASI KERJA", "MP", "H", "OFF", "G", "A", "IZIN", "SAKIT",
    "h (BA DITERIMA)", "a (BA DITOLAK)", "TOTAL HK\n(H + G)", "KETERANGAN",
  ];
  headers.forEach((h, i) => {
    const col = i + 1;
    const cell = ws.getCell(3, col);
    cell.value = h;
    styleCell(cell, {
      font: { bold: true, color: { argb: "FFFFFFFF" } },
      fill: HEADER_FILL,
      alignment: { horizontal: "center", vertical: "middle", wrapText: true },
      border: THIN_BORDER,
    });
  });

  PROYEK_TEMPLATE.forEach((nama, idx) => {
    const r = 4 + idx;
    ws.getCell(r, 1).value = idx + 1;
    ws.getCell(r, 2).value = nama;
    for (let c = 1; c <= 13; c++) {
      const cell = ws.getCell(r, c);
      cell.border = THIN_BORDER;
      cell.alignment = { vertical: "middle", horizontal: c === 2 ? "left" : "center" };
    }
  });

  const rt = 4 + PROYEK_TEMPLATE.length;
  ws.getCell(rt, 2).value = "GRAND TOTAL";
  for (let c = 1; c <= 13; c++) {
    const cell = ws.getCell(rt, c);
    styleCell(cell, { font: { bold: true }, fill: TOTAL_FILL, border: THIN_BORDER, alignment: { horizontal: "center" } });
  }

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/**
 * Build Single Project ZIP
 */
export async function buildProjectZip(
  pkg: PicPackage,
  periodeTxt: string,
  stempel: string,
  rekapBlob?: Blob
): Promise<Blob> {
  const zip = new JSZip();
  const folder = zip.folder(pkg.aman) || zip;

  const absensiBlob = await buildPicExcel(pkg, periodeTxt);
  folder.file(`ABSENSI_${pkg.aman}_${stempel}.xlsx`, absensiBlob);

  if (rekapBlob) {
    folder.file(`Rekap-Absensi-${pkg.aman}.xlsx`, rekapBlob);
  }

  folder.file(`PESAN_${pkg.aman}.txt`, pkg.pesan);

  return zip.generateAsync({ type: "blob" });
}

/**
 * Build Master ZIP Package
 */
export async function buildMasterZip(
  picPackages: PicPackage[],
  periodeTxt: string,
  stempel: string,
  summaryBlob: Blob | null,
  cekBlobs: { name: string; blob: Blob }[],
  rekapBlobs: { safeName: string; blob: Blob }[]
): Promise<Blob> {
  const zip = new JSZip();
  const rootFolder = zip.folder(`PAKET_PIC_${stempel}`) || zip;

  if (summaryBlob) {
    zip.file(`SUMMARY_ABSENSI_${stempel}.xlsx`, summaryBlob);
  }

  const cekFolder = zip.folder("CEK_ABSENSI") || zip;
  cekBlobs.forEach(item => {
    cekFolder.file(item.name, item.blob);
  });

  for (const pkg of picPackages) {
    const pFolder = rootFolder.folder(pkg.aman) || rootFolder;
    const absensiBlob = await buildPicExcel(pkg, periodeTxt);
    pFolder.file(`ABSENSI_${pkg.aman}_${stempel}.xlsx`, absensiBlob);

    const rekapMatch = rekapBlobs.find(r => r.safeName === pkg.aman);
    if (rekapMatch) {
      pFolder.file(`Rekap-Absensi-${pkg.aman}.xlsx`, rekapMatch.blob);
    }

    pFolder.file(`PESAN_${pkg.aman}.txt`, pkg.pesan);

    const singleProjZip = new JSZip();
    const sf = singleProjZip.folder(pkg.aman) || singleProjZip;
    sf.file(`ABSENSI_${pkg.aman}_${stempel}.xlsx`, absensiBlob);
    if (rekapMatch) {
      sf.file(`Rekap-Absensi-${pkg.aman}.xlsx`, rekapMatch.blob);
    }
    sf.file(`PESAN_${pkg.aman}.txt`, pkg.pesan);
    const singleBlob = await singleProjZip.generateAsync({ type: "blob" });
    rootFolder.file(`${pkg.aman}_${stempel}.zip`, singleBlob);
  }

  return zip.generateAsync({ type: "blob" });
}

export function downloadBlob(blob: Blob, fileName: string) {
  saveAs(blob, fileName);
}
