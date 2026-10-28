# Penyesuaian Gaya Bahasa Indonesia Natural (Bahasa HRD Operasional)

Menyelaraskan seluruh teks antarmuka, label tombol, notifikasi peringatan, keterangan kolom, dan draf pesan di aplikasi agar menggunakan bahasa Indonesia yang wajar, luwes, dan lazim dipakai oleh tim HRD/Personalia operasional di lapangan—menghilangkan istilah kaku hasil terjemahan mesin atau gaya bahasa robotik AI.

## Review Pengguna & Keputusan Kunci

> [!IMPORTANT]
> Keputusan gaya bahasa berikut telah dikonfirmasi bersama pengguna pada Fase 1:

- **Keputusan 1 (Nada Bicara)**: Menggunakan gaya bahasa **HRD operasional yang luwes, praktis, dan profesional**—tidak kaku seperti terjemahan harfiah, namun tetap tertib administrasi kantor.
- **Keputusan 2 (Istilah Teknis)**: Mempertahankan istilah kerja yang sudah menjadi standar dan lazim dipahami tim HRD di lapangan, seperti *Timesheet*, *Rekap*, *Summary*, *NUC/NIK*, *Manpower (MP)*, *Unduh*, *Salin*, *Draf Pesan*, *Hari Berjalan*, dan *Off*.
- **Keputusan 3 (Pembersihan Gaya Bahasa AI)**: Mengeliminasi frasa mekanis/robotik seperti *"Anomali Real-Time"*, *"Executive Summary Widget"*, *"Telemetry"*, *"Pemberitahuan Sistem"*, dan menggantinya dengan istilah wajar seperti *"Catatan Ketidakhadiran"*, *"Ringkasan Operasional"*, dan *"Perlu Tindak Lanjut"*.

---

## 1. Ringkasan Perubahan Bahasa per Komponen

### A. Header & Navigasi Utama (`Header.tsx`)
- Judul: **Proses Absensi & Paket PIC Proyek** (sub: *HRD & Personalia PT Peduli Cepat Internasional*).
- Tab langkah kerja:
  1. `1. Konversi Timesheet`
  2. `2. Summary Proyek` (dengan label santai `[Belum ada template]` jika dilewati)
  3. `3. Cek Ketidakhadiran`
  4. `4. Paket PIC Proyek`
- Tombol:
  - `Coba Pakai Data Contoh` (menggantikan "Muat Contoh Data")
  - `Unduh Semua Berkas (ZIP)` (menggantikan "Unduh Master ZIP")
  - `Mulai Ulang` (menggantikan "Mulai Baru")

### B. Area Unggah Berkas & Template (`FileUploadZone.tsx`)
- Kotak timesheet:
  - *"Tarik file timesheet ke sini, atau klik untuk pilih file"*
  - *"Bisa langsung pilih banyak file sekaligus (file .xls atau .html hasil unduhan sistem)."*
- Kotak template:
  - Label: *"Template Summary Proyek"*
  - Status: *"Sudah Terpasang"* vs *"Opsional"*
  - Keterangan: *"Kalau template belum ada, langkah 2 otomatis dilewati dan lanjut ke langkah 3."*
  - Tombol: *"Ganti Template"* / *"Unggah Template"* & *"Unduh Format Template"*

### C. Pengaturan Rentang Tanggal & Peringatan Hari Berjalan (`DateRangeControl.tsx`)
- *"Periode Absensi Terbaca"* (menggantikan "Periode Terdeteksi Sistem")
- Peringatan hari berjalan:
  - *"Perhatian: Tanggal [tanggal] tampaknya belum ditutup oleh sistem (hari berjalan). [X] dari [Y] kode A di tanggal tersebut belum dihitung oleh total bawaan sistem, jadi kemungkinan besar belum tentu Alfa sungguhan. Tanggal akhir otomatis diarahkan ke tanggal final terakhir ([tanggal])."*
- Tombol toggle: *"Proses Seluruh Hari Apa Adanya"* (menggantikan "Proses Seluruh Periode (--semua)")

### D. Banner Ringkasan & Grafik (`AttendanceAnalyticsBanner.tsx`)
- Judul: *"Ringkasan Kehadiran & Catatan Khusus"* (sub: *"Gambaran kehadiran dan catatan ketidakhadiran dari [X] proyek yang sedang diproses."*)
- Kartu KPI:
  - *Total Karyawan* (MP)
  - *Alfa* (A / a)
  - *Sakit* (S / SR)
  - *Izin* (I / IR)
  - *Lembur Ganti* (G)
  - *BA Diterima / Ditolak* (h / a)
