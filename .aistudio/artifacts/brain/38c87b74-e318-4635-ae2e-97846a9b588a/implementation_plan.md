# Visualisasi Data Absensi Real-Time dengan Recharts

Integrasi modul visualisasi analitik berbasis Recharts yang menampilkan distribusi kategori absensi (Alfa, Sakit, Izin, Lembur, dan BA) secara real-time berdasarkan data timesheet yang diproses dan rentang tanggal yang dipilih.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following design decisions were confirmed with the user in Phase 1:

- **Confirmed Decision 1 (Chart Architecture)**: Dual-chart visual layout featuring:
  1. **Donut Chart**: Menampilkan proporsi persentase dan total kejadian keseluruhan (Alfa, Sakit, Izin, Lembur, dan BA) dengan metrik total di bagian tengah (*donut hole*).
  2. **Bar Chart Per Proyek**: Menampilkan perbandingan distribusi anomali absensi untuk masing-masing lokasi/proyek kerja (Alfa vs Sakit vs Izin vs Lembur).
- **Confirmed Decision 2 (Placement & Layout)**: Diletakkan sebagai **Top Analytics Banner** di atas tab navigasi 4 langkah pemrosesan data, sehingga pengguna langsung mendapatkan *executive summary* visual seketika setelah timesheet dimuat atau tanggal disesuaikan.
- **Confirmed Decision 3 (Zero Logic Interference)**: Perhitungan data visualisasi bersumber langsung dari `rekapProjects` dan `effectiveTimesheets` yang sudah teruji, menjamin sinkronisasi 100% dengan angka pada tabel dan file Excel yang diekspor.

---

## 1. Overview & Core Concept

- **What It Does**: Menyajikan ringkasan visual tingkat tinggi (*executive overview*) mengenai pola ketidakhadiran karyawan di seluruh lokasi kerja secara langsung di halaman utama.
- **Target Audience**: Manajemen HRD & Operasional yang perlu mengevaluasi tren anomali absensi antar proyek tanpa harus menelusuri baris tabel satu per satu.
- **Key Value**: Mengubah ratusan baris data mentah timesheet menjadi wawasan grafis yang intuitif dan interaktif dalam hitungan milidetik, dengan tooltip presisi, filter tanggal real-time, dan kartu metrik KPI terpadu.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Auto-Display Saat Data Dimuat**:
   - Begitu file timesheet diunggah atau tombol *"Muat Contoh Data"* ditekan, banner analitik Recharts langsung muncul di atas tab langkah kerja.
   - Ringkasan KPI strip menampilkan 5 metrik utama: Manpower Terdata, Total Alfa, Total Sakit, Total Izin, Total Lembur, dan Total BA.
2. **Dual-Chart Interactive Panel**:
   - **Sisi Kiri (Donut Chart)**:
     - Donut proporsi dengan radius proporsional, menampilkan persentase dan jumlah masing-masing kategori absensi.
     - Pusat donut menampilkan total akumulasi ketidakhadiran dengan tipografi tabular.
     - Legenda unboxed dengan penanda warna semantik domain HR yang konsisten.
   - **Sisi Kanan (Bar Chart Per Proyek)**:
     - Diagram batang terkelompok (*grouped bar chart*) membandingkan frekuensi Alfa, Sakit, Izin, dan Lembur di tiap lokasi proyek.
     - Hover tooltip interaktif menampilkan rincian angka eksak per kategori.
3. **Sinkronisasi Filter Tanggal Real-Time**:
   - Jika pengguna mengubah *Dari Tanggal* atau *Sampai Tanggal* pada kontrol periode, kedua grafik dan seluruh KPI langsung diperbarui otomatis tanpa *page refresh*.

### Visual Identity & Palette Alignment

- **SaaS Dashboard Theme** (`references/3_saas_dashboard.md`):
  - Canvas: Background putih `#FFFFFF` dengan bingkai hairline `#E2E8F0` dan radius `rounded-xl`.
  - Konsistensi Warna Semantik (sesuai token Excel dan identitas domain absensi):
    - **Alfa**: Rose Red (`#E11D48`, fill `#FFE4E6`)
    - **Sakit**: Warm Amber (`#D97706`, fill `#FEF3C7`)
    - **Izin**: Sky Blue (`#0284C7`, fill `#E0F2FE`)
    - **Lembur**: Royal Purple (`#7C3AED`, fill `#EDE9FE`)
    - **BA (Diterima / Ditolak)**: Slate / Teal (`#0D9488`, fill `#CCFBF1`)
  - Tipografi: Angka menggunakan tabular figures (`font-variant-numeric: tabular-nums` / `font-mono`) untuk mencegah pergeseran tata letak (*layout shift*).

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Library Recharts**:
  - *Chosen Approach*: Memasang dan memanfaatkan package `recharts` (`PieChart`, `Pie`, `Cell`, `BarChart`, `Bar`, `XAxis`, `YAxis`, `Tooltip`, `Legend`, `ResponsiveContainer`).
  - *Why*: Standar industri untuk React, rendering SVG murni yang tajam, mendukung animasi transisi halus, dan sangat responsif terhadap berbagai ukuran layar.
- **Decision 2: Seamless Integration with Existing State**:
  - *Chosen Approach*: Komponen visualisasi (`AttendanceAnalyticsBanner.tsx`) menerima props langsung dari `rekapProjects` yang telah dihitung oleh `attendanceEngine.ts`.
  - *Why*: Tidak ada duplikasi logika kalkulasi; integritas data antara grafik, tabel ringkasan, dan ekspor file Excel selalu identik.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        App.tsx (State Controller)                      │
│                                                                        │
│  effectiveTimesheets (sliced) ──► rekapProjects (MP, H, A, S, I, G, BA)│
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│             AttendanceAnalyticsBanner.tsx (New Component)              │
│                                                                        │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ Top KPI Summary Strip:                                             │ │
│ │ [Manpower: 17] [Alfa: 5] [Sakit: 4] [Izin: 3] [Lembur: 3] [BA: 3]  │ │
│ ├──────────────────────────────────┬─────────────────────────────────┤ │
│ │ 1. Donut Chart (Distribution)    │ 2. Grouped Bar Chart            │ │
│ │    • PieChart & Pie with Cells   │    • BarChart per Project       │ │
│ │    • Center Total Metric Display │    • Alfa vs Sakit vs Izin vs G │ │
│ │    • Clean Unboxed Legend        │    • Interactive SVG Tooltips   │ │
│ └──────────────────────────────────┴─────────────────────────────────┘ │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│             Step Navigation Tabs (1. Konversi, 2. Summary, etc.)       │
└────────────────────────────────────────────────────────────────────────┘
```

### Steps for Execution

1. **Install Package**: Pasang dependensi `recharts` via `install_applet_package`.
2. **Create Component `src/components/AttendanceAnalyticsBanner.tsx`**:
   - Memformat data dari `RekapProjectData[]` ke format serial Recharts (`name`, `value`, `fill`).
   - Merender KPI strip, Donut Chart untuk distribusi global, dan Bar Chart komparatif per proyek kerja.
   - Menggunakan `ResponsiveContainer` agar tampil proporsional di desktop dan tablet.
3. **Integrate into `src/App.tsx`**:
   - Sisipkan `<AttendanceAnalyticsBanner />` tepat di atas navigasi tab ketika `hasData === true`.
4. **Compile & Lint Verification**:
   - Jalankan `lint_applet` dan `compile_applet` untuk memastikan tipe data TypeScript valid dan build lulus tanpa kendala.
