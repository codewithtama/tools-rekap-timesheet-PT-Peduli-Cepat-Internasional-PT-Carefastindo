import React from "react";
import {
  FileSpreadsheet,
  Layers,
  Search,
  Send,
  Sparkles,
  ArrowRight,
} from "lucide-react";

interface EmptyStateGuideProps {
  onLoadSample: () => void;
}

export const EmptyStateGuide: React.FC<EmptyStateGuideProps> = ({ onLoadSample }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 text-center shadow-xs">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-900 flex items-center justify-center mx-auto shadow-2xs">
          <FileSpreadsheet className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Alur Praktis Rekap Absensi &amp; PIC Lapangan
          </h2>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            Tarik file timesheet (.xls hasil unduh dari sistem absensi) di atas untuk langsung mengolah data rekap, cek silang ketidakhadiran, dan menyiapkan draf pesan untuk PIC proyek.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left pt-4">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
            <div className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4" />
              1. Konversi Timesheet
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Ubah timesheet mentah dari sistem menjadi <code>Rekap-Absensi-*.xlsx</code> lengkap dengan rumus otomatis dan format siap pakai.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
            <div className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
              <Layers className="w-4 h-4" />
              2. Rekap Summary Proyek
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Gabungkan semua data proyek ke dalam format summary 13 kolom, lengkap dengan Grand Total dan pengecekan nama proyek.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
            <div className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
              <Search className="w-4 h-4" />
              3. Cek Ketidakhadiran
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Periksa catatan Alfa, Sakit, Izin, Lembur, serta Berita Acara (BA), lengkap dengan deteksi pola absensi berulang.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
            <div className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
              <Send className="w-4 h-4" />
              4. Paket PIC Proyek
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Otomatis menghasilkan arsip per proyek berisi file Excel rekap dan draf pesan yang tinggal disalin ke WhatsApp PIC.
            </p>
          </div>
        </div>

        <div className="pt-4 flex items-center justify-center gap-3">
          <button
            onClick={onLoadSample}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            Coba Pakai Contoh Data
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
};