- Kartu ringkasan samping:
  - Judul: *"Ringkasan Operasional"*
  - *Persentase Kehadiran* (*% Hadir*)
  - *Karyawan Terdata*
  - *Lokasi Proyek*
  - *Lama Periode* (*X Hari*)
  - *Total Hari Hadir*
  - *"Daftar Proyek & Jumlah Orang"*

### E. Langkah 1 — Konversi Timesheet (`StepKonversiView.tsx`)
- Kotak peringatan selisih: *"Catatan Perbedaan dengan Total Bawaan Sistem ([X] data)"*
- Tombol unduh: *"Unduh Rekap (.xlsx)"*
- Legenda tabel: bahasa singkat dan jelas (*Hadir, BA diterima, Izin, Sakit, Alfa, Libur/Off, Lembur Ganti*).

### F. Langkah 2 — Summary Proyek (`StepSummaryView.tsx`)
- Peringatan template: *"Langkah 2 dilewati karena file template summary belum diunggah. Kalau ingin membuat file summary, silakan pakai template bawaan atau unggah template Anda sendiri."*
- Tombol: *"Pakai Template Bawaan"* & *"Unduh SUMMARY_ABSENSI.xlsx"*
- Keterangan pencocokan proyek: *Sama Persis, Alias, Mirip X%, Proyek Tambahan, Belum Ada File*.

### G. Langkah 3 — Cek Ketidakhadiran & Pencarian (`StepCekAbsensiView.tsx`)
- Bilah cari: *"Ketik nama karyawan, NIK, jabatan, atau proyek untuk mencari..."*
- Filter dropdown: *"Pilih Kategori: Semua di [Kategori], Alfa (A/a), Sakit (S/SR), Izin (I/IR), Lembur (G), BA Diterima (h), BA Ditolak (a)"*
- Keterangan kriteria pola: *"Kriteria Pola: Beruntun (minimal 3 hari berturut-turut), Mengapit Off (kategori sama sebelum dan sesudah hari libur), Sering (minimal 3 kali kejadian)."*
- Tampilan kosong: *"Tidak ada data yang cocok dengan kata kunci '[kata kunci]'."* tombol: *"Reset Pencarian"*.

### H. Langkah 4 — Paket PIC Proyek (`StepPaketPicView.tsx`)
- Deskripsi: *"Tiap paket proyek berisi: file Excel absensi proyek, file rekap kehadiran, dan draf pesan siap kirim ke PIC."*
- Status: *"[X] Orang Perlu Klarifikasi"* vs *"Tidak Ada Catatan Khusus"*
- Tombol: *"Salin Draf Pesan"*, *"Lihat Pesan"*, *"Unduh ZIP Proyek"*, *"Unduh Semua Paket PIC (ZIP)"*.
- Modal preview draf pesan: *"Draf Pesan WhatsApp untuk PIC: [Nama Proyek]"*.

### I. Halaman Beranda / Tampilan Awal (`App.tsx`)
- Kartu panduan awal:
  - Judul: *"Alur Kerja Pengolahan Absensi Lapangan"*
  - Keterangan: *"Tarik file timesheet unduhan sistem absensi ke kotak di atas, atau coba langsung pakai data contoh untuk melihat seluruh alur kerjanya."*
  - 4 langkah: ringkas, komunikatif, dan jelas bagi staf HRD.

---

## 2. Rencana Eksekusi

1. **Perbarui Teks Komponen Presentasi**:
   - `src/components/Header.tsx`
   - `src/components/FileUploadZone.tsx`
   - `src/components/DateRangeControl.tsx`
   - `src/components/AttendanceAnalyticsBanner.tsx`
   - `src/components/StepKonversiView.tsx`
   - `src/components/StepSummaryView.tsx`
   - `src/components/StepCekAbsensiView.tsx`
   - `src/components/StepPaketPicView.tsx`
2. **Perbarui Teks Halaman Utama (`src/App.tsx`)**:
   - Menyelaraskan teks judul, panduan awal, notifikasi proses, dan catatan kaki.
3. **Verifikasi Kompilasi & Lint**:
   - Jalankan `lint_applet` dan `compile_applet` untuk menjamin tidak ada kesalahan sintaks dan aplikasi berjalan lancar.
