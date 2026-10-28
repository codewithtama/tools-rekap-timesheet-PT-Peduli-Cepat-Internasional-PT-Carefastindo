# -*- coding: utf-8 -*-
"""
PROSES ABSENSI (GABUNGAN 3 SCRIPT + PAKET PIC)

Satu script untuk seluruh alur kerja absensi, berurutan:

  LANGKAH 1  KONVERSI TIMESHEET
             File timesheet hasil download sistem (HTML bernama .xls) menjadi
             Rekap-Absensi-<nama>.xlsx yang rapi.
  LANGKAH 2  BUAT SUMMARY
             Semua Rekap dari langkah 1 diringkas per proyek ke
             SUMMARY_ABSENSI_TEMPLATE.xlsx, lengkap dengan GRAND TOTAL.
  LANGKAH 3  CEK ABSENSI
             Mencari A/a (ALFA), S/SR (SAKIT), I/IR (IZIN), G/g (LEMBUR), dan BA
             (h = BA diterima/hadir, a huruf kecil = BA ditolak, juga tetap Alfa), lalu membuat
             5 file Excel terpisah berisi NAMA, NUC, dan PROJECT.

  LANGKAH 4  PAKET PIC
             Dari hasil langkah 3, dibuat satu paket per proyek di
             hasil\\PAKET_PIC_<periode>\\<proyek>\\ dan <proyek>.zip, berisi:
               ABSENSI_<proyek>_<periode>.xlsx (sheet Ringkasan, Detail Kejadian,
               Perlu Tindak Lanjut), Rekap-Absensi proyek tsb, dan PESAN_<proyek>.txt
               (draft pesan siap tempel ke PIC). Lewati dengan --tanpa-paket.

Cara pakai:
  1. Klik dua kali proses_absensi.bat, atau drag and drop file timesheet ke bat-nya.
  2. Atau lewat terminal:
       python proses_absensi.py                         -> proses semua timesheet di folder "input" (atau folder script)
       python proses_absensi.py a.xls b.xls             -> proses file tertentu
       python proses_absensi.py D:\\folder\\timesheet     -> proses semua timesheet di folder itu
       python proses_absensi.py hasil\\Rekap-Absensi-a.xlsx
                                                         -> file yang sudah berupa Rekap langsung ke langkah 2 dan 3
       python proses_absensi.py --template=D:\\X\\TEMPLATE.xlsx
       python proses_absensi.py --no-open               -> jangan buka folder hasil di akhir
       python proses_absensi.py --dari=2026-10-20 --sampai=2026-10-25
                                                         -> hanya proses rentang tanggal itu (tanpa ditanya)
       python proses_absensi.py --semua                 -> proses seluruh periode apa adanya (tanpa tanya,
                                                            tanpa memotong hari berjalan)

Semua hasil disimpan di folder "hasil" di samping script ini:
  hasil\\Rekap-Absensi-<nama>.xlsx        (langkah 1)
  hasil\\SUMMARY_ABSENSI_<periode>.xlsx   (langkah 2, perlu SUMMARY_ABSENSI_TEMPLATE.xlsx)
  hasil\\CEK_ALFA_<periode>.xlsx         (langkah 3, 5 file terpisah:
  hasil\\CEK_SAKIT_<periode>.xlsx         Alfa, Sakit, Izin, Lembur, BA;
  hasil\\CEK_IZIN_<periode>.xlsx          tiap file hanya berisi satu kategori,
  hasil\\CEK_LEMBUR_<periode>.xlsx        dengan NUC, Nama, Jabatan, Project)
  hasil\\CEK_BA_<periode>.xlsx

Catatan penting:
  * Langkah 2 dan 3 hanya memakai file Rekap dari proses yang sedang berjalan,
    jadi Rekap lama di folder hasil tidak ikut tercampur.
  * Kalau template summary tidak ada, langkah 2 dilewati dan langkah 3 tetap jalan.
  * Lembur (G) diambil dari kolom "Lembur Ganti" di Rekap, karena di timesheet
    sistem kode G ada di baris bawah tiap karyawan. Tanggal lembur tercatat
    bila Rekap berasal dari konversi pada proses yang sama.
  * Rentang tanggal: setelah periode terdeteksi dari file, script menanyakan dari
    tanggal berapa sampai tanggal berapa (Enter = seluruh periode). Rekap, Summary,
    dan Cek semuanya ikut dipotong sesuai rentang itu. Rekap hasil potongan diberi
    akhiran _<mulai>-<akhir> supaya tidak menimpa Rekap periode penuh.
  * Rekap lama yang dimasukkan langsung juga bisa difilter per tanggal, kecuali
    Lembur (G) yang hanya tersimpan sebagai total. Untuk itu script memberi peringatan
    dan memakai total penuh.
  * Hari berjalan: script membandingkan kode A tiap hari dengan total Alpa bawaan sistem.
    Bila A pada hari terakhir umumnya tidak dihitung sistem, hari itu dianggap belum
    ditutup (A semu). Isian "Sampai tanggal" otomatis diarahkan ke tanggal final terakhir.
    Pakai --semua bila tetap ingin memproses semuanya.
  * Pola: file CEK_ALFA, CEK_SAKIT, dan CEK_IZIN punya sheet "Perlu Tindak Lanjut" berisi
    karyawan dengan pola beruntun (minimal POLA_MIN_BERUNTUN hari), mengapit hari Off
    (misalnya A, O, A), atau sering (minimal POLA_MIN_FREKUENSI kejadian). Batasnya bisa
    diubah di konstanta dekat bagian atas script.

Kebutuhan: Python 3.8+ dan library openpyxl (pip install openpyxl).
"""
import os
import re
import sys
import copy
import glob
import difflib
import datetime as dt
from collections import Counter, OrderedDict
from html.parser import HTMLParser
from pathlib import Path

try:
    from openpyxl import Workbook, load_workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.formatting.rule import FormulaRule
    from openpyxl.utils import get_column_letter as L
except ImportError:
    print("Library openpyxl belum terpasang. Jalankan:  pip install openpyxl")
    sys.exit(1)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(BASE_DIR, "hasil")
HASIL_DIR = OUT_DIR
TEMPLATE_DEFAULT = os.path.join(BASE_DIR, "SUMMARY_ABSENSI_TEMPLATE.xlsx")

HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]
BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
SUM_HEAD = ["Hadir", "BA", "Izin", "Sakit", "Alpa", "Off", "Lembur Ganti"]

# Urutan dan nama baris proyek persis seperti di template.
# Proyek yang ada di folder tapi belum ada di daftar ini otomatis ditambahkan di bawahnya.
PROYEK_TEMPLATE = [
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
]

# Kalau nama proyek di sistem beda jauh dengan nama di template, petakan manual di sini.
# Kunci: kode proyek (mis. "09010120") ATAU nama proyek dari sistem (tanpa kode).
# Nilai: nama baris di template (harus sama persis dengan salah satu isi PROYEK_TEMPLATE).
# Contoh:  "09010120": "GKM GREEN TOWER",
ALIAS = {
}

BLN_SHORT = {"jan": 1, "feb": 2, "mar": 3, "apr": 4, "mei": 5, "jun": 6, "jul": 7,
             "agu": 8, "agt": 8, "sep": 9, "okt": 10, "nov": 11, "des": 12}
BULAN = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS",
         "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"]

KODE_KOSONG = {"", "[]", "-"}          # sel harian yang dianggap kosong (mis. sudah clearance sheet)
FUZZY_MIN = 0.85                       # batas kemiripan nama untuk pencocokan otomatis

# Kode yang dicari di langkah 3 (nilai sel dinormalkan dengan .upper())
KODE_MAP = {
    "A": "ALFA",
    "G": "LEMBUR",
    "S": "SAKIT",
    "SR": "SAKIT",
    "I": "IZIN",
    "IR": "IZIN",
}
KATEGORI = ["ALFA", "LEMBUR", "SAKIT", "IZIN", "BA"]

# Label kolom rekap di sebelah kanan tabel harian, untuk mendeteksi akhir kolom tanggal
LABEL_REKAP = {
    "HADIR", "BA", "IZIN", "SAKIT", "ALPA", "ALFA", "OFF", "LEMBUR GANTI",
    "LEMBUR", "KETERANGAN", "TOTAL",
}

FONT = "Arial"

RENTANG = None   # (tanggal_awal, tanggal_akhir) pilihan pengguna, None = seluruh periode
HARI_BELUM_FINAL = set()   # tanggal di dalam rentang yang tampaknya belum ditutup sistem
POLA_MIN_BERUNTUN = 3      # minimal hari berturut-turut dengan kategori sama untuk dianggap pola
POLA_MIN_FREKUENSI = 3     # minimal jumlah kejadian dalam periode untuk dianggap sering


class TidakBeririsan(Exception):
    """Periode sebuah file sama sekali di luar rentang tanggal yang dipilih."""


def simpan_wb(wb, out_path):
    """Simpan workbook. Bila file sedang dibuka di Excel, simpan dengan nama alternatif."""
    try:
        wb.save(out_path)
    except PermissionError:
        alt = out_path.replace(".xlsx", "-%s.xlsx" % dt.datetime.now().strftime("%H%M%S"))
        wb.save(alt)
        out_path = alt
    return out_path


# ============================================================================
# RENTANG TANGGAL : DETEKSI PERIODE LALU PILIH DARI TANGGAL BERAPA SAMPAI BERAPA
# ============================================================================
BULAN_INPUT = dict(BLN_SHORT)
BULAN_INPUT.update({"oct": 10, "aug": 8, "dec": 12, "may": 5})


def daftar_tanggal(d0, d1):
    return [d0 + dt.timedelta(n) for n in range((d1 - d0).days + 1)]


def jml_hari(d0, d1):
    return (d1 - d0).days + 1


def klip_periode(pr):
    """Potong periode (d0, d1) sesuai RENTANG. Return None bila tidak beririsan."""
    if pr is None or RENTANG is None:
        return pr
    a, b = max(pr[0], RENTANG[0]), min(pr[1], RENTANG[1])
    return (a, b) if a <= b else None


def periode_timesheet_cepat(path):
    """Baca periode dari timesheet HTML tanpa parsing penuh. Return (d0, d1) atau None."""
    try:
        raw = baca_teks_file(path)
        m = re.search(r"Periode\s*:\s*(\d{4}-\d{2}-\d{2})\s*-\s*(\d{4}-\d{2}-\d{2})", raw)
        if not m:
            return None
        return dt.date.fromisoformat(m.group(1)), dt.date.fromisoformat(m.group(2))
    except Exception:
        return None


def periode_rekap_cepat(path):
    """Baca periode dari file Rekap yang sudah jadi. Return (d0, d1) atau None."""
    try:
        wb = load_workbook(path, data_only=True)
        ws = wb["Rekap Absensi"] if "Rekap Absensi" in wb.sheetnames else wb.worksheets[0]
        return parse_periode(cari_periode_teks(ws))
    except Exception:
        return None


def cari_tanggal(teks, d_awal, d_akhir):
    """
    Terjemahkan ketikan pengguna menjadi tanggal di dalam periode d_awal..d_akhir.
    Format: 20 | 20 okt | 20 oktober 2026 | 2026-10-20 | 20/10 | 20/10/2026
    Return (date, None) bila berhasil, atau (None, pesan_kesalahan).
    """
    t = teks.strip().lower()
    hari = bulan = tahun = None
    m = re.match(r"^(\d{4})-(\d{1,2})-(\d{1,2})$", t)
    if m:
        tahun, bulan, hari = int(m.group(1)), int(m.group(2)), int(m.group(3))
    else:
        m = re.match(r"^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{4}))?$", t)
        if m:
            hari, bulan = int(m.group(1)), int(m.group(2))
            tahun = int(m.group(3)) if m.group(3) else None
        else:
            m = re.match(r"^(\d{1,2})(?:\s*([a-z]+))?(?:\s*(\d{4}))?$", t)
            if not m:
                return None, "Format tidak dikenali. Contoh: 20, 20 okt, atau 2026-10-20."
            hari = int(m.group(1))
            if m.group(2):
                bulan = BULAN_INPUT.get(m.group(2)[:3])
                if not bulan:
                    return None, "Nama bulan '%s' tidak dikenali." % m.group(2)
            tahun = int(m.group(3)) if m.group(3) else None
    cocok = [d for d in daftar_tanggal(d_awal, d_akhir)
             if d.day == hari
             and (bulan is None or d.month == bulan)
             and (tahun is None or d.year == tahun)]
    if not cocok:
        return None, "Tanggal itu tidak ada di periode (%s s/d %s)." % (tgl_id(d_awal), tgl_id(d_akhir))
    if len(cocok) > 1:
        return None, "Tanggal %d ada di beberapa bulan (%s). Ketik lengkap, misalnya %d %s." % (
            hari, ", ".join("%s %d" % (BLN[d.month - 1], d.year) for d in cocok),
            hari, BLN[cocok[0].month - 1].lower())
    return cocok[0], None


