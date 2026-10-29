/**
 * Types and Constants for Proses Absensi Engine
 * Faithfully matches /public/assets/aistudio/proses_absensi_b4f1e61c.py
 */

export interface Employee {
  nik: string;
  jab: string;
  codes: string[];
  sys: string[];
  ket: string;
  nama: string;
  g: number;
  g_hari: number[];
}

export interface TimesheetData {
  id: string;
  fileName: string;
  judul: string;
  proyek: string;
  kode: string;
  periode: [Date, Date] | null;
  day_labels: string[];
  dates: (Date | null)[];
  emps: Employee[];
  dipotong_dari?: number;
  warnings?: string[];
}

export interface RekapProjectData {
  fileName: string;
  kode: string;
  nama: string;
  periode: [Date, Date] | null;
  periode_txt: string;
  mp: number;
  H: number;
  OFF: number;
  G: number;
  A: number;
  IZIN: number;
  SAKIT: number;
  BA: number;
  BAT: number;
  asing: Record<string, number>;
  kosong_n: number;
  warn: string[];
}

export interface CekIncident {
  label: string;
  kode: string;
  kategori: "ALFA" | "LEMBUR" | "SAKIT" | "IZIN" | "BA";
  tgl: Date | null;
}

export interface KaryawanCek {
  nuc: string;
  nama: string;
  jabatan: string;
  project: string;
  kejadian: [string, string, "ALFA" | "LEMBUR" | "SAKIT" | "IZIN" | "BA"][];
  harian: [string, string, Date | null][];
}

export interface PolaDetail {
  no: number;
  nuc: string;
  nama: string;
  jabatan: string;
  project: string;
  jumlah: number;
  pola: string;
  detail: string;
}

export interface LateIncident {
  no: number;
  nuc: string;
  nama: string;
  jabatan: string;
  project: string;
  tanggal: string;
  jamMasuk: string;
  jadwalMulai: string;
  menit: number;
}

export interface LateEmployeeSummary {
  nuc: string;
  nama: string;
  jabatan: string;
  project: string;
  frekuensi: number;
  totalMenit: number;
  tanggalList: string[];
  detailList: string[];
}

export interface PicPackage {
  proyek: string;
  aman: string;
  daftar: KaryawanCek[];
  tl_baris: [number, string, string, string, string, number, string, string][];
  tot: {
    ALFA: number;
    SAKIT: number;
    IZIN: number;
    LEMBUR: number;
    BA_h: number;
    BA_a: number;
    LATE_freq?: number;
    LATE_menit?: number;
  };
  late_karyawan?: LateEmployeeSummary[];
  n_tl: number;
  n_kejadian: number;
  pesan: string;
  rekapFileName?: string;
}

export const HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
export const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
export const BULAN = [
  "JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI",
  "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"
];

export const BLN_SHORT: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, mei: 5, jun: 6,
  jul: 7, agu: 8, agt: 8, sep: 9, okt: 10, nov: 11, des: 12,
  oct: 10, aug: 8, dec: 12, may: 5
};

export const SUM_HEAD = ["Hadir", "BA", "Izin", "Sakit", "Alpa", "Off", "Lembur Ganti"];

export const PROYEK_TEMPLATE = [
  "CIREBON SUPER BLOK",
  "CIREBON SUPER BLOCK - TRILIO",
  "THE PARK SAWANGAN",
  "THE PARK SAWANGAN LABOUR SUPPLY - TRILIO",
  "OAKQOOD COZMO APARTMENT",
  "GKM GREEN TOWER",
  "THE PARC SOUTH CITY APARTMENT",
  "SAFFRON APARTMENT",
  "KEDOYA SPORT CLUB - PADEL",
  "PT. PADEL ARENA BAHAGIA - KEMANG",
  "RS MITRA MEDIKA PONTIANAK",
  "RS. KHARITAS BHAKTI",
  "RSUD DOKTOR RUBINI MENPAWAH",
  "RSUD dr. RUBINI MEMPAWAH - GARDENER",
  "SATU 8 RESIDENCE - GARDENER",
  "PLAYCE ACTIVE HUB",
];

export const ALIAS: Record<string, string> = {};

export const KODE_KOSONG = new Set(["", "[]", "-"]);
export const FUZZY_MIN = 0.85;

export const KODE_MAP: Record<string, "ALFA" | "LEMBUR" | "SAKIT" | "IZIN"> = {
  A: "ALFA",
  G: "LEMBUR",
  S: "SAKIT",
  SR: "SAKIT",
  I: "IZIN",
  IR: "IZIN",
};

export const KATEGORI: ("ALFA" | "LEMBUR" | "SAKIT" | "IZIN" | "BA")[] = [
  "ALFA", "LEMBUR", "SAKIT", "IZIN", "BA"
];

export const KATEGORI_FILE: [string, "ALFA" | "LEMBUR" | "SAKIT" | "IZIN" | "BA", string][] = [
  ["ALFA", "ALFA", "A/a"],
  ["SAKIT", "SAKIT", "S/SR"],
  ["IZIN", "IZIN", "I/IR"],
  ["LEMBUR", "LEMBUR", "G/g"],
  ["BA", "BA", "h/a"],
];

export const POLA_MIN_BERUNTUN = 3;
export const POLA_MIN_FREKUENSI = 3;
