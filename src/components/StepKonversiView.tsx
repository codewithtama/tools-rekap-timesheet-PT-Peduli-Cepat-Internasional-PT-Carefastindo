import React, { useState } from "react";
import { Download, AlertTriangle, ChevronDown, ChevronRight, Eye } from "lucide-react";
import { TimesheetData } from "../types/attendance";
import { tglId, labelHari } from "../utils/attendanceEngine";
import { buildRekapXlsx, downloadBlob } from "../utils/excelExporter";

interface StepKonversiViewProps {
  timesheets: TimesheetData[];
}

export const StepKonversiView: React.FC<StepKonversiViewProps> = ({ timesheets }) => {
  const [selectedId, setSelectedId] = useState<string>(timesheets[0]?.id || "");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const selectedTimesheet = timesheets.find(t => t.id === selectedId) || timesheets[0];

  const handleDownload = async (ts: TimesheetData) => {
    setDownloadingId(ts.id);
    try {
      const blob = await buildRekapXlsx(ts);
      const stem = ts.fileName.replace(/\.[^/.]+$/, "");
      const akhiran = ts.dipotong_dari && ts.periode
        ? `_${ts.periode[0].toISOString().slice(0, 10).replace(/-/g, "")}-${ts.periode[1].toISOString().slice(0, 10).replace(/-/g, "")}`
        : "";
      downloadBlob(blob, `Rekap-Absensi-${stem}${akhiran}.xlsx`);
    } catch (err) {
      console.error(err);
      alert("Gagal mengunduh Excel: " + (err as Error).message);
    } finally {
      setDownloadingId(null);
    }
  };

  const getCodeBadgeClass = (code: string) => {
    const up = (code || "").toUpperCase();
    if (code === "H") return "bg-emerald-100 text-emerald-800 font-semibold";
    if (code === "h") return "bg-sky-100 text-sky-800 font-bold border border-sky-300"; // BA diterima
    if (up === "A") return "bg-rose-100 text-rose-800 font-bold";
    if (up === "O") return "bg-slate-200 text-slate-700";
    if (up === "I" || up === "IR" || up === "S" || up === "SR")
      return "bg-amber-100 text-amber-800 font-medium";
    if (up === "G") return "bg-purple-100 text-purple-800 font-bold";
    return "text-slate-500";
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards & Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {timesheets.map(ts => {
          const isSelected = ts.id === selectedTimesheet?.id;
          const hasWarn = ts.warnings && ts.warnings.length > 0;
          return (
            <div
              key={ts.id}
              onClick={() => setSelectedId(ts.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                isSelected
                  ? "border-blue-900 bg-blue-50/40 shadow-xs ring-1 ring-blue-900"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-[11px] font-mono text-slate-500 font-medium truncate">
                  {ts.fileName}
                </span>
                {hasWarn && (
                  <span
                    title={`${ts.warnings?.length} selisih dengan sistem`}
                    className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-sm shrink-0"
                  >
                    <AlertTriangle className="w-3 h-3" />
                    {ts.warnings?.length} Warning
                  </span>
                )}
              </div>

              <h4 className="text-xs font-bold text-slate-900 line-clamp-1 mb-1">
                {ts.proyek}
              </h4>

              <div className="text-[11px] text-slate-600 flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                <span>
                  <strong>{ts.emps.length}</strong> karyawan · <strong>{ts.day_labels.length}</strong> hari
                </span>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    handleDownload(ts);
                  }}
                  disabled={downloadingId === ts.id}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-900 hover:text-blue-700 hover:underline"
                >
                  <Download className="w-3 h-3" />
                  {downloadingId === ts.id ? "Membuat..." : "Unduh Excel"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Timesheet Detail & Interactive Table */}
      {selectedTimesheet && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          {/* Header Bar */}
          <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  {selectedTimesheet.proyek}
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  ({selectedTimesheet.kode})
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Periode:{" "}
                {selectedTimesheet.periode
                  ? `${tglId(selectedTimesheet.periode[0])} s/d ${tglId(selectedTimesheet.periode[1])}`
                  : "-"}{" "}
                · File: {selectedTimesheet.fileName}
                {selectedTimesheet.dipotong_dari && (
                  <span className="text-blue-700 font-medium ml-1">
                    (Dipotong ke {selectedTimesheet.day_labels.length} hari dari {selectedTimesheet.dipotong_dari} hari)
                  </span>
                )}
              </p>
            </div>

            <button
              onClick={() => handleDownload(selectedTimesheet)}
              disabled={downloadingId === selectedTimesheet.id}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-lg transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              {downloadingId === selectedTimesheet.id
                ? "Menyiapkan Excel..."
                : `Unduh Rekap-Absensi-${selectedTimesheet.fileName.replace(/\.[^/.]+$/, "")}.xlsx`}
            </button>
          </div>

          {/* System Warning Discrepancies if any */}
          {selectedTimesheet.warnings && selectedTimesheet.warnings.length > 0 && (
            <div className="p-3 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                Peringatan Perbedaan Cek Silang Bawaan Sistem ({selectedTimesheet.warnings.length} data):
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800 pl-1 max-h-28 overflow-y-auto font-mono">
                {selectedTimesheet.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Data Table */}
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-xs text-left border-collapse font-sans">
              <thead className="bg-[#1F3864] text-white sticky top-0 z-10 select-none">
                <tr>
                  <th rowSpan={2} className="px-2.5 py-2 border border-slate-400 text-center w-10">
                    No
                  </th>
                  <th rowSpan={2} className="px-3 py-2 border border-slate-400 text-center w-28">
                    NIK / NUC
                  </th>
                  <th rowSpan={2} className="px-3 py-2 border border-slate-400 text-left min-w-[180px]">
                    Nama Karyawan
                  </th>
                  <th rowSpan={2} className="px-3 py-2 border border-slate-400 text-left min-w-[130px]">
                    Jabatan
                  </th>
                  <th
                    colSpan={selectedTimesheet.day_labels.length}
                    className="px-3 py-1.5 border border-slate-400 text-center bg-blue-950 font-semibold"
                  >
                    Kehadiran Harian
                  </th>
                  <th
                    colSpan={7}
                    className="px-3 py-1.5 border border-slate-400 text-center bg-blue-900 font-semibold"
                  >
                    Rekap Total (Rumus Excel)
                  </th>
                  <th rowSpan={2} className="px-3 py-2 border border-slate-400 text-left min-w-[140px]">
                    Keterangan
                  </th>
                </tr>
                <tr>
                  {selectedTimesheet.day_labels.map((_, i) => (
                    <th
                      key={i}
                      className="px-2 py-1.5 border border-slate-400 text-center text-[10px] font-medium min-w-[42px] leading-tight"
                    >
                      {labelHari(selectedTimesheet, i)}
                    </th>
                  ))}
                  <th className="px-2 py-1 border border-slate-400 text-center w-12 font-semibold">
                    Hadir
                  </th>
                  <th className="px-2 py-1 border border-slate-400 text-center w-12 font-semibold">
                    BA (h)
                  </th>
                  <th className="px-2 py-1 border border-slate-400 text-center w-10 font-semibold">
                    Izin
                  </th>
                  <th className="px-2 py-1 border border-slate-400 text-center w-10 font-semibold">
                    Sakit
                  </th>
                  <th className="px-2 py-1 border border-slate-400 text-center w-10 font-semibold">
                    Alpa
                  </th>
                  <th className="px-2 py-1 border border-slate-400 text-center w-10 font-semibold">
                    Off
                  </th>
                  <th className="px-2 py-1 border border-slate-400 text-center w-14 font-semibold text-blue-200">
                    Lembur
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {selectedTimesheet.emps.map((e, idx) => {
                  const hadir = e.codes.filter(c => c.toUpperCase() === "H").length;
                  const baH = e.codes.filter(c => c === "h").length;
                  const izin = e.codes.filter(c => ["I", "IR"].includes(c.toUpperCase())).length;
                  const sakit = e.codes.filter(c => ["S", "SR"].includes(c.toUpperCase())).length;
                  const alpa = e.codes.filter(c => c.toUpperCase() === "A").length;
                  const off = e.codes.filter(c => c.toUpperCase() === "O").length;

                  return (
                    <tr
                      key={idx}
                      className={idx % 2 === 1 ? "bg-slate-50/50 hover:bg-blue-50/30" : "bg-white hover:bg-blue-50/30"}
                    >
                      <td className="px-2.5 py-1.5 border border-slate-200 text-center font-mono text-[11px] text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-1.5 border border-slate-200 font-mono text-[11px] text-slate-700">
                        {e.nik}
                      </td>
                      <td className="px-3 py-1.5 border border-slate-200 font-medium text-slate-900">
                        {e.nama}
                      </td>
                      <td className="px-3 py-1.5 border border-slate-200 text-slate-600">
                        {e.jab}
                      </td>

                      {/* Daily code columns */}
                      {e.codes.map((c, cIdx) => (
                        <td
                          key={cIdx}
                          className="px-1 py-1 border border-slate-200 text-center font-mono text-xs"
                        >
                          {c ? (
                            <span
                              className={`inline-block w-6 h-6 leading-6 rounded-xs text-[11px] ${getCodeBadgeClass(
                                c
                              )}`}
                            >
                              {c}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      ))}

                      {/* Rekap Totals */}
                      <td className="px-2 py-1.5 border border-slate-200 text-center font-semibold text-slate-900 tabular-nums">
                        {hadir}
                      </td>
                      <td className="px-2 py-1.5 border border-slate-200 text-center font-bold text-sky-800 tabular-nums bg-sky-50/40">
                        {baH}
                      </td>
                      <td className="px-2 py-1.5 border border-slate-200 text-center text-slate-700 tabular-nums">
                        {izin}
                      </td>
                      <td className="px-2 py-1.5 border border-slate-200 text-center text-slate-700 tabular-nums">
                        {sakit}
                      </td>
                      <td className="px-2 py-1.5 border border-slate-200 text-center font-bold text-rose-800 tabular-nums bg-rose-50/40">
                        {alpa}
                      </td>
                      <td className="px-2 py-1.5 border border-slate-200 text-center text-slate-600 tabular-nums">
                        {off}
                      </td>
                      <td className="px-2 py-1.5 border border-slate-200 text-center font-bold text-blue-700 tabular-nums bg-blue-50/40">
                        {e.g}
                      </td>
                      <td className="px-3 py-1.5 border border-slate-200 text-slate-500 text-[11px] truncate max-w-[150px]">
                        {e.ket || "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Legend Footnote */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600">
            <span className="font-semibold text-slate-800">Keterangan:</span>
            <span><strong className="text-emerald-700">H</strong> = Hadir</span>
            <span><strong className="text-sky-700">h</strong> = BA (Hadir &amp; BA Diterima)</span>
            <span><strong className="text-amber-700">I / IR</strong> = Izin</span>
            <span><strong className="text-amber-700">S / SR</strong> = Sakit</span>
            <span><strong className="text-rose-700">A / a</strong> = Alpa</span>
            <span><strong className="text-slate-600">O</strong> = Off</span>
            <span><strong className="text-blue-700">G</strong> = Lembur Ganti</span>
          </div>
        </div>
      )}
    </div>
  );
};
