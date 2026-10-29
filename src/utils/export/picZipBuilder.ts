import ExcelJS from "exceljs";
import JSZip from "jszip";
import { PicPackage } from "../../types/attendance";
import { populateSheetTable } from "./excelStyles";

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