def tanya_tanggal(label, default, d_awal, d_akhir):
    while True:
        try:
            teks = input("%s [Enter = %s] : " % (label, tgl_id(default))).strip()
        except EOFError:
            return default
        if not teks:
            return default
        d, pesan = cari_tanggal(teks, d_awal, d_akhir)
        if d:
            return d
        print("  %s" % pesan)


def analisis_hari_berjalan(timesheets, maks_hari=3, min_alfa=3, rasio_min=0.5):
    """
    Deteksi hari terakhir yang belum ditutup sistem (hari berjalan).
    Di hari yang belum ditutup, kolom harian sudah menampilkan A, tetapi total Alpa bawaan
    sistem belum menghitungnya. Jadi untuk tiap karyawan yang kodenya A pada hari terakhir,
    dicek apakah total A bawaan sistem sama dengan jumlah A tanpa hari itu. Bila sebagian
    besar begitu, hari itu dianggap belum final. Pemeriksaan diulang mundur sampai maks_hari.
    Return dict {tanggal: (jumlah A hari itu, jumlah yang tidak dihitung sistem)} untuk hari
    yang dianggap belum final, atau dict kosong.
    """
    tot = {}
    semua_tgl = set()
    for f in timesheets:
        try:
            data = parse_timesheet(f)
        except Exception:
            continue
        n = len(data["day_labels"])
        semua_tgl.update(d for d in data["dates"] if d)
        for k in range(1, min(maks_hari, n - 1) + 1):
            idx = n - k
            d = data["dates"][idx]
            if d is None:
                break
            for e in data["emps"]:
                sv = e["sys"]
                if len(sv) < 8 or not all(x.replace(".", "", 1).isdigit() for x in sv):
                    continue
                if e["codes"][idx].upper() != "A":
                    continue
                a_sistem = int(float(sv[2]))
                a_sisa = sum(1 for c in e["codes"][:idx] if c.upper() == "A")
                t = tot.setdefault(d, [0, 0])
                t[0] += 1
                if a_sistem == a_sisa:
                    t[1] += 1
    hasil = {}
    d = max(semua_tgl) if semua_tgl else None
    while d is not None and d in tot:
        a, tdk = tot[d]
        if a < min_alfa or tdk < rasio_min * a:
            break
        hasil[d] = (a, tdk)
        d -= dt.timedelta(1)
    return hasil


def tentukan_rentang(sumber, dari_arg, sampai_arg, semua, belum_final=None):
    """
    sumber: list (nama_file, periode_atau_None).
    belum_final: hasil analisis_hari_berjalan (dict tanggal -> (jumlah A, yang tidak dihitung sistem)).
    Return (d0, d1) rentang terpilih, atau None bila seluruh periode dipakai.
    """
    ada = [(n, p) for n, p in sumber if p]
    if not ada:
        print("\nPeriode tidak terbaca dari file, pilihan rentang tanggal dilewati.")
        return None
    awal = min(p[0] for _, p in ada)
    akhir = max(p[1] for _, p in ada)
    print("\nPeriode terdeteksi dari %d file: %s s/d %s (%d hari)" % (
        len(ada), tgl_id(awal), tgl_id(akhir), jml_hari(awal, akhir)))
    unik = OrderedDict()
    for n, p in ada:
        unik.setdefault(p, []).append(n)
    if len(unik) > 1:
        print("  Periode antar file tidak sama:")
        for p, ns in unik.items():
            print("    %s s/d %s : %d file" % (tgl_id(p[0]), tgl_id(p[1]), len(ns)))

    aman = None
    if belum_final:
        tgl = sorted(belum_final)
        total_a = sum(belum_final[d][0] for d in tgl)
        total_tdk = sum(belum_final[d][1] for d in tgl)
        nama_tgl = tgl_id(tgl[0]) if len(tgl) == 1 else "%s sampai %s" % (tgl_id(tgl[0]), tgl_id(tgl[-1]))
        print("\nPERHATIAN: tanggal %s tampaknya belum ditutup sistem (hari berjalan)." % nama_tgl)
        print("  %d dari %d kode A pada tanggal itu tidak ikut dihitung oleh total bawaan sistem," % (total_tdk, total_a))
        print("  jadi kemungkinan besar bukan Alfa sungguhan.")
        aman = tgl[0] - dt.timedelta(1)
        if aman < awal:
            aman = None
        else:
            print("  Tanggal terakhir yang sudah final: %s." % tgl_id(aman))
    if semua:
        return None
    akhir_default = aman or akhir

    if dari_arg or sampai_arg:
        d0, d1 = awal, akhir_default
        if dari_arg:
            d0, pesan = cari_tanggal(dari_arg, awal, akhir)
            if pesan:
                print("Argumen --dari tidak valid: %s" % pesan)
                raise SystemExit(1)
        if sampai_arg:
            d1, pesan = cari_tanggal(sampai_arg, awal, akhir)
            if pesan:
                print("Argumen --sampai tidak valid: %s" % pesan)
                raise SystemExit(1)
        elif aman:
            print("  --sampai tidak diisi, dipakai tanggal final terakhir: %s." % tgl_id(aman))
        if d0 > d1:
            print("Tanggal awal (%s) tidak boleh sesudah tanggal akhir (%s)." % (tgl_id(d0), tgl_id(d1)))
            raise SystemExit(1)
    elif sys.stdin is not None and sys.stdin.isatty():
        print("Pilih rentang tanggal yang diproses (tekan Enter untuk memakai bawaan).")
        if aman:
            print("  Bawaan 'Sampai tanggal' adalah %s, tanggal final terakhir." % tgl_id(aman))
        d0 = tanya_tanggal("Dari tanggal   ", awal, awal, akhir)
        bawaan_akhir = akhir_default if akhir_default >= d0 else akhir
        while True:
            d1 = tanya_tanggal("Sampai tanggal ", bawaan_akhir, awal, akhir)
            if d1 >= d0:
                break
            print("  Tanggal akhir tidak boleh sebelum tanggal awal (%s)." % tgl_id(d0))
    else:
        if not aman:
            return None
        d0, d1 = awal, aman
        print("Otomatis dipotong sampai %s karena hari sesudahnya belum final. "
              "Pakai --semua untuk memproses seluruh periode." % tgl_id(aman))

    if (d0, d1) == (awal, akhir):
        print("Memakai seluruh periode.")
        return None
    print("Dipakai: %s s/d %s (%d hari)" % (tgl_id(d0), tgl_id(d1), jml_hari(d0, d1)))
    return d0, d1


def potong_data(data, d0, d1):
    """
    Potong data timesheet ke rentang d0..d1.
    Return (data_baru, dipotong). Raise TidakBeririsan bila tidak ada hari yang masuk rentang.
    """
    if not any(data["dates"]):
        return data, False            # tanggal kolom tidak diketahui, tidak bisa dipotong
    keep = [i for i, d in enumerate(data["dates"]) if d and d0 <= d <= d1]
    if not keep:
        raise TidakBeririsan()
    if len(keep) == len(data["day_labels"]):
        return data, False
    baru_idx = {lama: n for n, lama in enumerate(keep)}
    emps = []
    for e in data["emps"]:
        x = dict(e)
        x["codes"] = [e["codes"][i] for i in keep]
        x["g_hari"] = [baru_idx[i] for i in e["g_hari"] if i in baru_idx]
        x["g"] = len(x["g_hari"])
        x["sys"] = []                 # total bawaan sistem untuk seluruh periode, tidak cocok lagi
        emps.append(x)
    tgl = [data["dates"][i] for i in keep]
    baru = dict(data)
    baru.update({
        "day_labels": [data["day_labels"][i] for i in keep],
        "dates": tgl,
        "emps": emps,
        "periode": (tgl[0], tgl[-1]),
        "dipotong_dari": len(data["day_labels"]),
    })
    return baru, True


def tanggal_dari_label(label, periode):
    """'Kamis 15 Okt' (atau '15') + periode -> date, atau None bila tidak bisa ditentukan."""
    if not periode:
        return None
    m = re.search(r"(\d{1,2})\s*([A-Za-z]{3})?", str(label or ""))
    if not m:
        return None
    hari = int(m.group(1))
    bln = BLN_SHORT.get((m.group(2) or "").lower())
    for d in daftar_tanggal(periode[0], periode[1]):
        if d.day == hari and (bln is None or d.month == bln):
            return d
    return None


def saring_kolom(kolom, periode):
    """
    kolom: list (indeks_kolom, label_tanggal). Return (kolom_yang_dipakai, jumlah_dibuang).
    Tanpa RENTANG atau periode tak diketahui, semua kolom dipertahankan.
    Kolom yang tanggalnya tak bisa ditentukan juga dipertahankan.
    """
    if RENTANG is None or not periode:
        return list(kolom), 0
    simpan, buang = [], 0
    for c, lab in kolom:
        d = tanggal_dari_label(lab, periode)
        if d is None or RENTANG[0] <= d <= RENTANG[1]:
            simpan.append((c, lab))
        else:
            buang += 1
    return simpan, buang


# ============================================================================
# LANGKAH 1 : KONVERSI TIMESHEET -> REKAP ABSENSI RAPI
# ============================================================================
class TableParser(HTMLParser):
    """Mengumpulkan semua tabel: {attrs, rows: [[teks sel, ...], ...], heads: [teks th, ...]}"""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tables = []
        self.stack = []
        self.row = None
        self.cell = None
        self.cell_is_th = False

    def _finish_row(self):
        if self.row is not None and self.stack:
            t = self.stack[-1]
            if self.row["th"] and self.row["th"] == len(self.row["cells"]):
                t["heads"].extend(self.row["cells"])
            elif self.row["cells"]:
                t["rows"].append(self.row["cells"])
        self.row = None

    def handle_starttag(self, tag, attrs):
        if tag == "table":
            self.stack.append({"attrs": dict(attrs), "rows": [], "heads": []})
        elif tag in ("tr", "tbody") and self.stack:
            self._finish_row()          # tutup baris header implisit (th tanpa tr)
            if tag == "tr":
                self.row = {"cells": [], "th": 0}
        elif tag in ("td", "th") and self.stack:
            if self.row is None:        # sistem menulis <th> langsung di <thead> tanpa <tr>
                self.row = {"cells": [], "th": 0}
            self.cell = []
            self.cell_is_th = tag == "th"
        elif tag == "br" and self.cell is not None:
            self.cell.append(" ")

    def handle_data(self, data):
        if self.cell is not None:
            self.cell.append(data)

    def handle_endtag(self, tag):
        if tag in ("td", "th") and self.cell is not None and self.row is not None:
            text = re.sub(r"\s+", " ", "".join(self.cell).replace("\xa0", " ")).strip()
            self.row["cells"].append(text)
            if self.cell_is_th:
                self.row["th"] += 1
            self.cell = None
        elif tag in ("tr", "thead"):
            self._finish_row()
        elif tag == "table" and self.stack:
            self._finish_row()
            self.tables.append(self.stack.pop())


def baca_teks_file(path):
    for enc in ("utf-8", "utf-8-sig", "cp1252", "latin-1"):
        try:
            with open(path, "r", encoding=enc) as f:
                return f.read()
        except UnicodeDecodeError:
            continue
    raise ValueError("Encoding file tidak dikenali")


