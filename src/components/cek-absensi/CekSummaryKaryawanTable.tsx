import React from "react";
import { SearchX } from "lucide-react";

export interface SummaryKaryawanRow {
  nuc: string;
  nama: string;
  jabatan: string;
  project: string;
  baH?: number;
  baA?: number;
  totalMenit?: number;
  total: number;
  tanggal: string;
}

interface CekSummaryKaryawanTableProps {
  rows: SummaryKaryawanRow[];
  activeKat: "ALFA" | "SAKIT" | "IZIN" | "LEMBUR" | "BA" | "TERLAMBAT";
  searchQuery: string;
  onResetSearch: () => void;
}

export const CekSummaryKaryawanTable: React.FC<CekSummaryKaryawanTableProps> = ({
  rows,
  activeKat,
  searchQuery,
  onResetSearch,
}) => {
  return (
    <div className="overflow-x-auto max-h-[500px]">
      <table className="w-full text-xs text-left border-collapse">
        <thead className="bg-[#1F3864] text-white sticky top-0 z-10 select-none">
          <tr>
            <th className="px-2.5 py-2 border border-slate-400 text-center w-10">No</th>
            <th className="px-3 py-2 border border-slate-400 text-center w-28">NUC</th>
            <th className="px-3 py-2 border border-slate-400 text-left min-w-[180px]">Nama</th>
            <th className="px-3 py-2 border border-slate-400 text-left min-w-[140px]">Jabatan</th>
            <th className="px-3 py-2 border border-slate-400 text-left min-w-[180px]">Project</th>
            {activeKat === "BA" ? (
              <>
                <th className="px-2.5 py-2 border border-slate-400 text-center w-24">BA Diterima (h)</th>
                <th className="px-2.5 py-2 border border-slate-400 text-center w-24">BA Ditolak (a)</th>
                <th className="px-2.5 py-2 border border-slate-400 text-center w-20">Total BA</th>
              </>
            ) : activeKat === "TERLAMBAT" ? (
              <>
                <th className="px-2.5 py-2 border border-slate-400 text-center w-20">Frekuensi</th>
                <th className="px-2.5 py-2 border border-slate-400 text-center w-24">Total Menit</th>
              </>
            ) : (
              <th className="px-2.5 py-2 border border-slate-400 text-center w-28">
                {activeKat === "ALFA" ? "Total Alfa (A/a)" : "Jumlah"}
              </th>
            )}
            <th className="px-3 py-2 border border-slate-400 text-left min-w-[200px]">
              {activeKat === "TERLAMBAT" ? "Rincian Tanggal (Menit)" : "Tanggal Kejadian"}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={activeKat === "BA" ? 9 : activeKat === "TERLAMBAT" ? 8 : 7} className="p-8 text-center bg-slate-50/50">
                <div className="max-w-md mx-auto space-y-2">
                  <SearchX className="w-6 h-6 text-slate-400 mx-auto" />
                  <p className="text-xs font-semibold text-slate-700">
                    {searchQuery
                      ? `Tidak ada karyawan yang cocok dengan pencarian "${searchQuery}".`
                      : `Tidak ada catatan ${activeKat} pada periode ini.`}
                  </p>
                  {searchQuery && (
                    <button
                      onClick={onResetSearch}
                      className="mt-2 px-3 py-1.5 text-xs font-medium text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                    >
                      Reset Pencarian
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr key={i} className={i % 2 === 1 ? "bg-slate-50/50 hover:bg-blue-50/30" : "bg-white hover:bg-blue-50/30"}>
                <td className="px-2.5 py-1.5 border border-slate-200 text-center font-mono text-[11px] text-slate-500">
                  {i + 1}
                </td>
                <td className="px-3 py-1.5 border border-slate-200 font-mono text-slate-700">
                  {r.nuc}
                </td>
                <td className="px-3 py-1.5 border border-slate-200 font-medium text-slate-900">
                  {r.nama}
                </td>
                <td className="px-3 py-1.5 border border-slate-200 text-slate-600">
                  {r.jabatan}
                </td>
                <td className="px-3 py-1.5 border border-slate-200 text-slate-800">
                  {r.project}
                </td>
                {activeKat === "BA" ? (
                  <>
                    <td className="px-2.5 py-1.5 border border-slate-200 text-center font-bold text-sky-800 bg-sky-50/30 tabular-nums">
                      {r.baH}
                    </td>
                    <td className="px-2.5 py-1.5 border border-slate-200 text-center font-bold text-rose-800 bg-rose-50/30 tabular-nums">
                      {r.baA}
                    </td>
                    <td className="px-2.5 py-1.5 border border-slate-200 text-center font-bold text-slate-900 tabular-nums">
                      {r.total}
                    </td>
                  </>
                ) : activeKat === "TERLAMBAT" ? (
                  <>
                    <td className="px-2.5 py-1.5 border border-slate-200 text-center font-bold text-amber-900 bg-amber-50/30 tabular-nums">
                      {r.total}x
                    </td>
                    <td className="px-2.5 py-1.5 border border-slate-200 text-center font-bold text-orange-950 bg-orange-50/30 tabular-nums font-mono">
                      {r.totalMenit || 0} m
                    </td>
                  </>
                ) : (
                  <td className="px-2.5 py-1.5 border border-slate-200 text-center font-bold text-slate-900 tabular-nums">
                    <div>{r.total}</div>
                    {activeKat === "ALFA" && r.baA !== undefined && r.baA > 0 && (
                      <div className="text-[10px] text-rose-700 font-normal leading-tight mt-0.5">
                        ({r.baA} BA ditolak)
                      </div>
                    )}
                  </td>
                )}
                <td className="px-3 py-1.5 border border-slate-200 text-slate-600 text-[11px]">
                  {r.tanggal}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
