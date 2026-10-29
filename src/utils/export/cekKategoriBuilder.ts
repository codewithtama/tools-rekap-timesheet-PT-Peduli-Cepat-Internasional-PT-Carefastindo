import ExcelJS from "exceljs";
import { KaryawanCek, LateIncident } from "../../types/attendance";
import { hitungPola } from "../attendance/anomalyDetector";
import {
  aggregateLateByEmployee,
  aggregateLateByProject,
  detectLatePatterns,
  formatDurasiMenit,
} from "../attendance/lateParser";
import { FONT_NAME, populateSheetTable } from "./excelStyles";

/**
 * LANGKAH 3: Build individual Category Workbook (ALFA, SAKIT, IZIN, LEMBUR, BA)
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
      ["No", "Project", "Jumlah Karyawan", `Total ${kat}`],
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

/**
 * LANGKAH 3: Build individual CEK_TERLAMBAT.xlsx
 */
export async function buildCekKeterlambatanXlsx(
  incidents: LateIncident[],
  periodeTxt: string
): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  const summaries = aggregateLateByEmployee(incidents);
  const projectAgg = aggregateLateByProject(incidents);
  const polas = detectLatePatterns(summaries, 3);

  // Sheet 1: Summary Karyawan
  const ws1 = wb.addWorksheet("Summary Karyawan");
  let grandTotalMenit = 0;
  let grandTotalKejadian = 0;

  const baris1 = summaries.map((s, idx) => {
    grandTotalKejadian += s.frekuensi;
    grandTotalMenit += s.totalMenit;
    return [
      idx + 1,
      s.nuc,
      s.nama,
      s.jabatan,
      s.project,
      s.frekuensi,
      formatDurasiMenit(s.totalMenit),
      s.tanggalList.join(", "),
    ];
  });

  populateSheetTable(
    ws1,
    `SUMMARY KETERLAMBATAN KARYAWAN${periodeTxt ? " PERIODE " + periodeTxt : ""}`,
    ["No", "NUC", "Nama", "Jabatan", "Project", "Jumlah", "Total Terlambat", "Rincian Tanggal (Durasi)"],
    baris1,
    [6, 14, 30, 18, 28, 14, 18, 60],
    [1, 2, 6, 7],
    ["TOTAL", "", "", "", "", grandTotalKejadian, formatDurasiMenit(grandTotalMenit), ""]
  );

  // Sheet 2: Detail Kejadian
  const ws2 = wb.addWorksheet("Detail Kejadian");
  const baris2 = incidents.map((inc, idx) => [
    idx + 1,
    inc.nuc,
    inc.nama,
    inc.jabatan,
    inc.project,
    inc.tanggal,
    inc.jamMasuk,
    inc.jadwalMulai,
    formatDurasiMenit(inc.menit),
  ]);

  populateSheetTable(
    ws2,
    `DETAIL KEJADIAN KETERLAMBATAN${periodeTxt ? " PERIODE " + periodeTxt : ""}`,
    ["No", "NUC", "Nama", "Jabatan", "Project", "Tanggal", "Jam Masuk", "Jadwal Mulai", "Terlambat"],
    baris2,
    [6, 14, 30, 18, 28, 16, 14, 14, 18],
    [1, 2, 6, 7, 8, 9],
    ["TOTAL", "", "", "", "", "", "", "", formatDurasiMenit(grandTotalMenit)]
  );

  // Sheet 3: Summary Project
  const ws3 = wb.addWorksheet("Summary Project");
  const baris3 = Object.entries(projectAgg).map(([namaP, v], idx) => [
    idx + 1,
    namaP,
    v.employeeCount,
    v.incidentCount,
    formatDurasiMenit(v.totalMenit),
  ]);

  populateSheetTable(
    ws3,
    `SUMMARY KETERLAMBATAN PER PROJECT${periodeTxt ? " PERIODE " + periodeTxt : ""}`,
    ["No", "Project", "Jumlah Karyawan", "Jumlah Kejadian", "Total Terlambat"],
    baris3,
    [6, 34, 18, 16, 18],
    [1, 3, 4, 5],
    [
      "TOTAL",
      "",
      Object.values(projectAgg).reduce((acc, v) => acc + v.employeeCount, 0),
      grandTotalKejadian,
      formatDurasiMenit(grandTotalMenit),
    ]
  );

  // Sheet 4: Perlu Tindak Lanjut (Sering Terlambat >= 3x)
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
    `KARYAWAN SERING TERLAMBAT (>= 3 KALI)${periodeTxt ? " PERIODE " + periodeTxt : ""}`,
    ["No", "NUC", "Nama", "Jabatan", "Project", "Jumlah", "Pola", "Detail Kejadian"],
    baris4,
    [6, 14, 30, 18, 28, 10, 26, 90],
    [1, 2, 6]
  );

  const noteR = 3;
  ws4.getCell(`A${noteR}`).value =
    polas.length > 0
      ? "Kriteria: Karyawan yang tercatat terlambat minimal 3 kali pada periode laporan."
      : "Tidak ada karyawan dengan catatan sering terlambat (>= 3 kali).";
  ws4.getCell(`A${noteR}`).font = {
    name: FONT_NAME,
    size: 9,
    italic: true,
    color: { argb: polas.length > 0 ? "FF666666" : "FF006100" },
  };

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