def parse_timesheet(path):
    raw = baca_teks_file(path)
    if "<table" not in raw.lower():
        raise ValueError(
            "File ini bukan timesheet hasil download sistem (tidak ada tabel HTML). "
            "Kalau ini Excel asli, tidak perlu dikonversi."
        )

    judul = re.search(r"Rekapitulasi Absensi\s*-\s*([^<\r\n]+)", raw)
    proyek = re.search(r"Project\s*:\s*([^<\r\n]+)", raw)
    kode = re.search(r"Payroll Period Code\s*([^<\r\n]+)", raw)
    periode = re.search(r"Periode\s*:\s*(\d{4}-\d{2}-\d{2})\s*-\s*(\d{4}-\d{2}-\d{2})", raw)

    p = TableParser()
    p.feed(raw)
    tabel = None
    for t in p.tables:
        if t["attrs"].get("id") == "list_table":
            tabel = t
            break
    if tabel is None and p.tables:
        tabel = max(p.tables, key=lambda t: len(t["rows"]))
    if tabel is None or not tabel["heads"]:
        raise ValueError("Tabel absensi tidak ditemukan di file")

    heads = tabel["heads"]
    try:
        idx_h = next(i for i in range(3, len(heads)) if heads[i].strip().upper() == "H")
    except StopIteration:
        raise ValueError("Kolom rekap H/I/A/G/O/S/SR/IR tidak ditemukan di header")
    nd = idx_h - 3
    day_labels = heads[3:idx_h]

    emps = []
    cur = None
    for cells in tabel["rows"]:
        first = cells[0].strip() if cells else ""
        if first.lower().startswith("total"):
            continue
        if first.isdigit():
            cur = {
                "nik": cells[1] if len(cells) > 1 else "",
                "jab": cells[2] if len(cells) > 2 else "",
                "codes": (cells[3:3 + nd] + [""] * nd)[:nd],
                "sys": cells[3 + nd:3 + nd + 8],
                "ket": cells[3 + nd + 8] if len(cells) > 3 + nd + 8 else "",
                "nama": "",
                "g": 0,
                "g_hari": [],
            }
            emps.append(cur)
        elif first == "" and cur is not None and not cur["nama"]:
            cur["nama"] = cells[1] if len(cells) > 1 else ""
            bawah = cells[3:3 + nd]
            cur["g_hari"] = [i for i, c in enumerate(bawah) if c.strip().upper() == "G"]
            cur["g"] = len(cur["g_hari"])
    if not emps:
        raise ValueError("Tidak ada data karyawan di file")

    # tanggal tiap kolom
    dates = [None] * nd
    if periode:
        d0 = dt.date.fromisoformat(periode.group(1))
        d1 = dt.date.fromisoformat(periode.group(2))
        rentang = [d0 + dt.timedelta(n) for n in range((d1 - d0).days + 1)]
        for i, lab in enumerate(day_labels):
            if lab.strip().isdigit():
                for d in rentang:
                    if d.day == int(lab):
                        dates[i] = d
                        break
    return {
        "judul": judul.group(1).strip() if judul else "",
        "proyek": proyek.group(1).strip() if proyek else "-",
        "kode": kode.group(1).strip() if kode else "-",
        "periode": (d0, d1) if periode else None,
        "day_labels": day_labels,
        "dates": dates,
        "emps": emps,
    }


def tgl_id(d):
    return "%d %s %d" % (d.day, BLN[d.month - 1], d.year)


def label_hari(data, i):
    """Label tanggal kolom ke-i, sama dengan teks header di file Rekap (mis. 'Kamis 15 Okt')."""
    d = data["dates"][i]
    if d:
        return "%s %d %s" % (HARI[d.weekday()], d.day, BLN[d.month - 1])
    return data["day_labels"][i]


def build_xlsx(data, out_path):
    F = "Arial"
    thin = Side(style="thin", color="999999")
    bd = Border(left=thin, right=thin, top=thin, bottom=thin)
    hdr_fill = PatternFill("solid", fgColor="1F3864")
    tot_fill = PatternFill("solid", fgColor="EDEDED")
    ctr = Alignment(horizontal="center", vertical="center", wrap_text=True)
    lft = Alignment(horizontal="left", vertical="center")

    emps = data["emps"]
    nd = len(data["day_labels"])
    wb = Workbook()
    ws = wb.active
    ws.title = "Rekap Absensi"
    ws.sheet_view.showGridLines = False

    c_day0 = 5
    c_day1 = c_day0 + nd - 1
    c_sum = c_day1 + 1
    c_ket = c_sum + len(SUM_HEAD)
    last = c_ket
    c_g = c_sum + SUM_HEAD.index("Lembur Ganti")

    # judul dan info
    ws["A1"] = "REKAPITULASI ABSENSI"
    ws["A1"].font = Font(name=F, size=16, bold=True)
    if data["periode"]:
        per_txt = "%s s/d %s" % (tgl_id(data["periode"][0]), tgl_id(data["periode"][1]))
    else:
        per_txt = "-"
    for n, (k, v) in enumerate([("Proyek", data["proyek"]),
                                ("Kode Payroll", data["kode"]),
                                ("Periode", per_txt)], start=2):
        ws.cell(n, 1, k).font = Font(name=F, size=10, bold=True)
        ws.cell(n, 3, ":").font = Font(name=F, size=10)
        ws.cell(n, 4, v).font = Font(name=F, size=10)

    # header tabel
    R1, R2 = 6, 7
    for c, h in enumerate(["No", "NIK", "Nama", "Jabatan"], start=1):
        ws.merge_cells(start_row=R1, start_column=c, end_row=R2, end_column=c)
        ws.cell(R1, c, h)
    ws.merge_cells(start_row=R1, start_column=c_day0, end_row=R1, end_column=c_day1)
    ws.cell(R1, c_day0, "Kehadiran Harian")
    ws.merge_cells(start_row=R1, start_column=c_sum, end_row=R1, end_column=c_ket - 1)
    ws.cell(R1, c_sum, "Rekap Total")
    ws.merge_cells(start_row=R1, start_column=c_ket, end_row=R2, end_column=c_ket)
    ws.cell(R1, c_ket, "Keterangan")
    for i in range(nd):
        d = data["dates"][i]
        if d:
            ws.cell(R2, c_day0 + i, "%s\n%d %s" % (HARI[d.weekday()], d.day, BLN[d.month - 1]))
        else:
            ws.cell(R2, c_day0 + i, data["day_labels"][i])
    for i, h in enumerate(SUM_HEAD):
        ws.cell(R2, c_sum + i, h)
    for r in (R1, R2):
        for c in range(1, last + 1):
            x = ws.cell(r, c)
            x.font = Font(name=F, size=10, bold=True, color="FFFFFF")
            x.fill = hdr_fill
            x.alignment = ctr
            x.border = bd
    ws.row_dimensions[R2].height = 32

    # data karyawan
    first = R2 + 1
    for n, e in enumerate(emps):
        r = first + n
        for c, v in enumerate([n + 1, e["nik"], e["nama"], e["jab"]] + e["codes"], start=1):
            ws.cell(r, c, v)
        rng = "%s%d:%s%d" % (L(c_day0), r, L(c_day1), r)
        rumus = [
            '=COUNTIF(%s,"H")' % rng,                          # Hadir (H besar dan h kecil, COUNTIF tidak peka huruf)
            '=SUMPRODUCT(--EXACT(%s,"h"))' % rng,             # BA (h kecil)
            '=COUNTIF(%s,"I")+COUNTIF(%s,"IR")' % (rng, rng),  # Izin
            '=COUNTIF(%s,"S")+COUNTIF(%s,"SR")' % (rng, rng),  # Sakit
            '=COUNTIF(%s,"A")' % rng,                          # Alpa (A / a)
            '=COUNTIF(%s,"O")' % rng,                          # Off
            e["g"],                                            # Lembur Ganti (dari baris bawah sistem)
        ]
        for i, v in enumerate(rumus):
            ws.cell(r, c_sum + i, v)
        ws.cell(r, c_ket, "" if e["ket"] in ("-", "") else e["ket"])
        for c in range(1, last + 1):
            x = ws.cell(r, c)
            x.border = bd
            x.font = Font(name=F, size=10, color="0000FF" if c == c_g else "000000")
            x.alignment = lft if c in (3, 4, c_ket) else ctr
            if n % 2 == 1 and c <= 4:
                x.fill = PatternFill("solid", fgColor="F7F9FC")
        ws.row_dimensions[r].height = 20
    lastrow = first + len(emps) - 1

    # baris total
    tr = lastrow + 1
    ws.merge_cells(start_row=tr, start_column=1, end_row=tr, end_column=c_day1)
    ws.cell(tr, 1, "TOTAL")
    for i in range(len(SUM_HEAD)):
        col = c_sum + i
        ws.cell(tr, col, "=SUM(%s%d:%s%d)" % (L(col), first, L(col), lastrow))
    for c in range(1, last + 1):
        x = ws.cell(tr, c)
        x.font = Font(name=F, size=10, bold=True)
        x.fill = tot_fill
        x.border = bd
        x.alignment = ctr
    ws.row_dimensions[tr].height = 22

    # warna kode kehadiran (H dan h dibedakan)
    dr = "%s%d:%s%d" % (L(c_day0), first, L(c_day1), lastrow)
    tl = "%s%d" % (L(c_day0), first)

    def frule(expr, fill, font):
        ws.conditional_formatting.add(dr, FormulaRule(
            formula=[expr],
            fill=PatternFill("solid", bgColor=fill, fgColor=fill),
            font=Font(name=F, bold=True, color=font)))

    frule('EXACT(%s,"H")' % tl, "C6EFCE", "006100")
    frule('EXACT(%s,"h")' % tl, "DDEBF7", "1F4E78")
    frule('UPPER(%s)="A"' % tl, "FFC7CE", "9C0006")
    frule('UPPER(%s)="O"' % tl, "D9D9D9", "404040")
    frule('OR(UPPER(%s)="I",UPPER(%s)="IR",UPPER(%s)="S",UPPER(%s)="SR")' % (tl, tl, tl, tl),
          "FFEB9C", "7F6000")
    frule('UPPER(%s)="G"' % tl, "E4DFEC", "403151")

    # keterangan kode
    r = tr + 2
    ws.cell(r, 1, "Keterangan Kode").font = Font(name=F, size=10, bold=True)
    legend = ["H = Hadir", "h = BA (dihitung Hadir dan BA Diterima)", "I / IR = Izin", "S / SR = Sakit", "A / a = Alpa", "O = Off",
              "Lembur Ganti = hari Off yang diminta masuk menggantikan (tulisan biru, bisa diubah manual)"]
    for k, tx in enumerate(legend, start=1):
        ws.cell(r + k, 1, tx).font = Font(name=F, size=9)

    # lebar kolom dan pengaturan cetak
    widths = {1: 5, 2: 12, 3: 26, 4: 16}
    for c in range(1, last + 1):
        ws.column_dimensions[L(c)].width = widths.get(c, 10 if c < c_sum else (9 if c < c_ket else 22))
    ws.freeze_panes = ws.cell(first, 4)
    ws.page_setup.orientation = "landscape"
    ws.page_setup.paperSize = ws.PAPERSIZE_A4
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 1
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.print_title_rows = "%d:%d" % (R1, R2)
    ws.page_margins.left = ws.page_margins.right = 0.4
    wb.calculation.fullCalcOnLoad = True

    return simpan_wb(wb, out_path)


def cek_silang_sistem(data):
    """Bandingkan hitungan versi script dengan total bawaan sistem. Mengembalikan daftar peringatan."""
    warn = []
    for e in data["emps"]:
        s = e["sys"]
        if len(s) < 8 or not all(x.replace(".", "", 1).isdigit() for x in s):
            continue
        H, I, A, G, O, S, SR, IR = [int(float(x)) for x in s]
        c = e["codes"]
        mine = {
            "H": sum(1 for x in c if x.upper() == "H"),   # sistem menghitung h (BA) sebagai Hadir
            "I": sum(1 for x in c if x.upper() == "I"),
            "A": sum(1 for x in c if x.upper() == "A"),
            "O": sum(1 for x in c if x.upper() == "O"),
            "S": sum(1 for x in c if x.upper() == "S"),
            "SR": sum(1 for x in c if x.upper() == "SR"),
            "IR": sum(1 for x in c if x.upper() == "IR"),
        }
        theirs = {"H": H, "I": I, "A": A, "O": O, "S": S, "SR": SR, "IR": IR}
        beda = [k for k in mine if mine[k] != theirs[k]]
        if beda:
            warn.append("%s %s: beda di %s (sistem vs hasil)" % (e["nik"], e["nama"], ", ".join(beda)))
    return warn


def cari_file_default():
    folder = os.path.join(BASE_DIR, "input")
    if not os.path.isdir(folder):
        folder = BASE_DIR
    return cari_timesheet_di(folder)


def cari_timesheet_di(folder):
    hasil = []
    for nama in sorted(os.listdir(folder)):
        low = nama.lower()
        if low.endswith((".xls", ".html", ".htm")) and not nama.startswith(("Rekap-Absensi", "~$")):
            hasil.append(os.path.join(folder, nama))
    return hasil


