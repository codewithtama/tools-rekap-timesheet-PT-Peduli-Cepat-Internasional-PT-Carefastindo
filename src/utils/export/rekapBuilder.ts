import ExcelJS from "exceljs";
import { TimesheetData, HARI, BLN, SUM_HEAD } from "../../types/attendance";
import { tglId } from "../attendance/dateUtils";
import {
  FONT_NAME,
  HEADER_FILL,
  TOTAL_FILL,
  THIN_BORDER,
  getColLetter,
  styleCell,
} from "./excelStyles";

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

