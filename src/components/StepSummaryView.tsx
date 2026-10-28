import React, { useState } from "react";
import { Download, AlertCircle, CheckCircle } from "lucide-react";
import { RekapProjectData, PROYEK_TEMPLATE } from "../types/attendance";
import { cocokkan, periodeJudul } from "../utils/attendanceEngine";
import { buildSummaryXlsx, downloadBlob } from "../utils/excelExporter";

interface StepSummaryViewProps {
  projects: RekapProjectData[];
  d0: Date;
  d1: Date;
  templateLoaded: boolean;
  onActivateDefaultTemplate: () => void;
}

export const StepSummaryView: React.FC<StepSummaryViewProps> = ({
  projects,
  d0,
  d1,
  templateLoaded,
  onActivateDefaultTemplate,
}) => {
  const [downloading, setDownloading] = useState(false);

  const cocok = cocokkan(projects, PROYEK_TEMPLATE);

  const rows: {
    namaTampil: string;
    data: RekapProjectData | null;
    status: string;
  }[] = [];

  PROYEK_TEMPLATE.forEach((nama, j) => {
    let dp: RekapProjectData | null = null;
    let status = "belum ada";
    Object.keys(cocok).forEach(iStr => {
      const i = parseInt(iStr, 10);
      if (cocok[i][0] === j) {
        dp = projects[i];
        status = cocok[i][1];
      }
    });
    rows.push({ namaTampil: nama, data: dp, status });
  });

  projects.forEach((p, i) => {
    if (!(i in cocok)) {
      rows.push({ namaTampil: p.nama, data: p, status: "proyek baru" });
    }
  });

  const grandTotal = {
    mp: 0,
    H: 0,
    OFF: 0,
    G: 0,
    A: 0,
    IZIN: 0,
    SAKIT: 0,
    BA: 0,
    BAT: 0,
    HK: 0,
  };

  rows.forEach(r => {
    if (r.data) {
      grandTotal.mp += r.data.mp;
      grandTotal.H += r.data.H;
      grandTotal.OFF += r.data.OFF;
      grandTotal.G += r.data.G;
      grandTotal.A += r.data.A;
      grandTotal.IZIN += r.data.IZIN;
      grandTotal.SAKIT += r.data.SAKIT;
      grandTotal.BA += r.data.BA;
      grandTotal.BAT += r.data.BAT;
      grandTotal.HK += r.data.H + r.data.G;
    }
  });

  const handleDownloadSummary = async () => {
    setDownloading(true);
    try {
      const blob = await buildSummaryXlsx(projects, d0, d1);
      const stempel = `${d0.toISOString().slice(0, 10).replace(/-/g, "")}-${d1.toISOString().slice(0, 10).replace(/-/g, "")}`;
      downloadBlob(blob, `SUMMARY_ABSENSI_${stempel}.xlsx`);
    } catch (err) {
      console.error(err);
      alert("Gagal mengunduh Summary: " + (err as Error).message);
    } finally {
      setDownloading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "sama") {
      return (
        <span className="text-[10px] text-emerald-700 font-medium">
          Sama Persis
        </span>
      );
    }
    if (status === "alias") {
      return (
        <span className="text-[10px] text-blue-700 font-medium">
          Nama Alias
        </span>
      );
    }
    if (status.startsWith("mirip")) {
      return (
        <span className="text-[10px] text-indigo-700 font-medium">
          {status.replace("mirip", "Mirip")}
        </span>
      );
    }
    if (status === "proyek baru") {
      return (
        <span className="text-[10px] text-purple-700 font-medium">
          Proyek Tambahan
        </span>
      );
    }
    return (
      <span className="text-[10px] text-slate-400 italic">
        Belum Ada File
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {!templateLoaded && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">
                Langkah 2 dilewati karena file template summary belum dimasukkan.
              </p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Jika ingin membuat rekap summary proyek, Anda bisa pakai format standar bawaan atau unggah template Anda sendiri.
              </p>
            </div>
          </div>
          <button
            onClick={onActivateDefaultTemplate}
            className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 shadow-2xs cursor-pointer"
          >
            Gunakan Format Standar
          </button>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              REKAP SUMMARY ABSENSI SELURUH PROYEK - PERIODE {periodeJudul(d0, d1).toUpperCase()}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Format rekap 13 kolom standar, mencakup kehadiran, lembur ganti, serta BA diterima (h) dan ditolak (a).
            </p>
          </div>

          <button
            onClick={handleDownloadSummary}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            {downloading ? "Sedang membuat file..." : "Unduh SUMMARY_ABSENSI.xlsx"}
          </button>
        </div>

        <div className="overflow-x-auto max-h-[550px]">
          <table className="w-full text-xs text-left border-collapse font-sans">
            <thead className="bg-[#1F3864] text-white sticky top-0 z-10 select-none">
              <tr>
                <th className="px-2.5 py-2 border border-slate-400 text-center w-10">NO</th>
                <th className="px-3 py-2 border border-slate-400 text-left min-w-[240px]">
                  PROJECT / LOKASI KERJA
                </th>
                <th className="px-2 py-2 border border-slate-400 text-center w-12">MP</th>
                <th className="px-2 py-2 border border-slate-400 text-center w-12">H</th>
                <th className="px-2 py-2 border border-slate-400 text-center w-12">OFF</th>
                <th className="px-2 py-2 border border-slate-400 text-center w-12">G</th>
                <th className="px-2 py-2 border border-slate-400 text-center w-12">A</th>
                <th className="px-2 py-2 border border-slate-400 text-center w-12">IZIN</th>
                <th className="px-2 py-2 border border-slate-400 text-center w-12">SAKIT</th>
                <th className="px-2 py-2 border border-slate-400 text-center w-20 bg-sky-950">
                  h (BA DITERIMA)
                </th>
                <th className="px-2 py-2 border border-slate-400 text-center w-20 bg-rose-950">
                  a (BA DITOLAK)
                </th>
                <th className="px-2 py-2 border border-slate-400 text-center w-20 bg-blue-950 font-bold">
                  TOTAL HK<br /><span className="text-[10px] font-normal">(H + G)</span>
                </th>
                <th className="px-3 py-2 border border-slate-400 text-left min-w-[100px]">
                  PENCAPAIAN
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map((r, idx) => {
                const p = r.data;
                const hk = p ? p.H + p.G : null;

                return (
                  <tr
                    key={idx}
                    className={
                      p
                        ? idx % 2 === 1
                          ? "bg-slate-50/50 hover:bg-blue-50/30"
                          : "bg-white hover:bg-blue-50/30"
                        : "bg-slate-100/50 text-slate-400"
                    }
                  >
                    <td className="px-2.5 py-1.5 border border-slate-200 text-center font-mono text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-1.5 border border-slate-200 font-medium">
                      <div className="flex items-center justify-between gap-2">
                        <span className={p ? "text-slate-900 font-semibold" : "text-slate-400"}>
                          {r.namaTampil}
                        </span>
                        {getStatusBadge(r.status)}
                      </div>
                    </td>
                    <td className="px-2 py-1.5 border border-slate-200 text-center font-mono tabular-nums">
                      {p ? p.mp : "-"}
                    </td>
                    <td className="px-2 py-1.5 border border-slate-200 text-center font-mono tabular-nums font-medium text-emerald-800">
                      {p ? p.H : "-"}
                    </td>
                    <td className="px-2 py-1.5 border border-slate-200 text-center font-mono tabular-nums">
                      {p ? p.OFF : "-"}
                    </td>
                    <td className="px-2 py-1.5 border border-slate-200 text-center font-mono tabular-nums text-blue-700 font-bold">
                      {p ? p.G : "-"}
                    </td>
                    <td className="px-2 py-1.5 border border-slate-200 text-center font-mono tabular-nums font-bold text-rose-800">
                      {p ? p.A : "-"}
                    </td>
                    <td className="px-2 py-1.5 border border-slate-200 text-center font-mono tabular-nums">
                      {p ? p.IZIN : "-"}
                    </td>
                    <td className="px-2 py-1.5 border border-slate-200 text-center font-mono tabular-nums">
                      {p ? p.SAKIT : "-"}
                    </td>
                    <td className="px-2 py-1.5 border border-slate-200 text-center font-mono tabular-nums font-bold text-sky-800 bg-sky-50/40">
                      {p ? p.BA : "-"}
                    </td>
                    <td className="px-2 py-1.5 border border-slate-200 text-center font-mono tabular-nums font-bold text-rose-800 bg-rose-50/40">
                      {p ? p.BAT : "-"}
                    </td>
                    <td className="px-2 py-1.5 border border-slate-200 text-center font-mono tabular-nums font-bold text-blue-900 bg-blue-50/40">
                      {hk !== null ? hk : "-"}
                    </td>
                    <td className="px-3 py-1.5 border border-slate-200 text-[11px] text-slate-500">
                      {p ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700">
                          <CheckCircle className="w-3 h-3" />
                          Siap Rekap
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Menunggu data</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-200 font-bold text-slate-900 border-t-2 border-slate-400">
              <tr>
                <td className="px-2.5 py-2 border border-slate-300 text-center"></td>
                <td className="px-3 py-2 border border-slate-300 font-bold text-center">
                  GRAND TOTAL
                </td>
                <td className="px-2 py-2 border border-slate-300 text-center font-mono tabular-nums">
                  {grandTotal.mp}
                </td>
                <td className="px-2 py-2 border border-slate-300 text-center font-mono tabular-nums text-emerald-900">
                  {grandTotal.H}
                </td>
                <td className="px-2 py-2 border border-slate-300 text-center font-mono tabular-nums">
                  {grandTotal.OFF}
                </td>
                <td className="px-2 py-2 border border-slate-300 text-center font-mono tabular-nums text-blue-900">
                  {grandTotal.G}
                </td>
                <td className="px-2 py-2 border border-slate-300 text-center font-mono tabular-nums text-rose-900">
                  {grandTotal.A}
                </td>
                <td className="px-2 py-2 border border-slate-300 text-center font-mono tabular-nums">
                  {grandTotal.IZIN}
                </td>
                <td className="px-2 py-2 border border-slate-300 text-center font-mono tabular-nums">
                  {grandTotal.SAKIT}
                </td>
                <td className="px-2 py-2 border border-slate-300 text-center font-mono tabular-nums text-sky-900">
                  {grandTotal.BA}
                </td>
                <td className="px-2 py-2 border border-slate-300 text-center font-mono tabular-nums text-rose-900">
                  {grandTotal.BAT}
                </td>
                <td className="px-2 py-2 border border-slate-300 text-center font-mono tabular-nums text-blue-950">
                  {grandTotal.HK}
                </td>
                <td className="px-3 py-2 border border-slate-300"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-600 leading-relaxed">
          <strong>Catatan:</strong> Kolom H sudah mencakup h (BA diterima). Total HK adalah penjumlahan Hadir + Lembur Ganti (H + G). BA yang ditolak (a) tetap dihitung sebagai Alfa. Angka diambil dari file Rekap-Absensi masing-masing proyek (periode {periodeJudul(d0, d1)}).
        </div>
      </div>
    </div>
  );
};