def konversi(path):
    data = parse_timesheet(path)
    akhiran = ""
    if RENTANG:
        data, dipotong = potong_data(data, RENTANG[0], RENTANG[1])
        if dipotong:
            akhiran = "_%s-%s" % (data["periode"][0].strftime("%Y%m%d"), data["periode"][1].strftime("%Y%m%d"))
    os.makedirs(OUT_DIR, exist_ok=True)
    stem = os.path.splitext(os.path.basename(path))[0]
    out = os.path.join(OUT_DIR, "Rekap-Absensi-%s%s.xlsx" % (stem, akhiran))
    out = build_xlsx(data, out)
    return data, out


def langkah_konversi(timesheets):
    """Return (daftar file Rekap hasil, peta tanggal lembur per file, jumlah gagal)."""
    rekaps = []
    g_peta = {}
    gagal = 0
    for f in timesheets:
        print("\nMemproses: %s" % os.path.basename(f))
        try:
            data, out = konversi(f)
        except TidakBeririsan:
            print("  DILEWATI: periode file ini di luar rentang tanggal yang dipilih")
            continue
        except Exception as ex:
            gagal += 1
            print("  GAGAL : %s" % ex)
            continue
        print("  Proyek: %s | Karyawan: %d | Hari: %d" % (data["proyek"], len(data["emps"]), len(data["day_labels"])))
        if data.get("dipotong_dari"):
            print("  Dipotong ke rentang terpilih: %d hari dari %d hari" % (len(data["day_labels"]), data["dipotong_dari"]))
        print("  Hasil : %s" % out)
        for w in cek_silang_sistem(data):
            print("  PERINGATAN: %s" % w)
        rekaps.append(out)
        g_peta[os.path.abspath(out)] = {
            e["nik"]: [label_hari(data, i) for i in e["g_hari"]] for e in data["emps"] if e["g_hari"]
        }
    print("\nLangkah 1 selesai. Berhasil: %d, Gagal: %d" % (len(rekaps), gagal))
    return rekaps, g_peta, gagal


# ============================================================================
# LANGKAH 2 : BUAT SUMMARY ABSENSI (ISI SUMMARY_ABSENSI_TEMPLATE.xlsx)
# ============================================================================
def norm(s):
    s = re.sub(r"[^A-Z0-9]+", " ", str(s).upper())
    return re.sub(r"\s+", " ", s).strip()


def pisah_proyek(teks):
    m = re.match(r"^\s*(\d+)\s*-\s*(.+?)\s*$", teks or "")
    if m:
        return m.group(1), m.group(2)
    return "", (teks or "").strip()


def parse_periode(teks):
    """'15 Okt 2026 s/d 19 Okt 2026' -> (date, date)"""
    m = re.findall(r"(\d{1,2})\s+([A-Za-z]{3})[A-Za-z]*\s+(\d{4})", teks or "")
    if len(m) >= 2:
        try:
            a, b = m[0], m[1]
            d0 = dt.date(int(a[2]), BLN_SHORT[a[1].lower()], int(a[0]))
            d1 = dt.date(int(b[2]), BLN_SHORT[b[1].lower()], int(b[0]))
            return d0, d1
        except (KeyError, ValueError):
            return None
    return None


def angka(v):
    if isinstance(v, bool):
        return 0
    if isinstance(v, (int, float)):
        return v
    if isinstance(v, str) and re.match(r"^\s*-?\d+(\.\d+)?\s*$", v):
        return float(v)
    return 0


def baca_rekap(path):
    wb = load_workbook(path)
    ws = wb["Rekap Absensi"] if "Rekap Absensi" in wb.sheetnames else wb.worksheets[0]

    # cari baris header yang memuat 'Hadir'
    hdr = None
    for r in range(1, 20):
        vals = [str(c.value).strip() if c.value is not None else "" for c in ws[r]]
        if "Hadir" in vals and "Lembur Ganti" in vals:
            hdr = r
            kolom = {v: i + 1 for i, v in enumerate(vals) if v}
            break
    if hdr is None:
        raise ValueError("Header 'Hadir' dan 'Lembur Ganti' tidak ditemukan. "
                         "Pastikan ini file hasil konversi timesheet.")

    # kolom hari: dari kolom setelah 'Jabatan' sampai sebelum 'Hadir'
    c_jab = None
    for r in (hdr - 1, hdr):
        for c in ws[r]:
            if c.value is not None and str(c.value).strip() == "Jabatan":
                c_jab = c.column
    if c_jab is None:
        c_jab = 4
    c_hari = list(range(c_jab + 1, kolom["Hadir"]))
    c_g = kolom["Lembur Ganti"]

    # info proyek dan periode di bagian atas
    proyek_txt, periode_txt = "", ""
    for r in range(1, hdr):
        label = ws.cell(r, 1).value
        if label is None:
            continue
        isi = None
        for c in range(2, 8):
            v = ws.cell(r, c).value
            if v not in (None, "", ":"):
                isi = str(v)
                break
        if str(label).strip() == "Proyek":
            proyek_txt = isi or ""
        elif str(label).strip() == "Periode":
            periode_txt = isi or ""
    kode, nama = pisah_proyek(proyek_txt)

    # potong kolom hari sesuai rentang tanggal yang dipilih
    periode_asli = parse_periode(periode_txt)
    sisa, dibuang = saring_kolom([(c, ws.cell(hdr, c).value) for c in c_hari], periode_asli)
    if c_hari and not sisa:
        raise TidakBeririsan()
    c_hari = [c for c, _ in sisa]

    tot = Counter()
    asing = Counter()
    kosong_n = 0
    mp = 0
    r = hdr + 1
    while isinstance(ws.cell(r, 1).value, (int, float)) and not isinstance(ws.cell(r, 1).value, bool):
        mp += 1
        nik = ws.cell(r, 2).value
        nm = ws.cell(r, 3).value
        for c in c_hari:
            raw = ws.cell(r, c).value
            kd = "" if raw is None else str(raw).strip()
            if kd in KODE_KOSONG:
                if kd:
                    kosong_n += 1
                continue
            up = kd.upper()
            if kd == "H":
                tot["H"] += 1
            elif kd == "h":
                tot["BA"] += 1
                tot["H"] += 1          # h (BA diterima) juga dihitung Hadir
            elif up in ("I", "IR"):
                tot["IZIN"] += 1
            elif up in ("S", "SR"):
                tot["SAKIT"] += 1
            elif up == "A":
                tot["A"] += 1
                if kd == "a":
                    tot["BAT"] += 1    # a kecil = BA ditolak (tetap dihitung Alfa)
            elif up == "O":
                tot["OFF"] += 1
            else:
                asing[(kd, str(nik), str(nm))] += 1
        tot["G"] += angka(ws.cell(r, c_g).value)
        r += 1
    if mp == 0:
        raise ValueError("Tidak ada baris karyawan di file ini")

    # cek silang dengan nilai rumus yang tersimpan di file (kalau sudah pernah dibuka dan disimpan Excel)
    warn = []
    if dibuang and tot["G"]:
        warn.append("Lembur Ganti tidak bisa dipotong per tanggal dari Rekap yang sudah jadi, dihitung penuh")
    try:
        if dibuang:
            raise ValueError("kolom dipotong, cek silang dengan nilai tersimpan dilewati")
        wv = load_workbook(path, data_only=True)
        wsv = wv["Rekap Absensi"] if "Rekap Absensi" in wv.sheetnames else wv.worksheets[0]
        peta = [("Hadir", "H"), ("BA", "BA"), ("Izin", "IZIN"), ("Sakit", "SAKIT"), ("Alpa", "A"), ("Off", "OFF")]
        for judul, kunci in peta:
            col = kolom[judul]
            nilai = [wsv.cell(x, col).value for x in range(hdr + 1, hdr + 1 + mp)]
            if all(v is None for v in nilai):
                continue          # belum ada nilai tersimpan, lewati
            tersimpan = sum(angka(v) for v in nilai)
            if tersimpan != tot[kunci]:
                warn.append("kolom %s di file tersimpan %s, hitungan script %s" % (judul, tersimpan, tot[kunci]))
    except Exception:
        pass

    return {
        "path": path,
        "mtime": os.path.getmtime(path),
        "kode": kode,
        "nama": nama,
        "periode": klip_periode(periode_asli),
        "periode_txt": periode_txt,
        "mp": mp,
        "H": tot["H"], "OFF": tot["OFF"], "G": tot["G"], "A": tot["A"],
        "IZIN": tot["IZIN"], "SAKIT": tot["SAKIT"], "BA": tot["BA"],
        "BAT": tot["BAT"],
        "asing": asing,
        "kosong_n": kosong_n,
        "warn": warn,
    }


def cocokkan(projects, template_names):
    """Return dict: index project -> (index template, cara)."""
    tn = [norm(n) for n in template_names]
    hasil = {}
    pakai = set()

    # 1) alias manual
    alias = {norm(k): v for k, v in ALIAS.items()}
    for i, p in enumerate(projects):
        tujuan = alias.get(norm(p["kode"])) or alias.get(norm(p["nama"]))
        if tujuan and norm(tujuan) in tn:
            j = tn.index(norm(tujuan))
            if j not in pakai:
                hasil[i] = (j, "alias")
                pakai.add(j)

    # 2) nama sama persis
    for i, p in enumerate(projects):
        if i in hasil:
            continue
        n = norm(p["nama"])
        if n in tn:
            j = tn.index(n)
            if j not in pakai:
                hasil[i] = (j, "sama")
                pakai.add(j)

    # 3) mirip (satu lawan satu, mulai dari yang paling mirip)
    kandidat = []
    for i, p in enumerate(projects):
        if i in hasil:
            continue
        for j, t in enumerate(tn):
            if j in pakai:
                continue
            rasio = difflib.SequenceMatcher(None, norm(p["nama"]), t).ratio()
            if rasio >= FUZZY_MIN:
                kandidat.append((rasio, i, j))
    for rasio, i, j in sorted(kandidat, reverse=True):
        if i in hasil or j in pakai:
            continue
        hasil[i] = (j, "mirip %.0f%%" % (rasio * 100))
        pakai.add(j)
    return hasil


def periode_judul(d0, d1):
    if d0.year == d1.year:
        return "%d %s - %d %s %d" % (d0.day, BULAN[d0.month - 1], d1.day, BULAN[d1.month - 1], d1.year)
    return "%d %s %d - %d %s %d" % (d0.day, BULAN[d0.month - 1], d0.year, d1.day, BULAN[d1.month - 1], d1.year)


