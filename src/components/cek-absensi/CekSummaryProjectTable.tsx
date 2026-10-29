import React from "react";
import { SearchX } from "lucide-react";

interface ProjectStats {
  karyawanSet: Set<string>;
  incidentCount: number;
  baH: number;
  baA: number;
}

interface CekSummaryProjectTableProps {
  filteredPerProject: Record<string, ProjectStats>;
  activeKat: "ALFA" | "SAKIT" | "IZIN" | "LEMBUR" | "BA";
  searchQuery: string;
  onResetSearch: () => void;
}

export const CekSummaryProjectTable: React.FC<CekSummaryProjectTableProps> = ({
  filteredPerProject,
  activeKat,
  searchQuery,
  onResetSearch,
}) => {
  const projectEntries = Object.entries(filteredPerProject);

  return (
    <div className="overflow-x-auto max-h-[500px]">
      <table className="w-full text-xs text-left border-collapse">
        <thead className="bg-[#1F3864] text-white sticky top-0 z-10 select-none">
          <tr>
            <th className="px-2.5 py-2 border border-slate-400 text-center w-10">No</th>
            <th className="px-3 py-2 border border-slate-400 text-left min-w-[240px]">Project</th>
            <th className="px-3 py-2 border border-slate-400 text-center w-32">Jumlah Karyawan</th>
            {activeKat === "BA" ? (
              <>
                <th className="px-3 py-2 border border-slate-400 text-center w-28">BA Diterima (h)</th>
                <th className="px-3 py-2 border border-slate-400 text-center w-28">BA Ditolak (a)</th>
                <th className="px-3 py-2 border border-slate-400 text-center w-28">Total BA</th>
              </>
            ) : (
              <th className="px-3 py-2 border border-slate-400 text-center w-32">Total Kejadian</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {projectEntries.length === 0 ? (
            <tr>
              <td colSpan={6} className="p-8 text-center bg-slate-50/50">
                <div className="max-w-md mx-auto space-y-2">
                  <SearchX className="w-6 h-6 text-slate-400 mx-auto" />
                  <p className="text-xs font-semibold text-slate-700">
                    {searchQuery
                      ? `Tidak ada proyek yang sesuai dengan pencarian "${searchQuery}".`
                      : "Tidak ada data proyek pada kategori ini."}
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
            projectEntries.map(([proj, stats], i) => (
              <tr key={i} className={i % 2 === 1 ? "bg-slate-50/50 hover:bg-blue-50/30" : "bg-white hover:bg-blue-50/30"}>
                <td className="px-2.5 py-1.5 border border-slate-200 text-center font-mono text-[11px] text-slate-500">
                  {i + 1}
                </td>
                <td className="px-3 py-1.5 border border-slate-200 font-semibold text-slate-900">
                  {proj}
                </td>
                <td className="px-3 py-1.5 border border-slate-200 text-center font-mono tabular-nums">
                  {stats.karyawanSet.size}
                </td>
                {activeKat === "BA" ? (
                  <>
                    <td className="px-3 py-1.5 border border-slate-200 text-center font-mono tabular-nums text-sky-800 font-bold">
                      {stats.baH || 0}
                    </td>
                    <td className="px-3 py-1.5 border border-slate-200 text-center font-mono tabular-nums text-rose-800 font-bold">
                      {stats.baA || 0}
                    </td>
                    <td className="px-3 py-1.5 border border-slate-200 text-center font-mono tabular-nums font-bold text-slate-900">
                      {stats.incidentCount}
                    </td>
                  </>
                ) : (
                  <td className="px-3 py-1.5 border border-slate-200 text-center font-mono tabular-nums font-bold text-slate-900">
                    {stats.incidentCount}
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

