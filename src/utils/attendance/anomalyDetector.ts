import {
  TimesheetData,
  RekapProjectData,
  KaryawanCek,
  PolaDetail,
  KODE_KOSONG,
  KODE_MAP,
  POLA_MIN_BERUNTUN,
  POLA_MIN_FREKUENSI,
} from "../../types/attendance";
import { toISODate, tglId, labelHari } from "./dateUtils";
import { pisahProyek } from "./stringUtils";

/**
 * Detect unfinalized days (hari berjalan)
 */
export function analisisHariBerjalan(
  timesheets: TimesheetData[],
  maksHari = 3,
  minAlfa = 3,
  rasioMin = 0.5
): Record<string, [number, number]> {
  const tot: Record<string, [number, number]> = {};
  const semuaTgl: Date[] = [];

  for (const data of timesheets) {
    const n = data.day_labels.length;
    data.dates.forEach(d => {
      if (d) semuaTgl.push(d);
    });

    const limit = Math.min(maksHari, n - 1);
    for (let k = 1; k <= limit; k++) {
      const idx = n - k;
      const d = data.dates[idx];
      if (!d) break;
      const iso = toISODate(d);
      if (!iso) break;

      for (const e of data.emps) {
        const sv = e.sys;
        if (sv.length < 8 || !sv.every(x => /^-?\d+(\.\d+)?$/.test(x))) {
          continue;
        }
        if (e.codes[idx]?.toUpperCase() !== "A") {
          continue;
        }
        const aSistem = parseInt(parseFloat(sv[2]).toString(), 10);
        const aSisa = e.codes.slice(0, idx).filter(c => c.toUpperCase() === "A").length;

        if (!tot[iso]) tot[iso] = [0, 0];
        tot[iso][0] += 1;
        if (aSistem === aSisa) {
          tot[iso][1] += 1;
        }
      }
    }
  }

  const hasil: Record<string, [number, number]> = {};
  if (semuaTgl.length === 0) return hasil;

  const sortedDates = Array.from(new Set(semuaTgl.map(d => toISODate(d)).filter(Boolean))).sort().reverse();

  for (const iso of sortedDates) {
    if (!tot[iso]) break;
    const [a, tdk] = tot[iso];
    if (a < minAlfa || tdk < rasioMin * a) {
      break;
    }
    hasil[iso] = [a, tdk];
  }

  return hasil;
}

/**
 * Aggregate single project stats from TimesheetData (Langkah 2)
 */
export function hitungRekapProject(data: TimesheetData): RekapProjectData {
  const [kode, nama] = pisahProyek(data.proyek);
  const tot = {
    H: 0,
    OFF: 0,
    G: 0,
    A: 0,
    IZIN: 0,
    SAKIT: 0,
    BA: 0,
    BAT: 0,
  };
  const asing: Record<string, number> = {};
  let kosong_n = 0;

  for (const e of data.emps) {
    tot.G += e.g;
    for (let i = 0; i < data.day_labels.length; i++) {
      const raw = e.codes[i];
      const kd = raw === null || raw === undefined ? "" : raw.trim();
      if (KODE_KOSONG.has(kd)) {
        if (kd) kosong_n++;
        continue;
      }
      const up = kd.toUpperCase();
      if (kd === "H") {
        tot.H += 1;
      } else if (kd === "h") {
        tot.BA += 1;
        tot.H += 1;
      } else if (up === "I" || up === "IR") {
        tot.IZIN += 1;
      } else if (up === "S" || up === "SR") {
        tot.SAKIT += 1;
      } else if (up === "A") {
        tot.A += 1;
        if (kd === "a") {
          tot.BAT += 1;
        }
      } else if (up === "O") {
        tot.OFF += 1;
      } else {
        const key = `${kd} (${e.nik} ${e.nama})`;
        asing[key] = (asing[key] || 0) + 1;
      }
    }
  }

  let periode_txt = "-";
  if (data.periode) {
    periode_txt = `${tglId(data.periode[0])} s/d ${tglId(data.periode[1])}`;
  }

  return {
    fileName: data.fileName,
    kode,
    nama,
    periode: data.periode,
    periode_txt,
    mp: data.emps.length,
    H: tot.H,
    OFF: tot.OFF,
    G: tot.G,
    A: tot.A,
    IZIN: tot.IZIN,
    SAKIT: tot.SAKIT,
    BA: tot.BA,
    BAT: tot.BAT,
    asing,
    kosong_n,
    warn: data.warnings || [],
  };
}

/**
 * Extract attendance anomalies and events for Step 3 (Cek Absensi)
 */