def isi_template(template_path, baris, d0, d1, belum_ada, out_path):
    wb = load_workbook(template_path, keep_links=False)   # buang link eksternal
    ws = wb.worksheets[0]
    NC = 13                                                # kolom A sampai M
    FIRST = 4

    # Template asli punya 12 kolom (A-L). Kolom baru "BA Ditolak" disisipkan di K,
    # jadi TOTAL HK pindah ke L dan KETERANGAN ke M. Template yang sudah 13 kolom dipakai apa adanya.
    sudah_13 = "DITOLAK" in str(ws.cell(3, 11).value or "").upper()

    def src(c):
        return c if (sudah_13 or c <= 10) else c - 1

    # cari baris GRAND TOTAL dan baris catatan di template
    r_total = None
    for r in range(FIRST, ws.max_row + 1):
        if str(ws.cell(r, 2).value or "").strip().upper() == "GRAND TOTAL":
            r_total = r
            break
    if r_total is None:
        raise ValueError("Baris GRAND TOTAL tidak ditemukan di template")
    r_note = r_total + 2

    # simpan gaya dan tinggi baris dari template
    gaya_body = [copy.copy(ws.cell(FIRST, src(c))._style) for c in range(1, NC + 1)]
    gaya_total = [copy.copy(ws.cell(r_total, src(c))._style) for c in range(1, NC + 1)]
    gaya_note = [copy.copy(ws.cell(r_note, src(c))._style) for c in range(1, NC + 1)]
    gaya_kosong = copy.copy(ws.cell(r_total + 1, 1)._style)
    h_body = ws.row_dimensions[FIRST].height or 19.5
    h_total = ws.row_dimensions[r_total].height or 15.0
    h_note = ws.row_dimensions[r_note].height or 27.0

    # susun ulang judul dan header (baris 1 sampai 3) untuk kolom tambahan
    if not sudah_13:
        lama_style = {(r, c): copy.copy(ws.cell(r, c)._style) for r in (1, 2, 3) for c in range(1, 13)}
        lama_nilai = {c: ws.cell(3, c).value for c in range(1, 13)}
        lama_lebar = {}
        for dim in ws.column_dimensions.values():
            if dim.width:
                for c in range(dim.min or 1, (dim.max or dim.min or 1) + 1):
                    lama_lebar[c] = dim.width
        for rng in list(ws.merged_cells.ranges):
            if rng.min_row == 1:
                ws.unmerge_cells(str(rng))
        for r in (1, 2, 3):
            for c in range(1, NC + 1):
                ws.cell(r, c)._style = copy.copy(lama_style[(r, src(c))])
        for c in range(1, NC + 1):
            if c == 11:
                ws.cell(3, c, "a (BA DITOLAK)")
            elif c == 10:
                ws.cell(3, c, "h (BA DITERIMA)")
            else:
                ws.cell(3, c, lama_nilai[src(c)])
        ws.cell(3, 12, "TOTAL HK\n(H + G)")          # BA (h) sudah termasuk di kolom H
        ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=NC)
        for key in list(ws.column_dimensions.keys()):
            del ws.column_dimensions[key]
        for c in range(1, NC + 1):
            w = lama_lebar.get(src(c))
            if w:
                ws.column_dimensions[L(c)].width = w
        ws.column_dimensions["J"].width = 12       # h (BA DITERIMA)
        ws.column_dimensions["K"].width = 12       # a (BA DITOLAK)

    # lepas merge catatan, bersihkan area isi lama
    for rng in list(ws.merged_cells.ranges):
        if rng.min_row >= FIRST:
            ws.unmerge_cells(str(rng))
    for r in range(FIRST, r_note + 1):
        for c in range(1, NC + 1):
            cell = ws.cell(r, c)
            cell.value = None
            cell._style = copy.copy(gaya_kosong)
        ws.row_dimensions[r].height = None

    # judul periode
    ws["A1"] = "RINGKASAN ABSENSI APLIKASI PERIODE %s" % periode_judul(d0, d1)

    # baris proyek
    n = len(baris)
    for i, b in enumerate(baris):
        r = FIRST + i
        for c in range(1, NC + 1):
            ws.cell(r, c)._style = copy.copy(gaya_body[c - 1])
        ws.cell(r, 1, i + 1)
        ws.cell(r, 2, b["nama_tampil"])
        p = b["data"]
        if p is not None:
            ws.cell(r, 3, p["mp"])
            ws.cell(r, 4, p["H"])
            ws.cell(r, 5, p["OFF"])
            ws.cell(r, 6, p["G"])
            ws.cell(r, 7, p["A"])
            ws.cell(r, 8, p["IZIN"])
            ws.cell(r, 9, p["SAKIT"])
            ws.cell(r, 10, p["BA"])
            ws.cell(r, 11, p["BAT"])
        ws.cell(r, 12, '=IF(COUNT(D%d,F%d)=0,"",D%d+F%d)' % ((r,) * 4))   # BA (h) sudah termasuk di H
        ws.row_dimensions[r].height = h_body

    # grand total
    last = FIRST + n - 1
    rt = FIRST + n
    for c in range(1, NC + 1):
        ws.cell(rt, c)._style = copy.copy(gaya_total[c - 1])
    ws.cell(rt, 2, "GRAND TOTAL")
    for c in range(3, 13):
        col = ws.cell(rt, c).column_letter
        ws.cell(rt, c, "=SUM(%s%d:%s%d)" % (col, FIRST, col, last))
    ws.row_dimensions[rt].height = h_total

    # catatan
    rn = rt + 2
    for c in range(1, NC + 1):
        ws.cell(rn, c)._style = copy.copy(gaya_note[c - 1])
    teks = ("Catatan: H sudah termasuk h (BA diterima), TOTAL HK = H + G, BA ditolak (a) tetap dihitung di Alfa. Angka dihitung dari file Rekap-Absensi masing-masing proyek "
            "(periode %s)." % periode_judul(d0, d1).title())
    if belum_ada:
        sebut = ", ".join(belum_ada[:3])
        if len(belum_ada) > 3:
            sebut += " dan %d proyek lain" % (len(belum_ada) - 3)
        teks += " Belum ada file untuk: %s." % sebut
    ws.cell(rn, 1, teks)
    ws.merge_cells(start_row=rn, start_column=1, end_row=rn, end_column=NC)
    ws.row_dimensions[rn].height = h_note

    wb.calculation.fullCalcOnLoad = True
    return simpan_wb(wb, out_path)


def langkah_summary(files, template):
    """Return path file summary, atau None bila dilewati atau gagal."""
    if not os.path.isfile(template):
        print("\nLangkah 2 DILEWATI: template tidak ditemukan: %s" % template)
        print("Taruh SUMMARY_ABSENSI_TEMPLATE.xlsx satu folder dengan script ini,")
        print("atau pakai --template=PATH. Langkah 3 tetap dilanjutkan.")
        return None

    print("\nMembaca %d file Rekap..." % len(files))
    projects = []
    for f in files:
        try:
            p = baca_rekap(f)
        except TidakBeririsan:
            print("  DILEWATI  %s: periode di luar rentang tanggal yang dipilih" % os.path.basename(f))
            continue
        except Exception as ex:
            print("  GAGAL  %s: %s" % (os.path.basename(f), ex))
            continue
        projects.append(p)
    if not projects:
        print("Langkah 2 gagal: tidak ada Rekap yang bisa dibaca.")
        return None

    # proyek dobel: pakai file terbaru
    unik = {}
    for p in projects:
        kunci = p["kode"] or norm(p["nama"])
        if kunci in unik:
            lama = unik[kunci]
            pilih, buang = (p, lama) if p["mtime"] >= lama["mtime"] else (lama, p)
            print("  PERINGATAN: proyek %s muncul di 2 file. Dipakai: %s, dilewati: %s" % (
                p["nama"], os.path.basename(pilih["path"]), os.path.basename(buang["path"])))
            unik[kunci] = pilih
        else:
            unik[kunci] = p
    projects = list(unik.values())

    # periode
    ada = [p["periode"] for p in projects if p["periode"]]
    if not ada:
        print("Langkah 2 gagal: periode tidak terbaca dari file Rekap.")
        return None
    d0 = min(x[0] for x in ada)
    d1 = max(x[1] for x in ada)
    if len(set(ada)) > 1:
        print("  PERINGATAN: periode antar file tidak sama:")
        for p in projects:
            print("     %-40s %s" % (p["nama"], p["periode_txt"]))

    # cocokkan ke baris template
    cocok = cocokkan(projects, PROYEK_TEMPLATE)
    baris = []
    for j, nama in enumerate(PROYEK_TEMPLATE):
        dp = None
        for i, (jj, cara) in cocok.items():
            if jj == j:
                dp = projects[i]
                if not cara.startswith("sama"):
                    print("  Dicocokkan (%s): \"%s\" -> baris \"%s\"" % (cara, projects[i]["nama"], nama))
        baris.append({"nama_tampil": nama, "data": dp})
    baru = [projects[i] for i in range(len(projects)) if i not in cocok]
    for p in sorted(baru, key=lambda x: x["nama"]):
        print("  Proyek baru ditambahkan di bawah: %s" % p["nama"])
        baris.append({"nama_tampil": p["nama"], "data": p})
    belum_ada = [b["nama_tampil"] for b in baris if b["data"] is None]

    os.makedirs(HASIL_DIR, exist_ok=True)
    out = os.path.join(HASIL_DIR, "SUMMARY_ABSENSI_%s-%s.xlsx" % (d0.strftime("%Y%m%d"), d1.strftime("%Y%m%d")))
    try:
        out = isi_template(template, baris, d0, d1, belum_ada, out)
    except Exception as ex:
        print("Langkah 2 gagal mengisi template: %s" % ex)
        return None

    # ringkasan di layar
    print("\n%-3s %-44s %5s %5s %5s %4s %4s %5s %5s %6s %6s %7s" % (
        "NO", "PROYEK", "MP", "H", "OFF", "G", "A", "IZIN", "SAKIT", "BA(h)", "BA(a)", "TOTALHK"))
    tot = Counter()
    for i, b in enumerate(baris, start=1):
        p = b["data"]
        if p is None:
            print("%-3d %-44s %s" % (i, b["nama_tampil"][:44], "(belum ada file)"))
            continue
        hk = p["H"] + p["G"]          # BA (h) sudah termasuk di H
        print("%-3d %-44s %5d %5d %5d %4d %4d %5d %5d %6d %6d %7d" % (
            i, b["nama_tampil"][:44], p["mp"], p["H"], p["OFF"], p["G"], p["A"], p["IZIN"], p["SAKIT"], p["BA"],
            p["BAT"], hk))
        for k in ("mp", "H", "OFF", "G", "A", "IZIN", "SAKIT", "BA", "BAT"):
            tot[k] += p[k]
        tot["HK"] += hk
    print("%-3s %-44s %5d %5d %5d %4d %4d %5d %5d %6d %6d %7d" % (
        "", "GRAND TOTAL", tot["mp"], tot["H"], tot["OFF"], tot["G"], tot["A"], tot["IZIN"], tot["SAKIT"],
        tot["BA"], tot["BAT"], tot["HK"]))

    # catatan data
    print("")
    for p in projects:
        for (kd, nik, nm), jml in p["asing"].items():
            print("  PERINGATAN: %s: kode '%s' tidak dikenali (%dx) di %s %s, tidak dihitung" % (
                p["nama"], kd, jml, nik, nm))
        for w in p["warn"]:
            print("  PERINGATAN: %s: %s" % (p["nama"], w))
        if p["kosong_n"]:
            print("  Info: %s: %d sel kosong/'[]' diabaikan" % (p["nama"], p["kosong_n"]))
    if belum_ada:
        print("  Belum ada file untuk: %s" % ", ".join(belum_ada))

    print("\nLangkah 2 selesai. Hasil: %s" % out)
    return out


# ============================================================================
# LANGKAH 3 : CEK ABSENSI (ALFA, LEMBUR, SAKIT, IZIN) DENGAN NAMA, NUC, PROJECT
# ============================================================================
def teks_sel(v):
    """Ubah nilai sel jadi string bersih."""
    if v is None:
        return ""
    return re.sub(r"\s+", " ", str(v)).strip()


def cari_project(ws):
    """Ambil nama project dari baris berlabel 'Proyek'."""
    for row in ws.iter_rows(min_row=1, max_row=15):
        label = teks_sel(row[0].value).lower()
        if label.startswith("proyek") or label.startswith("project"):
            for c in row[1:]:
                val = teks_sel(c.value)
                if val and val != ":":
                    # Format umum: "09010106 - CIREBON SUPER BLOK"
                    m = re.match(r"^\s*\d+\s*-\s*(.+)$", val)
                    return m.group(1).strip() if m else val
    return ""


def cari_periode_teks(ws):
    """Ambil teks periode dari baris berlabel 'Periode'."""
    for row in ws.iter_rows(min_row=1, max_row=15):
        if teks_sel(row[0].value).lower().startswith("periode"):
            for c in row[1:]:
                val = teks_sel(c.value)
                if val and val != ":":
                    return val
    return ""


def cari_header(ws):
    """
    Cari baris header tabel (yang berisi NIK/NUC dan Nama).
    Return: (baris_header, kol_nuc, kol_nama, kol_jabatan) dengan indeks mulai 1.
    """
    for row in ws.iter_rows(min_row=1, max_row=30):
        peta = {teks_sel(c.value).upper(): c.column for c in row if teks_sel(c.value)}
        kol_nuc = peta.get("NUC") or peta.get("NIK")
        kol_nama = peta.get("NAMA")
        if kol_nuc and kol_nama:
            return row[0].row, kol_nuc, kol_nama, peta.get("JABATAN")
    return None


def cari_kolom_tanggal(ws, baris_header, kol_mulai):
    """
    Baris tanggal ada tepat di bawah baris header (header bertingkat).
    Return list (indeks_kolom, label_tanggal).
    """
    baris_tgl = baris_header + 1
    hasil = []
    for col in range(kol_mulai, ws.max_column + 1):
        label = teks_sel(ws.cell(baris_tgl, col).value)
        if not label or label.upper() in LABEL_REKAP:
            if hasil:
                break
            continue
        hasil.append((col, label))
    return hasil


def cari_kolom_lembur(ws, baris_header):
    """Cari kolom 'Lembur Ganti' di baris header atau sub-header. Return indeks kolom atau None."""
    for r in (baris_header, baris_header + 1):
        for c in range(1, ws.max_column + 1):
            if teks_sel(ws.cell(r, c).value).upper() == "LEMBUR GANTI":
                return c
    return None


