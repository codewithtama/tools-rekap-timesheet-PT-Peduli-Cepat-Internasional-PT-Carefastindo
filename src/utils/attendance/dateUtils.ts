import { BLN, BULAN, HARI } from "../../types/attendance";
import type { TimesheetData } from "../../types/attendance";

/**
 * Format Date into Indonesian display: e.g. "15 Okt 2026"
 */
export function tglId(d: Date | null | undefined): string {
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return "-";
  return `${d.getDate()} ${BLN[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Format Date to ISO YYYY-MM-DD safely
 */
export function toISODate(d: Date | null | undefined): string {
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Parse YYYY-MM-DD safely in local time without timezone drift
 */
export function parseISODate(str: string | null | undefined): Date {
  if (!str) return new Date();
  const parts = str.split("-").map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return new Date();
  }
  return new Date(parts[0], parts[1] - 1, parts[2]);
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
 * Format label for a date column: e.g. "Kamis 15 Okt"
 */
export function labelHari(data: TimesheetData, i: number): string {
  const d = data.dates[i];
  if (d) {
    const dayName = HARI[(d.getDay() + 6) % 7];
    return `${dayName} ${d.getDate()} ${BLN[d.getMonth()]}`;
  }
  return data.day_labels[i] || "";
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

