import { KaryawanCek, LateIncident, PicPackage, LateEmployeeSummary } from "../../types/attendance";
import { parseISODate, tglId } from "./dateUtils";
import { namaAman } from "./stringUtils";
import { hitungPola } from "./anomalyDetector";
import { aggregateLateByEmployee } from "./lateParser";

/**
 * Draft PIC Message for WhatsApp / Email
 */
export function susunPesan(
  proyek: string,
  periodeTxt: string,
  jmlKaryawan: number,
  tot: {
    ALFA: number;
    SAKIT: number;
    IZIN: number;
    LEMBUR: number;
    BA_h: number;
    BA_a: number;
    LATE_freq?: number;
    LATE_menit?: number;
  },
  tlBaris: [number, string, string, string, string, number, string, string][],
  hariBelumFinal: Set<string> = new Set(),
  seringTerlambat: LateEmployeeSummary[] = []
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
  if (tot.LATE_freq && tot.LATE_freq > 0) {
    baris.push(`- Terlambat: ${tot.LATE_freq} kali (total ${tot.LATE_menit || 0} menit)`);
  }
  baris.push("");

  if (tlBaris.length > 0 || seringTerlambat.length > 0) {
    const per: Record<string, string[]> = {};
    for (const [, nuc, nama, , kat, jml, pola] of tlBaris) {
      const key = `${nama} (${nuc})`;
      if (!per[key]) per[key] = [];
      const katCapital = kat.charAt(0).toUpperCase() + kat.slice(1).toLowerCase();
      per[key].push(`${katCapital} ${jml}x (${pola})`);
    }

    for (const st of seringTerlambat) {
      const key = `${st.nama} (${st.nuc})`;
      if (!per[key]) per[key] = [];
      per[key].push(`Terlambat ${st.frekuensi}x (${st.totalMenit} menit)`);
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
      "Mohon dikonfirmasi alasan ketidakhadiran/keterlambatan karyawan di atas beserta bukti pendukungnya " +
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
  hariBelumFinal: Set<string> = new Set(),
  lateIncidents: LateIncident[] = []
): PicPackage[] {
  const perProyek: Record<string, KaryawanCek[]> = {};
  for (const k of karyawan) {
    if (!perProyek[k.project]) perProyek[k.project] = [];
    perProyek[k.project].push(k);
  }

  // Group late incidents by project
  const lateByProyek: Record<string, LateIncident[]> = {};
  for (const inc of lateIncidents) {
    const proj = inc.project || "Tanpa Project";
    if (!lateByProyek[proj]) lateByProyek[proj] = [];
    lateByProyek[proj].push(inc);
  }

  const hasil: PicPackage[] = [];

  for (const [proyek, daftar] of Object.entries(perProyek)) {
    const aman = namaAman(proyek);

    // Check matched late incidents for this project
    const matchedLate = lateByProyek[proyek] || [];
    const lateSummaries = aggregateLateByEmployee(matchedLate);
    const seringTerlambat = lateSummaries.filter(s => s.frekuensi >= 3);

    let lateFreq = 0;
    let lateMenit = 0;
    matchedLate.forEach(inc => {
      lateFreq++;
      lateMenit += inc.menit;
    });

    const tot = {
      ALFA: 0,
      SAKIT: 0,
      IZIN: 0,
      LEMBUR: 0,
      BA_h: 0,
      BA_a: 0,
      LATE_freq: lateFreq,
      LATE_menit: lateMenit,
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

    const pesan = susunPesan(
      proyek,
      periodeTxt,
      daftar.length,
      tot,
      tlBaris,
      hariBelumFinal,
      seringTerlambat
    );

    hasil.push({
      proyek,
      aman,
      daftar,
      tl_baris: tlBaris,
      tot,
      late_karyawan: lateSummaries,
      n_tl: tlNuc.size + seringTerlambat.length,
      n_kejadian: nKejadian + (lateFreq > 0 ? 1 : 0),
      pesan,
    });
  }

  return hasil;
}