def cek_baca_sheet(ws, nama_file, g_peta=None):
    """Baca satu sheet. Return dict (project, periode_txt, karyawan) atau None bila format tidak cocok."""
    header = cari_header(ws)
    if not header:
        return None
    baris_header, kol_nuc, kol_nama, kol_jabatan = header
    project = cari_project(ws) or Path(nama_file).stem

    kol_awal_tgl = (kol_jabatan or kol_nama) + 1
    kolom_tgl = cari_kolom_tanggal(ws, baris_header, kol_awal_tgl)
    if not kolom_tgl:
        return None
    periode_txt = cari_periode_teks(ws)
    periode_cek = parse_periode(periode_txt)
    kolom_tgl, dibuang = saring_kolom(kolom_tgl, periode_cek)
    if not kolom_tgl:
        raise TidakBeririsan()
    tgl_kol = {c: tanggal_dari_label(lab, periode_cek) for c, lab in kolom_tgl}
    kol_lembur = cari_kolom_lembur(ws, baris_header)

    karyawan = []
    lembur_penuh = False
    for r in range(baris_header + 2, ws.max_row + 1):
        nuc = teks_sel(ws.cell(r, kol_nuc).value)
        nama = teks_sel(ws.cell(r, kol_nama).value)
        # Berhenti di baris TOTAL / keterangan kode / baris kosong
        if not nuc and not nama:
            continue
        if nuc.upper() == "TOTAL" or nuc.lower().startswith("keterangan"):
            break
        if not nama:
            continue
        jabatan = teks_sel(ws.cell(r, kol_jabatan).value) if kol_jabatan else ""

        kejadian = []
        harian = []
        for col, label in kolom_tgl:
            kode_asli = teks_sel(ws.cell(r, col).value)
            harian.append((label, kode_asli, tgl_kol[col]))
            kategori = KODE_MAP.get(kode_asli.upper())
            if kode_asli == "h":         # h = BA diterima (hadir)
                kategori = "BA"
            elif kode_asli == "a":       # a kecil = tetap Alfa, dan juga tercatat sebagai BA ditolak
                kejadian.append((label, kode_asli, "BA"))
            if not kategori:
                continue
            # Bila ada kolom Lembur Ganti, lembur dihitung dari kolom itu saja (hindari hitung ganda)
            if kategori == "LEMBUR" and kol_lembur:
                continue
            kejadian.append((label, kode_asli, kategori))

        if kol_lembur:
            n = int(angka(ws.cell(r, kol_lembur).value))
            if n > 0:
                tanggal = (g_peta or {}).get(nuc, [])
                if len(tanggal) != n:
                    tanggal = ["-"] * n
                    if dibuang:
                        lembur_penuh = True
                for t in tanggal:
                    kejadian.append((t, "G", "LEMBUR"))

        karyawan.append(
            {
                "nuc": nuc,
                "nama": nama,
                "jabatan": jabatan,
                "project": project,
                "kejadian": kejadian,
                "harian": harian,
            }
        )
    if lembur_penuh:
        print("  PERINGATAN: %s: Lembur (G) tidak bisa dipotong per tanggal dari Rekap yang sudah jadi, dihitung penuh" % (
            Path(nama_file).name))
    return {"project": project, "periode_txt": periode_txt, "karyawan": karyawan}


def cek_baca_file(path, g_peta=None):
    """Baca semua sheet pada satu file. Return (list karyawan, teks periode)."""
    wb = load_workbook(path, data_only=True)
    semua = []
    periode_txt = ""
    luar = False
    for ws in wb.worksheets:
        try:
            hasil = cek_baca_sheet(ws, path, g_peta)
        except TidakBeririsan:
            luar = True
            continue
        if hasil:
            semua.extend(hasil["karyawan"])
            periode_txt = periode_txt or hasil["periode_txt"]
    if not semua:
        print("  [LEWATI] %s: %s" % (
            Path(path).name, "periode di luar rentang tanggal yang dipilih" if luar else "format tabel tidak dikenali"))
    return semua, periode_txt


TIPIS = Side(style="thin", color="999999")
BORDER = Border(left=TIPIS, right=TIPIS, top=TIPIS, bottom=TIPIS)
FILL_HEAD = PatternFill("solid", fgColor="1F3864")
FILL_TOTAL = PatternFill("solid", fgColor="D9E1F2")
FILL_KAT = {
    "ALFA": PatternFill("solid", fgColor="F8CBAD"),
    "LEMBUR": PatternFill("solid", fgColor="C6E0B4"),
    "SAKIT": PatternFill("solid", fgColor="FFE699"),
    "IZIN": PatternFill("solid", fgColor="BDD7EE"),
    "BA": PatternFill("solid", fgColor="E4DFEC"),
}


def tulis_tabel(ws, judul, header, baris, lebar, kolom_tengah=(), baris_total=None, kolom_kat=None):
    ws["A1"] = judul
    ws["A1"].font = Font(name=FONT, size=13, bold=True)
    ws["A2"] = "Dibuat: %s" % dt.datetime.now().strftime("%d-%m-%Y %H:%M")
    ws["A2"].font = Font(name=FONT, size=9, italic=True, color="666666")

    r0 = 4
    for i, h in enumerate(header, 1):
        c = ws.cell(r0, i, h)
        c.font = Font(name=FONT, bold=True, color="FFFFFF")
        c.fill = FILL_HEAD
        c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        c.border = BORDER
    ws.row_dimensions[r0].height = 28

    for j, data in enumerate(baris, r0 + 1):
        for i, v in enumerate(data, 1):
            c = ws.cell(j, i, v)
            c.font = Font(name=FONT, size=10)
            c.border = BORDER
            if i in kolom_tengah:
                c.alignment = Alignment(horizontal="center")
        if kolom_kat is not None:
            kat = data[kolom_kat]
            if kat in FILL_KAT:
                ws.cell(j, kolom_kat + 1).fill = FILL_KAT[kat]

    akhir = r0 + len(baris)
    if baris_total:
        j = akhir + 1
        for i, v in enumerate(baris_total, 1):
            c = ws.cell(j, i, v)
            c.font = Font(name=FONT, size=10, bold=True)
            c.fill = FILL_TOTAL
            c.border = BORDER
            if i in kolom_tengah:
                c.alignment = Alignment(horizontal="center")

    for i, w in enumerate(lebar, 1):
        ws.column_dimensions[L(i)].width = w
    ws.freeze_panes = ws.cell(r0 + 1, 1)
    if baris:
        ws.auto_filter.ref = "A%d:%s%d" % (r0, L(len(header)), akhir)


# Satu file Excel per kategori: (kunci kategori, nama di file, kode di sistem)
KATEGORI_FILE = [
    ("ALFA", "ALFA", "A/a"),
    ("SAKIT", "SAKIT", "S/SR"),
    ("IZIN", "IZIN", "I/IR"),
    ("LEMBUR", "LEMBUR", "G/g"),
    ("BA", "BA", "h/a"),
]


def tulis_cek_ba(karyawan, path_out, periode_txt):
    """File BA: h = BA diterima (hadir), a huruf kecil = BA ditolak (alfa)."""
    baris1, baris2 = [], []
    per_project = OrderedDict()
    no1 = no2 = tot_h = tot_a = 0
    for k in karyawan:
        ev = [e for e in k["kejadian"] if e[2] == "BA"]
        if not ev:
            continue
        nh = sum(1 for e in ev if e[1] == "h")
        na = len(ev) - nh
        no1 += 1
        tgl = ["%s (%s)" % (e[0], e[1]) for e in ev]
        baris1.append([no1, k["nuc"], k["nama"], k["jabatan"], k["project"], nh, na, len(ev), ", ".join(tgl)])
        for t, kode, _ in ev:
            no2 += 1
            status = "BA DITERIMA (HADIR)" if kode == "h" else "BA DITOLAK (ALFA)"
            baris2.append([no2, k["nuc"], k["nama"], k["jabatan"], k["project"], t, kode, status])
        pp = per_project.setdefault(k["project"], [0, 0, 0])
        pp[0] += 1
        pp[1] += nh
        pp[2] += na
        tot_h += nh
        tot_a += na

    judul = "DAFTAR BA (h = DITERIMA/HADIR, a = DITOLAK/ALFA)"
    if periode_txt:
        judul += " PERIODE %s" % periode_txt

    wb = Workbook()

    ws1 = wb.active
    ws1.title = "Summary Karyawan"
    tulis_tabel(
        ws1, judul,
        ["No", "NUC", "Nama", "Jabatan", "Project", "BA Diterima (h)", "BA Ditolak (a)", "Total BA", "Tanggal"],
        baris1,
        [6, 14, 30, 18, 28, 16, 16, 10, 60],
        kolom_tengah=(1, 2, 6, 7, 8),
        baris_total=["TOTAL", "", "", "", "", tot_h, tot_a, tot_h + tot_a, ""],
    )
    if not baris1:
        ws1["A3"] = "Tidak ada data BA pada periode ini."
        ws1["A3"].font = Font(name=FONT, size=10, italic=True, color="9C0006")

    ws2 = wb.create_sheet("Detail Kejadian")
    tulis_tabel(
        ws2, "DETAIL BA",
        ["No", "NUC", "Nama", "Jabatan", "Project", "Tanggal", "Kode", "Status"],
        baris2,
        [6, 14, 30, 18, 28, 16, 8, 24],
        kolom_tengah=(1, 2, 6, 7),
    )

    ws3 = wb.create_sheet("Summary Project")
    baris3 = [[i, nama_p, v[0], v[1], v[2], v[1] + v[2]] for i, (nama_p, v) in enumerate(per_project.items(), 1)]
    tulis_tabel(
        ws3, "SUMMARY BA PER PROJECT",
        ["No", "Project", "Jumlah Karyawan", "BA Diterima (h)", "BA Ditolak (a)", "Total BA"],
        baris3,
        [6, 34, 16, 16, 16, 12],
        kolom_tengah=(1, 3, 4, 5, 6),
        baris_total=["TOTAL", "", sum(v[0] for v in per_project.values()), tot_h, tot_a, tot_h + tot_a],
    )

    path_out = simpan_wb(wb, path_out)
    return path_out, len(baris1), tot_h + tot_a


POLA_KATEGORI = {"A": "ALFA", "S": "SAKIT", "SR": "SAKIT", "I": "IZIN", "IR": "IZIN"}


def hitung_pola(karyawan, kat):
    """
    Cari pola yang perlu ditindaklanjuti untuk kategori ALFA, SAKIT, atau IZIN:
      Beruntun      : kategori sama minimal POLA_MIN_BERUNTUN hari berturut-turut
      Mengapit Off  : kategori sama tepat sebelum dan sesudah hari Off (mis. A, O, A)
      Sering        : jumlah kejadian minimal POLA_MIN_FREKUENSI dalam periode
    Hari yang tampaknya belum final (HARI_BELUM_FINAL) dianggap tidak diketahui.
    Return list baris [No, NUC, Nama, Jabatan, Project, Jumlah, Pola, Detail].
    """
    hasil = []
    for k in karyawan:
        harian = k.get("harian") or []
        seq = []
        for label, kode, tgl in harian:
            if tgl is not None and tgl in HARI_BELUM_FINAL:
                seq.append((label, None, None))
            else:
                seq.append((label, POLA_KATEGORI.get(kode.upper()), kode.upper()))
        jumlah = sum(1 for _, kt, _ in seq if kt == kat)
        if not jumlah:
            continue
        pola, detail = [], []

        i = 0
        while i < len(seq):
            if seq[i][1] == kat:
                j = i
                while j + 1 < len(seq) and seq[j + 1][1] == kat:
                    j += 1
                n = j - i + 1
                if n >= POLA_MIN_BERUNTUN:
                    if "Beruntun" not in pola:
                        pola.append("Beruntun")
                    detail.append("Beruntun %d hari: %s s/d %s" % (n, seq[i][0], seq[j][0]))
                i = j + 1
            else:
                i += 1

        idx = [x for x, (_, kt, _) in enumerate(seq) if kt == kat]
        for a, b in zip(idx, idx[1:]):
            tengah = seq[a + 1:b]
            if tengah and all(kd == "O" for _, _, kd in tengah):
                if "Mengapit Off" not in pola:
                    pola.append("Mengapit Off")
                detail.append("Mengapit Off: %s (%s), Off %d hari, %s (%s)" % (
                    seq[a][0], seq[a][2], len(tengah), seq[b][0], seq[b][2]))

        if jumlah >= POLA_MIN_FREKUENSI:
            pola.append("Sering")
            detail.append("%d kali dalam periode" % jumlah)

        if pola:
            hasil.append((len(pola), jumlah, k, "; ".join(pola), " | ".join(detail)))
    hasil.sort(key=lambda x: (-x[0], -x[1], x[2]["project"], x[2]["nama"]))
    return [[n, k["nuc"], k["nama"], k["jabatan"], k["project"], jml, pola, detail]
            for n, (_, jml, k, pola, detail) in enumerate(hasil, 1)]


