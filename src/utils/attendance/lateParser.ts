import { LateIncident, LateEmployeeSummary, PolaDetail } from "../../types/attendance";
import { cleanText } from "./stringUtils";

export interface ParsedLateData {
  periodeTxt: string;
  incidents: LateIncident[];
  ignoredZeroCount: number;
}

/**
 * Format durasi keterlambatan (menit) ke dalam jam dan menit jika >= 60 menit.
 * Contoh:
 * - 456 menit -> "7 jam 36 mnt" (atau "7j 36m" jika short)
 * - 60 menit  -> "1 jam"
 * - 45 menit  -> "45 mnt"
 */
export function formatDurasiMenit(menit: number, short = false): string {
  if (menit <= 0) return short ? "0m" : "0 mnt";
  const jam = Math.floor(menit / 60);
  const sisa = menit % 60;

  if (jam > 0) {
    if (short) {
      return sisa > 0 ? `${jam}j ${sisa}m` : `${jam}j`;
    }
    return sisa > 0 ? `${jam} jam ${sisa} mnt` : `${jam} jam`;
  }
  return short ? `${sisa}m` : `${sisa} mnt`;
}

/**
 * Parse Laporan Keterlambatan Karyawan HTML table (.xls / .html download)
 */
export function parseLaporanKeterlambatan(raw: string, fileName: string): ParsedLateData {
  if (!raw.toLowerCase().includes("<table")) {
    throw new Error(
      `File "${fileName}" tidak berisi tabel HTML keterlambatan. Pastikan file adalah unduhan Laporan Keterlambatan.`
    );
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(raw, "text/html");

  // Extract Periode if present
  let periodeTxt = "";
  const periodeMatch = raw.match(/Periode\s*:\s*([^<\r\n]+)/i);
  if (periodeMatch) {
    periodeTxt = cleanText(periodeMatch[1]);
  }

  // Find the table
  const allTables = Array.from(doc.querySelectorAll("table"));
  if (allTables.length === 0) {
    throw new Error("Tabel keterlambatan tidak ditemukan di dalam file " + fileName);
  }

  // Choose the table with most rows or headers containing 'keterlambatan'
  let targetTable = allTables[0];
  for (const tbl of allTables) {
    const text = tbl.textContent || "";
    if (text.toLowerCase().includes("keterlambatan") || text.toLowerCase().includes("nuc")) {
      targetTable = tbl;
      break;
    }
  }

  const trs = Array.from(targetTable.querySelectorAll("tr"));
  let headerIndex = -1;
  let colIndex = {
    no: -1,
    nuc: -1,
    nama: -1,
    jabatan: -1,
    project: -1,
    tanggal: -1,
    jamMasuk: -1,
    jadwalMulai: -1,
    menit: -1,
  };

  // Find header row
  for (let i = 0; i < trs.length; i++) {
    const cells = Array.from(trs[i].querySelectorAll("td, th")).map(c => cleanText(c.textContent).toLowerCase());
    const idxNuc = cells.findIndex(c => c.includes("nuc") || c.includes("nik"));
    const idxMenit = cells.findIndex(c => c.includes("terlambat") || c.includes("menit"));

    if (idxNuc !== -1 && idxMenit !== -1) {
      headerIndex = i;
      colIndex = {
        no: cells.findIndex(c => c === "no" || c === "no."),
        nuc: idxNuc,
        nama: cells.findIndex(c => c.includes("nama")),
        jabatan: cells.findIndex(c => c.includes("jabatan")),
        project: cells.findIndex(c => c.includes("project") || c.includes("proyek")),
        tanggal: cells.findIndex(c => c.includes("tanggal") || c.includes("tgl")),
        jamMasuk: cells.findIndex(c => c.includes("masuk") || c.includes("aktual")),
        jadwalMulai: cells.findIndex(c => c.includes("jadwal") || c.includes("mulai")),
        menit: idxMenit,
      };
      break;
    }
  }

  if (headerIndex === -1 || colIndex.nuc === -1 || colIndex.menit === -1) {
    throw new Error(
      `Kolom header (NUC, Keterlambatan) tidak ditemukan di file "${fileName}". Pastikan file sesuai format laporan keterlambatan.`
    );
  }

  const incidents: LateIncident[] = [];
  let ignoredZeroCount = 0;
  let counter = 0;

  for (let i = headerIndex + 1; i < trs.length; i++) {
    const cells = Array.from(trs[i].querySelectorAll("td, th")).map(c => cleanText(c.textContent));
    if (cells.length <= Math.max(...Object.values(colIndex))) {
      continue;
    }

    const nuc = colIndex.nuc >= 0 ? cells[colIndex.nuc] : "";
    if (!nuc || nuc.toLowerCase().startsWith("total")) {
      continue;
    }

    const rawMenit = colIndex.menit >= 0 ? cells[colIndex.menit] : "0";
    const menitClean = rawMenit.replace(/[^\d]/g, "");
    const menit = parseInt(menitClean, 10) || 0;

    // Filter: Sesuai rekomendasi, hanya hitung keterlambatan > 0 menit
    if (menit <= 0) {
      ignoredZeroCount++;
      continue;
    }

    counter++;
    incidents.push({
      no: counter,
      nuc,
      nama: colIndex.nama >= 0 ? cells[colIndex.nama] : "",
      jabatan: colIndex.jabatan >= 0 ? cells[colIndex.jabatan] : "",
      project: colIndex.project >= 0 ? cells[colIndex.project] : "",
      tanggal: colIndex.tanggal >= 0 ? cells[colIndex.tanggal] : "",
      jamMasuk: colIndex.jamMasuk >= 0 ? cells[colIndex.jamMasuk] : "",
      jadwalMulai: colIndex.jadwalMulai >= 0 ? cells[colIndex.jadwalMulai] : "",
      menit,
    });
  }

  return {
    periodeTxt,
    incidents,
    ignoredZeroCount,
  };
}

/**
 * Aggregate late incidents per employee
 */
export function aggregateLateByEmployee(incidents: LateIncident[]): LateEmployeeSummary[] {
  const map = new Map<string, LateEmployeeSummary>();

  for (const inc of incidents) {
    const key = `${inc.nuc}___${inc.nama}`;
    let item = map.get(key);
    if (!item) {
      item = {
        nuc: inc.nuc,
        nama: inc.nama,
        jabatan: inc.jabatan,
        project: inc.project,
        frekuensi: 0,
        totalMenit: 0,
        tanggalList: [],
        detailList: [],
      };
      map.set(key, item);
    }

    item.frekuensi += 1;
    item.totalMenit += inc.menit;
    const durasiFormatted = formatDurasiMenit(inc.menit, true);
    item.tanggalList.push(`${inc.tanggal} (${durasiFormatted})`);
    item.detailList.push(
      `${inc.tanggal} [Masuk: ${inc.jamMasuk}, Jadwal: ${inc.jadwalMulai}, Terlambat: ${durasiFormatted}]`
    );
  }

  return Array.from(map.values()).sort((a, b) => b.totalMenit - a.totalMenit);
}

/**
 * Aggregate late incidents per project
 */
export function aggregateLateByProject(incidents: LateIncident[]): Record<
  string,
  { employeeCount: number; incidentCount: number; totalMenit: number; employees: Set<string> }
> {
  const result: Record<
    string,
    { employeeCount: number; incidentCount: number; totalMenit: number; employees: Set<string> }
  > = {};

  for (const inc of incidents) {
    const proj = inc.project || "Tanpa Project";
    if (!result[proj]) {
      result[proj] = {
        employeeCount: 0,
        incidentCount: 0,
        totalMenit: 0,
        employees: new Set<string>(),
      };
    }

    result[proj].incidentCount += 1;
    result[proj].totalMenit += inc.menit;
    result[proj].employees.add(`${inc.nuc}___${inc.nama}`);
    result[proj].employeeCount = result[proj].employees.size;
  }

  return result;
}

/**
 * Detect employees with frequent lateness pattern (>= minFrekuensi)
 */
export function detectLatePatterns(
  summaries: LateEmployeeSummary[],
  minFrekuensi = 3
): PolaDetail[] {
  return summaries
    .filter(s => s.frekuensi >= minFrekuensi)
    .map((s, idx) => ({
      no: idx + 1,
      nuc: s.nuc,
      nama: s.nama,
      jabatan: s.jabatan,
      project: s.project,
      jumlah: s.frekuensi,
      pola: `Sering Terlambat (${s.frekuensi}x, total ${formatDurasiMenit(s.totalMenit)})`,
      detail: s.detailList.join("; "),
    }));
}
