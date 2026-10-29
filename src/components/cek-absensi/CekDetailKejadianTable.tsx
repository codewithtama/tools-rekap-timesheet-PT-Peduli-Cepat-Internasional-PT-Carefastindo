import React from "react";
import { SearchX } from "lucide-react";

export interface DetailKejadianRow {
  nuc: string;
  nama: string;
  jabatan: string;
  project: string;
  tanggal: string;
  kode: string;
  status: string;
}

interface CekDetailKejadianTableProps {
  rows: DetailKejadianRow[];
  activeKat: "ALFA" | "SAKIT" | "IZIN" | "LEMBUR" | "BA";
  searchQuery: string;
  onResetSearch: () => void;
}

export const CekDetailKejadianTable: React.FC<CekDetailKejadianTableProps> = ({
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
            <th className="px-3 py-2 border border-slate-400 text-left min-w-[130px]">Jabatan</th>
            <th className="px-3 py-2 border border-slate-400 text-left min-w-[180px]">Project</th>
            <th className="px-3 py-2 border border-slate-400 text-center w-28">Tanggal</th>
            <th className="px-2.5 py-2 border border-slate-400 text-center w-16">Kode</th>
            {activeKat === "BA" && (
              <th className="px-3 py-2 border border-slate-400 text-left min-w-[140px]">Status</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={8} className="p-8 text-center bg-slate-50/50">
                <div className="max-w-md mx-auto space-y-2">
                  <SearchX className="w-6 h-6 text-slate-400 mx-auto" />
                  <p className="text-xs font-semibold text-slate-700">
                    {searchQuery
                      ? `Tidak ada kejadian yang cocok dengan pencarian "${searchQuery}".`
                      : "Tidak ada rincian tanggal kejadian pada kategori ini."}
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
                <td className="px-3 py-1.5 border border-slate-200 text-center font-medium text-slate-800">
                  {r.tanggal}
                </td>
                <td className="px-2.5 py-1.5 border border-slate-200 text-center font-mono font-bold text-blue-900">
                  {r.kode}
                </td>
                {activeKat === "BA" && (
                  <td className="px-3 py-1.5 border border-slate-200 font-semibold text-[11px]">
                    <span
                      className={
                        r.kode === "h"
                          ? "text-sky-700 bg-sky-50 px-2 py-0.5 rounded-sm"
                          : "text-rose-700 bg-rose-50 px-2 py-0.5 rounded-sm"
                      }
                    >
                      {r.status}
                    </span>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

