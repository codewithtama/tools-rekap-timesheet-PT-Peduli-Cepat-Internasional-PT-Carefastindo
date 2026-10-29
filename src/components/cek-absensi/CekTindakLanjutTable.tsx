import React from "react";
import { SearchX } from "lucide-react";
import { PolaDetail } from "../../types/attendance";

interface CekTindakLanjutTableProps {
  filteredPolas: PolaDetail[];
  activeKat: "ALFA" | "SAKIT" | "IZIN" | "LEMBUR" | "BA";
  hariBelumFinalCount: number;
  searchQuery: string;
  onResetSearch: () => void;
}

export const CekTindakLanjutTable: React.FC<CekTindakLanjutTableProps> = ({
  filteredPolas,
  activeKat,
  hariBelumFinalCount,
  searchQuery,
  onResetSearch,
}) => {
  return (
    <div>
      <div className="p-3 bg-rose-50 border-b border-rose-200 text-xs text-rose-900 leading-relaxed">
        <strong>Kriteria Pola Khusus:</strong> Beruntun (minimal 3 hari berturut-turut), Mengapit Hari Off (libur rutin diapit ketidakhadiran), Sering (minimal 3 kali kejadian).
        {hariBelumFinalCount > 0 && (
          <span className="block mt-0.5 text-rose-800">
            Tanggal yang belum ditutup sistem (hari berjalan) diabaikan dari deteksi pola.
          </span>
        )}
      </div>
      <div className="overflow-x-auto max-h-[500px]">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="bg-[#1F3864] text-white sticky top-0 z-10 select-none">
            <tr>
              <th className="px-2.5 py-2 border border-slate-400 text-center w-10">No</th>
              <th className="px-3 py-2 border border-slate-400 text-center w-28">NUC</th>
              <th className="px-3 py-2 border border-slate-400 text-left min-w-[180px]">Nama</th>
              <th className="px-3 py-2 border border-slate-400 text-left min-w-[130px]">Jabatan</th>
              <th className="px-3 py-2 border border-slate-400 text-left min-w-[180px]">Project</th>
              <th className="px-2.5 py-2 border border-slate-400 text-center w-16">Jumlah</th>
              <th className="px-3 py-2 border border-slate-400 text-left w-36">Pola</th>
              <th className="px-3 py-2 border border-slate-400 text-left min-w-[280px]">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredPolas.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center bg-slate-50/50">
                  <div className="max-w-md mx-auto space-y-2">
                    <SearchX className="w-6 h-6 text-slate-400 mx-auto" />
                    <p className="text-xs font-semibold text-slate-700">
                      {searchQuery
                        ? `Tidak ada pola tindak lanjut yang cocok dengan kata kunci "${searchQuery}".`
                        : `Tidak ada pola ${activeKat} yang perlu ditindaklanjuti pada periode ini.`}
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
              filteredPolas.map((p, idx) => (
                <tr key={idx} className={idx % 2 === 1 ? "bg-slate-50/50 hover:bg-blue-50/30" : "bg-white hover:bg-blue-50/30"}>
                  <td className="px-2.5 py-2 border border-slate-200 text-center font-mono text-[11px] text-slate-500">
                    {idx + 1}
                  </td>
                  <td className="px-3 py-2 border border-slate-200 font-mono text-slate-700">
                    {p.nuc}
                  </td>
                  <td className="px-3 py-2 border border-slate-200 font-semibold text-slate-900">
                    {p.nama}
                  </td>
                  <td className="px-3 py-2 border border-slate-200 text-slate-600">
                    {p.jabatan}
                  </td>
                  <td className="px-3 py-2 border border-slate-200 text-slate-800">
                    {p.project}
                  </td>
                  <td className="px-2.5 py-2 border border-slate-200 text-center font-bold text-rose-800 tabular-nums">
                    {p.jumlah}
                  </td>
                  <td className="px-3 py-2 border border-slate-200 font-semibold text-rose-900 bg-rose-50/30">
                    {p.pola}
                  </td>
                  <td className="px-3 py-2 border border-slate-200 text-slate-700 text-[11px] leading-relaxed">
                    {p.detail}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

