import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export const FONT_NAME = "Arial";

export const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1F3864" },
};

export const TOTAL_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFEDEDED" },
};

export const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FF999999" } },
  left: { style: "thin", color: { argb: "FF999999" } },
  bottom: { style: "thin", color: { argb: "FF999999" } },
  right: { style: "thin", color: { argb: "FF999999" } },
};

export function getColLetter(colIndex: number): string {
  let temp = "";
  let letter = "";
  while (colIndex > 0) {
    temp = String.fromCharCode(((colIndex - 1) % 26) + 65);
    letter = temp + letter;
    colIndex = Math.floor((colIndex - temp.charCodeAt(0) + 64) / 26);
  }
  return letter;
}

export function styleCell(
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

export function populateSheetTable(
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

export function downloadBlob(blob: Blob, fileName: string) {
  saveAs(blob, fileName);
}