def tulis_cek_kategori(karyawan, kat, kode_txt, path_out, periode_txt):
    """Tulis satu file Excel yang isinya hanya satu kategori. Return (path, jumlah karyawan, total kejadian)."""
    if kat == "BA":
        return tulis_cek_ba(karyawan, path_out, periode_txt)
    baris1, baris2 = [], []
    per_project = OrderedDict()
    no1 = no2 = total = 0
    for k in karyawan:
        ev = [e for e in k["kejadian"] if e[2] == kat]
        if not ev:
            continue
        no1 += 1
        tgl = [e[0] for e in ev if e[0] != "-"]
        baris1.append([no1, k["nuc"], k["nama"], k["jabatan"], k["project"], len(ev),
                       ", ".join(tgl) if tgl else "-"])
        for t, kode, _ in ev:
            no2 += 1
            baris2.append([no2, k["nuc"], k["nama"], k["jabatan"], k["project"], t, kode])
        pp = per_project.setdefault(k["project"], [0, 0])
        pp[0] += 1
        pp[1] += len(ev)
        total += len(ev)

    judul = "DAFTAR %s (%s)" % (kat, kode_txt)
    if periode_txt:
        judul += " PERIODE %s" % periode_txt

    wb = Workbook()

    ws1 = wb.active
    ws1.title = "Summary Karyawan"
    tulis_tabel(
        ws1, judul,
        ["No", "NUC", "Nama", "Jabatan", "Project", "Jumlah", "Tanggal"],
        baris1,
        [6, 14, 30, 18, 28, 10, 50],
        kolom_tengah=(1, 2, 6),
        baris_total=["TOTAL", "", "", "", "", total, ""],
    )
    if not baris1:
        ws1["A3"] = "Tidak ada data %s pada periode ini." % kat
        ws1["A3"].font = Font(name=FONT, size=10, italic=True, color="9C0006")

    ws2 = wb.create_sheet("Detail Kejadian")
    tulis_tabel(
        ws2, "DETAIL %s (%s)" % (kat, kode_txt),
        ["No", "NUC", "Nama", "Jabatan", "Project", "Tanggal", "Kode"],
        baris2,
        [6, 14, 30, 18, 28, 16, 8],
        kolom_tengah=(1, 2, 6, 7),
    )

    ws3 = wb.create_sheet("Summary Project")
    baris3 = [[i, nama_p, v[0], v[1]] for i, (nama_p, v) in enumerate(per_project.items(), 1)]
    tulis_tabel(
        ws3, "SUMMARY %s PER PROJECT" % kat,
        ["No", "Project", "Jumlah Karyawan", "Total Kejadian"],
        baris3,
        [6, 34, 16, 16],
        kolom_tengah=(1, 3, 4),
        baris_total=["TOTAL", "", sum(v[0] for v in per_project.values()), total],
    )

    if kat in ("ALFA", "SAKIT", "IZIN"):
        baris4 = hitung_pola(karyawan, kat)
        ws4 = wb.create_sheet("Perlu Tindak Lanjut")
        judul4 = "POLA %s YANG PERLU TINDAK LANJUT" % kat
        if periode_txt:
            judul4 += " PERIODE %s" % periode_txt
        tulis_tabel(
            ws4, judul4,
            ["No", "NUC", "Nama", "Jabatan", "Project", "Jumlah", "Pola", "Detail"],
            baris4,
            [6, 14, 30, 18, 28, 10, 26, 90],
            kolom_tengah=(1, 2, 6),
        )
        if baris4:
            catatan = ("Pola: Beruntun (minimal %d hari berturut-turut), Mengapit Off (kategori sama sebelum dan "
                       "sesudah hari Off), Sering (minimal %d kejadian)." % (POLA_MIN_BERUNTUN, POLA_MIN_FREKUENSI))
            warna = "666666"
        else:
            catatan = "Tidak ada pola yang terdeteksi pada periode ini."
            warna = "006100"
        if HARI_BELUM_FINAL:
            catatan += " Tanggal yang belum final diabaikan: %s." % ", ".join(
                tgl_id(d) for d in sorted(HARI_BELUM_FINAL))
        ws4["A3"] = catatan
        ws4["A3"].font = Font(name=FONT, size=9, italic=True, color=warna)
        for j in range(5, 5 + len(baris4)):
            ws4.cell(j, 8).alignment = Alignment(wrap_text=True, vertical="top")

    path_out = simpan_wb(wb, path_out)
    return path_out, len(baris1), total


def langkah_cek(files, g_peta_semua):
    """Buat 5 file Excel (Alfa, Sakit, Izin, Lembur, BA). Return daftar (kategori, path, karyawan, kejadian) atau None."""
    print("\nMembaca %d file Rekap untuk cek absensi..." % len(files))
    karyawan = []
    periode_ada = []
    for f in files:
        print("Membaca: %s" % os.path.basename(f))
        data, periode_txt = cek_baca_file(f, g_peta_semua.get(os.path.abspath(f)))
        print("  %d karyawan" % len(data))
        karyawan.extend(data)
        for proyek_f in {k["project"] for k in data}:
            PAKET_CTX["rekap"].setdefault(proyek_f, f)
        pr = klip_periode(parse_periode(periode_txt))
        if pr:
            periode_ada.append(pr)
    if not karyawan:
        print("Langkah 3 gagal: tidak ada data karyawan yang terbaca.")
        return None

    if periode_ada:
        d0 = min(x[0] for x in periode_ada)
        d1 = max(x[1] for x in periode_ada)
        stempel = "%s-%s" % (d0.strftime("%Y%m%d"), d1.strftime("%Y%m%d"))
        periode_txt = periode_judul(d0, d1)
    else:
        stempel = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
        periode_txt = ""

    os.makedirs(HASIL_DIR, exist_ok=True)
    PAKET_CTX["karyawan"], PAKET_CTX["periode_txt"], PAKET_CTX["stempel"] = karyawan, periode_txt, stempel
    hasil = []
    print("\nLangkah 3 selesai. %d karyawan dibaca. File per kategori:" % len(karyawan))
    for kat, nama_file, kode_txt in KATEGORI_FILE:
        out = os.path.join(HASIL_DIR, "CEK_%s_%s.xlsx" % (nama_file, stempel))
        out, jml, total = tulis_cek_kategori(karyawan, kat, kode_txt, out, periode_txt)
        hasil.append((kat, out, jml, total))
        print("  %-7s (%-4s): %3d karyawan, %3d kejadian -> %s" % (
            kat, kode_txt, jml, total, os.path.basename(out)))
    print("\nPola yang perlu tindak lanjut (sheet 'Perlu Tindak Lanjut' di file CEK_ALFA, CEK_SAKIT, CEK_IZIN):")
    for kt in ("ALFA", "SAKIT", "IZIN"):
        print("  %-7s : %3d karyawan" % (kt, len(hitung_pola(karyawan, kt))))
    return hasil


# ============================================================================
# LANGKAH 4 : PAKET KIRIM PER PIC PROYEK
# ============================================================================
PAKET_CTX = {"karyawan": [], "periode_txt": "", "stempel": "", "rekap": {}}


def nama_aman(teks):
    """Nama proyek menjadi nama file/folder yang aman di Windows."""
    t = re.sub(r'[\\/:*?"<>|]+', "-", teks or "")
    t = re.sub(r"\s+", " ", t).strip(" .")
    return t or "PROYEK"


def hitung_ringkasan_karyawan(karyawan):
    """Per karyawan: jumlah Alfa, Sakit, Izin, Lembur, BA diterima, BA ditolak. Hanya yang punya kejadian."""
    baris = []
    for k in karyawan:
        c = Counter()
        for _, kode, kat in k["kejadian"]:
            if kat == "BA":
                c["BA_h" if kode == "h" else "BA_a"] += 1
            else:
                c[kat] += 1
        if any(c.values()):
            baris.append((k, c))
    baris.sort(key=lambda x: (-(x[1]["ALFA"]), -(x[1]["SAKIT"] + x[1]["IZIN"]), x[0]["nama"]))
    return baris


def tulis_paket_excel(proyek, karyawan, periode_txt, path_out):
    """Satu workbook per proyek: Ringkasan, Detail Kejadian, Perlu Tindak Lanjut. Return (path, tindak_lanjut)."""
    ringkas = hitung_ringkasan_karyawan(karyawan)

    # Pola tindak lanjut gabungan Alfa, Sakit, Izin
    tl_baris, tl_nuc = [], set()
    for kat in ("ALFA", "SAKIT", "IZIN"):
        for r in hitung_pola(karyawan, kat):
            tl_nuc.add((r[1], r[2]))
            tl_baris.append([0, r[1], r[2], r[3], kat, r[5], r[6], r[7]])
    urut = {"ALFA": 0, "SAKIT": 1, "IZIN": 2}
    tl_baris.sort(key=lambda x: (urut[x[4]], -x[5], x[2]))
    for i, r in enumerate(tl_baris, 1):
        r[0] = i

    r1 = []
    tot = Counter()
    for i, (k, c) in enumerate(ringkas, 1):
        flag = "YA" if (k["nuc"], k["nama"]) in tl_nuc else "-"
        r1.append([i, k["nuc"], k["nama"], k["jabatan"], c["ALFA"], c["SAKIT"], c["IZIN"],
                   c["LEMBUR"], c["BA_h"], c["BA_a"], flag])
        for key in ("ALFA", "SAKIT", "IZIN", "LEMBUR", "BA_h", "BA_a"):
            tot[key] += c[key]

    r2, no = [], 0
    for k in karyawan:
        for t, kode, kat in k["kejadian"]:
            no += 1
            if kat == "BA":
                ket = "BA diterima (hadir)" if kode == "h" else "BA ditolak (alfa)"
            else:
                ket = ""
            r2.append([no, k["nuc"], k["nama"], k["jabatan"], kat, t, kode, ket])
    urut_kat = {"ALFA": 0, "SAKIT": 1, "IZIN": 2, "LEMBUR": 3, "BA": 4}
    r2.sort(key=lambda x: (urut_kat.get(x[4], 9), x[2], str(x[5])))
    for i, r in enumerate(r2, 1):
        r[0] = i

    suffix = " PERIODE %s" % periode_txt if periode_txt else ""
    wb = Workbook()
    ws1 = wb.active
    ws1.title = "Ringkasan"
    tulis_tabel(
        ws1, "RINGKASAN ABSENSI - %s%s" % (proyek, suffix),
        ["No", "NUC", "Nama", "Jabatan", "Alfa", "Sakit", "Izin", "Lembur", "BA Diterima (h)",
         "BA Ditolak (a)", "Perlu Tindak Lanjut"],
        r1, [6, 14, 30, 20, 8, 8, 8, 10, 16, 16, 20],
        kolom_tengah=(1, 2, 5, 6, 7, 8, 9, 10, 11),
        baris_total=["TOTAL", "", "%d karyawan dari %d" % (len(r1), len(karyawan)), "",
                     tot["ALFA"], tot["SAKIT"], tot["IZIN"], tot["LEMBUR"], tot["BA_h"], tot["BA_a"],
                     "%d orang" % len(tl_nuc)],
    )
    if not r1:
        ws1["A3"] = "Tidak ada Alfa, Sakit, Izin, Lembur, atau BA pada periode ini."
        ws1["A3"].font = Font(name=FONT, size=10, italic=True, color="006100")
    for j in range(5, 5 + len(r1)):
        if ws1.cell(j, 11).value == "YA":
            ws1.cell(j, 11).fill = FILL_KAT["ALFA"]
            ws1.cell(j, 11).font = Font(name=FONT, size=10, bold=True)

    ws2 = wb.create_sheet("Detail Kejadian")
    tulis_tabel(
        ws2, "DETAIL KEJADIAN - %s%s" % (proyek, suffix),
        ["No", "NUC", "Nama", "Jabatan", "Kategori", "Tanggal", "Kode", "Keterangan"],
        r2, [6, 14, 30, 20, 12, 16, 8, 24],
        kolom_tengah=(1, 2, 5, 6, 7), kolom_kat=4,
    )

    ws3 = wb.create_sheet("Perlu Tindak Lanjut")
    tulis_tabel(
        ws3, "PERLU TINDAK LANJUT - %s%s" % (proyek, suffix),
        ["No", "NUC", "Nama", "Jabatan", "Kategori", "Jumlah", "Pola", "Detail"],
        tl_baris, [6, 14, 30, 20, 12, 10, 26, 90],
        kolom_tengah=(1, 2, 6), kolom_kat=4,
    )
    if tl_baris:
        ws3["A3"] = ("Mohon PIC memeriksa dan memberi klarifikasi untuk karyawan di bawah ini. Pola: Beruntun (minimal %d hari), "
                     "Mengapit Off, Sering (minimal %d kejadian)." % (POLA_MIN_BERUNTUN, POLA_MIN_FREKUENSI))
        ws3["A3"].font = Font(name=FONT, size=9, italic=True, color="666666")
    else:
        ws3["A3"] = "Tidak ada pola yang perlu ditindaklanjuti pada periode ini."
        ws3["A3"].font = Font(name=FONT, size=9, italic=True, color="006100")
    for j in range(5, 5 + len(tl_baris)):
        ws3.cell(j, 8).alignment = Alignment(wrap_text=True, vertical="top")

    path_out = simpan_wb(wb, path_out)
    return path_out, tl_baris, tot, len(r1)


