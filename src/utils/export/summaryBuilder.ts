import ExcelJS from "exceljs";
import { RekapProjectData, PROYEK_TEMPLATE } from "../../types/attendance";
import { periodeJudul } from "../attendance/dateUtils";
import { cocokkan } from "../attendance/projectMatcher";
import {
  FONT_NAME,
  HEADER_FILL,
  TOTAL_FILL,
  THIN_BORDER,
  getColLetter,
  styleCell,
} from "./excelStyles";

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