export function ekstraksiCekAbsensi(
  timesheets: TimesheetData[],
  gPeta: Record<string, Record<string, string[]>> = {}
): KaryawanCek[] {
  const semuaKaryawan: KaryawanCek[] = [];

  for (const data of timesheets) {
    const [, projectName] = pisahProyek(data.proyek);
    const project = projectName || data.proyek || data.fileName;
    const projectGPeta = gPeta[data.fileName] || {};

    for (const e of data.emps) {
      const kejadian: [string, string, "ALFA" | "LEMBUR" | "SAKIT" | "IZIN" | "BA"][] = [];
      const harian: [string, string, Date | null][] = [];

      for (let i = 0; i < data.day_labels.length; i++) {
        const kodeAsli = e.codes[i] || "";
        const label = labelHari(data, i);
        const tgl = data.dates[i];
        harian.push([label, kodeAsli, tgl]);

        const up = kodeAsli.toUpperCase();
        let kategori: "ALFA" | "LEMBUR" | "SAKIT" | "IZIN" | "BA" | null = null;

        if (kodeAsli === "h") {
          kategori = "BA";
        } else if (kodeAsli === "a") {
          kejadian.push([label, kodeAsli, "BA"]);
          kategori = "ALFA";
        } else if (up in KODE_MAP) {
          kategori = KODE_MAP[up];
        }

        if (kategori === "LEMBUR") {
          continue;
        }

        if (kategori) {
          kejadian.push([label, kodeAsli, kategori]);
        }
      }

      if (e.g > 0) {
        const datesG = projectGPeta[e.nik] || e.g_hari.map(idx => labelHari(data, idx));
        if (datesG.length === e.g) {
          datesG.forEach(t => {
            kejadian.push([t, "G", "LEMBUR"]);
          });
        } else {
          for (let k = 0; k < e.g; k++) {
            kejadian.push(["-", "G", "LEMBUR"]);
          }
        }
      }

      semuaKaryawan.push({
        nuc: e.nik,
        nama: e.nama,
        jabatan: e.jab,
        project,
        kejadian,
        harian,
      });
    }
  }

  return semuaKaryawan;
}

const POLA_KATEGORI: Record<string, "ALFA" | "SAKIT" | "IZIN"> = {
  A: "ALFA",
  S: "SAKIT",
  SR: "SAKIT",
  I: "IZIN",
  IR: "IZIN",
};

/**
 * Detect patterns needing follow-up
 */
export function hitungPola(
  karyawan: KaryawanCek[],
  kat: "ALFA" | "SAKIT" | "IZIN",
  hariBelumFinal: Set<string> = new Set()
): PolaDetail[] {
  const hasil: {
    polaCount: number;
    jumlah: number;
    k: KaryawanCek;
    polaStr: string;
    detailStr: string;
  }[] = [];

  for (const k of karyawan) {
    const harian = k.harian || [];
    const seq: [string, "ALFA" | "SAKIT" | "IZIN" | null, string | null][] = [];

    for (const [label, kode, tgl] of harian) {
      const iso = tgl ? toISODate(tgl) : "";
      if (iso && hariBelumFinal.has(iso)) {
        seq.push([label, null, null]);
      } else {
        const up = (kode || "").toUpperCase();
        seq.push([label, POLA_KATEGORI[up] || null, up]);
      }
    }

    const jumlah = seq.filter(([, kt]) => kt === kat).length;
    if (jumlah === 0) continue;

    const pola: string[] = [];
    const detail: string[] = [];

    // 1. Beruntun
    let i = 0;
    while (i < seq.length) {
      if (seq[i][1] === kat) {
        let j = i;
        while (j + 1 < seq.length && seq[j + 1][1] === kat) {
          j++;
        }
        const n = j - i + 1;
        if (n >= POLA_MIN_BERUNTUN) {
          if (!pola.includes("Beruntun")) {
            pola.push("Beruntun");
          }
          detail.push(`Beruntun ${n} hari: ${seq[i][0]} s/d ${seq[j][0]}`);
        }
        i = j + 1;
      } else {
        i++;
      }
    }

    // 2. Mengapit Off
    const idx = seq.map((item, index) => (item[1] === kat ? index : -1)).filter(x => x !== -1);
    for (let m = 0; m < idx.length - 1; m++) {
      const a = idx[m];
      const b = idx[m + 1];
      const tengah = seq.slice(a + 1, b);
      if (tengah.length > 0 && tengah.every(([, , kd]) => kd === "O")) {
        if (!pola.includes("Mengapit Off")) {
          pola.push("Mengapit Off");
        }
        detail.push(
          `Mengapit Off: ${seq[a][0]} (${seq[a][2]}), Off ${tengah.length} hari, ${seq[b][0]} (${seq[b][2]})`
        );
      }
    }

    // 3. Sering
    if (jumlah >= POLA_MIN_FREKUENSI) {
      pola.push("Sering");
      detail.push(`${jumlah} kali dalam periode`);
    }

    if (pola.length > 0) {
      hasil.push({
        polaCount: pola.length,
        jumlah,
        k,
        polaStr: pola.join("; "),
        detailStr: detail.join(" | "),
      });
    }
  }

  hasil.sort((a, b) => {
    if (b.polaCount !== a.polaCount) return b.polaCount - a.polaCount;
    if (b.jumlah !== a.jumlah) return b.jumlah - a.jumlah;
    if (a.k.project !== b.k.project) return a.k.project.localeCompare(b.k.project);
    return a.k.nama.localeCompare(b.k.nama);
  });

  return hasil.map((item, index) => ({
    no: index + 1,
    nuc: item.k.nuc,
    nama: item.k.nama,
    jabatan: item.k.jabatan,
    project: item.k.project,
    jumlah: item.jumlah,
    pola: item.polaStr,
    detail: item.detailStr,
  }));
}