def susun_pesan(proyek, periode_txt, jml_karyawan, tot, tl_baris):
    """Draft pesan siap tempel (WhatsApp/email) untuk PIC proyek."""
    baris = ["Selamat siang Bapak/Ibu PIC %s," % proyek, ""]
    baris.append("Berikut kami kirimkan rekap absensi%s." % (" periode %s" % periode_txt if periode_txt else ""))
    baris.append("")
    baris.append("RINGKASAN (total karyawan terdata: %d)" % jml_karyawan)
    baris.append("- Alfa   : %d hari" % tot["ALFA"])
    baris.append("- Sakit  : %d hari" % tot["SAKIT"])
    baris.append("- Izin   : %d hari" % tot["IZIN"])
    baris.append("- Lembur : %d hari" % tot["LEMBUR"])
    baris.append("- BA     : %d diterima, %d ditolak" % (tot["BA_h"], tot["BA_a"]))
    baris.append("")
    if tl_baris:
        per = OrderedDict()
        for _, nuc, nama, _, kat, jml, pola, _ in tl_baris:
            per.setdefault((nuc, nama), []).append("%s %dx (%s)" % (kat.capitalize(), jml, pola))
        baris.append("PERLU KLARIFIKASI (%d karyawan):" % len(per))
        for i, ((nuc, nama), v) in enumerate(per.items(), 1):
            if i > 15:
                baris.append("- dan %d karyawan lainnya (lihat file Excel, sheet Perlu Tindak Lanjut)" % (len(per) - 15))
                break
            baris.append("%d. %s (%s): %s" % (i, nama, nuc, "; ".join(v)))
        baris.append("")
        baris.append("Mohon dikonfirmasi alasan ketidakhadiran karyawan di atas beserta bukti pendukungnya "
                     "(surat dokter, surat izin, atau BA) paling lambat 2 hari kerja setelah pesan ini diterima.")
    else:
        baris.append("Tidak ada pola absensi yang perlu ditindaklanjuti pada periode ini.")
    if HARI_BELUM_FINAL:
        baris.append("")
        baris.append("Catatan: data tanggal %s tampaknya belum final di sistem, sehingga Alfa pada tanggal tersebut bisa "
                     "berubah." % ", ".join(tgl_id(d) for d in sorted(HARI_BELUM_FINAL)))
    baris += ["", "Detail lengkap ada pada file Excel terlampir. Terima kasih.", "", "Salam,", "HRD & Personalia PT Peduli Cepat Internasional"]
    return "\n".join(baris) + "\n"


def langkah_paket():
    """Buat folder + ZIP per proyek berisi Excel ringkasan, Rekap proyek, dan draft pesan. Return daftar hasil."""
    import shutil
    import zipfile
    karyawan = PAKET_CTX["karyawan"]
    if not karyawan:
        print("Langkah 4 dilewati: tidak ada data karyawan dari langkah 3.")
        return None
    periode_txt, stempel = PAKET_CTX["periode_txt"], PAKET_CTX["stempel"]
    root = os.path.join(HASIL_DIR, "PAKET_PIC_%s" % stempel)
    os.makedirs(root, exist_ok=True)

    per_proyek = OrderedDict()
    for k in karyawan:
        per_proyek.setdefault(k["project"], []).append(k)

    hasil = []
    print("\nLangkah 4: membuat paket untuk %d proyek di %s" % (len(per_proyek), root))
    for proyek, daftar in per_proyek.items():
        aman = nama_aman(proyek)
        folder = os.path.join(root, aman)
        os.makedirs(folder, exist_ok=True)
        berkas = []

        xlsx, tl_baris, tot, n_kejadian = tulis_paket_excel(
            proyek, daftar, periode_txt, os.path.join(folder, "ABSENSI_%s_%s.xlsx" % (aman, stempel)))
        berkas.append(xlsx)

        rekap = PAKET_CTX["rekap"].get(proyek)
        if rekap and os.path.isfile(rekap):
            tujuan = os.path.join(folder, os.path.basename(rekap))
            shutil.copyfile(rekap, tujuan)
            berkas.append(tujuan)

        pesan = os.path.join(folder, "PESAN_%s.txt" % aman)
        with open(pesan, "w", encoding="utf-8-sig") as fh:
            fh.write(susun_pesan(proyek, periode_txt, len(daftar), tot, tl_baris))
        berkas.append(pesan)

        zip_path = os.path.join(root, "%s_%s.zip" % (aman, stempel))
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for b in berkas:
                zf.write(b, arcname=os.path.join(aman, os.path.basename(b)))

        n_tl = len({(r[1], r[2]) for r in tl_baris})
        hasil.append((proyek, folder, zip_path, len(daftar), n_tl))
        print("  %-42s %3d karyawan, %2d perlu tindak lanjut -> %s" % (
            proyek[:42], len(daftar), n_tl, os.path.basename(zip_path)))
    return hasil


# ============================================================================
# MAIN : MENJALANKAN KEEMPAT LANGKAH BERURUTAN
# ============================================================================
def kumpulkan_sumber(args):
    """Pisahkan argumen menjadi timesheet (perlu dikonversi) dan Rekap (sudah jadi)."""
    timesheets, rekaps = [], []
    for a in args:
        if os.path.isdir(a):
            ts = cari_timesheet_di(a)
            if ts:
                timesheets.extend(ts)
            else:
                rekaps.extend(sorted(glob.glob(os.path.join(a, "Rekap-Absensi-*.xlsx"))))
        elif os.path.isfile(a):
            low = a.lower()
            if low.endswith((".xls", ".html", ".htm")):
                timesheets.append(a)
            elif low.endswith(".xlsx") and not os.path.basename(a).startswith("~$"):
                rekaps.append(a)
            else:
                print("Dilewati (jenis file tidak dikenali): %s" % a)
        else:
            print("Dilewati (tidak ditemukan): %s" % a)
    rekaps = [f for f in rekaps if not os.path.basename(f).startswith("~$")]
    return timesheets, rekaps


def buka_folder_hasil(no_open):
    if os.name == "nt" and not no_open:
        try:
            os.startfile(HASIL_DIR)
        except Exception:
            pass


def main():
    global RENTANG, HARI_BELUM_FINAL
    argv = sys.argv[1:]
    args = [a for a in argv if not a.startswith("--")]
    template = TEMPLATE_DEFAULT
    for a in argv:
        if a.startswith("--template="):
            template = a.split("=", 1)[1].strip('"')
    no_open = "--no-open" in argv
    semua = "--semua" in argv
    dari_arg = sampai_arg = None
    for a in argv:
        if a.startswith("--dari="):
            dari_arg = a.split("=", 1)[1].strip('"')
        elif a.startswith("--sampai="):
            sampai_arg = a.split("=", 1)[1].strip('"')

    print("=" * 64)
    print("  PROSES ABSENSI : KONVERSI -> SUMMARY -> CEK ABSENSI -> PAKET PIC")
    print("=" * 64)

    if args:
        timesheets, rekap_langsung = kumpulkan_sumber(args)
    else:
        timesheets, rekap_langsung = cari_file_default(), []
        if not timesheets:
            rekap_langsung = sorted(glob.glob(os.path.join(HASIL_DIR, "Rekap-Absensi-*.xlsx")))
            if rekap_langsung:
                print("\nTidak ada timesheet baru. Memakai Rekap yang sudah ada di folder hasil.")

    if not timesheets and not rekap_langsung:
        print("\nTidak ada file untuk diproses.")
        print("Drag and drop file timesheet (.xls) ke proses_absensi.bat,")
        print("atau taruh file .xls di folder 'input' lalu jalankan lagi.")
        return 1

    # RENTANG TANGGAL
    sumber = [(os.path.basename(f), periode_timesheet_cepat(f)) for f in timesheets]
    sumber += [(os.path.basename(f), periode_rekap_cepat(f)) for f in rekap_langsung]
    belum_final = analisis_hari_berjalan(timesheets) if timesheets else {}
    RENTANG = tentukan_rentang(sumber, dari_arg, sampai_arg, semua, belum_final)
    HARI_BELUM_FINAL = {d for d in belum_final if RENTANG is None or RENTANG[0] <= d <= RENTANG[1]}

    # LANGKAH 1
    print("\n" + "-" * 64)
    print("LANGKAH 1 dari 4 : KONVERSI TIMESHEET")
    print("-" * 64)
    rekaps, g_peta, gagal = [], {}, 0
    if timesheets:
        rekaps, g_peta, gagal = langkah_konversi(timesheets)
    else:
        print("Tidak ada timesheet untuk dikonversi, langkah 1 dilewati.")
    for f in rekap_langsung:
        if os.path.abspath(f) not in {os.path.abspath(x) for x in rekaps}:
            rekaps.append(f)
    if not rekaps:
        print("\nTidak ada file Rekap yang berhasil dibuat. Proses dihentikan.")
        return 2

    # LANGKAH 2
    print("\n" + "-" * 64)
    print("LANGKAH 2 dari 4 : BUAT SUMMARY")
    print("-" * 64)
    out_summary = langkah_summary(rekaps, template)

    # LANGKAH 3
    print("\n" + "-" * 64)
    print("LANGKAH 3 dari 4 : CEK ABSENSI")
    print("-" * 64)
    out_cek = langkah_cek(rekaps, g_peta)

    # LANGKAH 4
    out_paket = None
    if "--tanpa-paket" not in argv:
        print("\n" + "-" * 64)
        print("LANGKAH 4 dari 4 : PAKET KIRIM PER PIC PROYEK")
        print("-" * 64)
        out_paket = langkah_paket() if out_cek else None

    # RINGKASAN AKHIR
    print("\n" + "=" * 64)
    print("  SELESAI. Semua hasil ada di folder: %s" % HASIL_DIR)
    print("=" * 64)
    if RENTANG:
        print("  Rentang tanggal  : %s s/d %s" % (tgl_id(RENTANG[0]), tgl_id(RENTANG[1])))
    if HARI_BELUM_FINAL:
        print("  PERHATIAN        : %s ikut terhitung tetapi tampaknya belum final, Alfa pada tanggal itu bisa berlebih" % (
            ", ".join(tgl_id(d) for d in sorted(HARI_BELUM_FINAL))))
    print("  Rekap per proyek : %d file (Rekap-Absensi-*.xlsx)" % len(rekaps))
    print("  Summary proyek   : %s" % (os.path.basename(out_summary) if out_summary else "(tidak dibuat)"))
    if out_cek:
        for kat, path, _, _ in out_cek:
            print("  Cek %-7s      : %s" % (kat, os.path.basename(path)))
    else:
        print("  Cek absensi      : (tidak dibuat)")
    if out_paket:
        print("  Paket per PIC    : %d proyek (folder PAKET_PIC_*, tiap proyek ada folder dan ZIP)" % len(out_paket))

    buka_folder_hasil(no_open)
    if gagal or out_cek is None:
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
