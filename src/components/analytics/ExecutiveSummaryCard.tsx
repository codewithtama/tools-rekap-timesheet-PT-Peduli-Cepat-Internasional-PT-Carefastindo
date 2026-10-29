import React from "react";
import { Users, Building2, Calendar, TrendingUp } from "lucide-react";
import { RekapProjectData } from "../../types/attendance";
import { tglId } from "../../utils/attendanceEngine";
import { KpiTotals } from "./AnalyticsKpiCards";

interface ExecutiveSummaryCardProps {
  kpiTotals: KpiTotals;
  projects: RekapProjectData[];
  effectiveRange?: { dari: Date; sampai: Date } | null;
}

export const ExecutiveSummaryCard: React.FC<ExecutiveSummaryCardProps> = ({
  kpiTotals,
  projects,
  effectiveRange,
}) => {
  return (
    <div className="lg:col-span-12 xl:col-span-4 border border-slate-200 bg-slate-50/70 rounded-xl p-4 flex flex-col justify-between space-y-4">
      <div>
        <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Ringkasan Utama
          </span>
          <span className="text-[11px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {kpiTotals.attendanceRate}% Tingkat Kehadiran
          </span>
        </div>

        {/* 4 Mini Cards in 2x2 Grid */}
        <div className="grid grid-cols-2 gap-2.5 mb-3">
          <div className="bg-white p-2.5 rounded-lg border border-slate-200/90 shadow-2xs">
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mb-0.5 font-medium">
              <Users className="w-3.5 h-3.5 text-blue-900" />
              Karyawan Terdata
            </div>
            <div className="text-lg font-bold text-slate-900 font-mono tabular-nums">
              {kpiTotals.mp}
            </div>
            <div className="text-[10px] text-slate-400">Total personel aktif</div>
          </div>

          <div className="bg-white p-2.5 rounded-lg border border-slate-200/90 shadow-2xs">
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mb-0.5 font-medium">
              <Building2 className="w-3.5 h-3.5 text-blue-900" />
              Jumlah Proyek
            </div>
            <div className="text-lg font-bold text-slate-900 font-mono tabular-nums">
              {projects.length}
            </div>
            <div className="text-[10px] text-slate-400">Lokasi penempatan</div>
          </div>

          <div className="bg-white p-2.5 rounded-lg border border-slate-200/90 shadow-2xs">
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mb-0.5 font-medium">
              <Calendar className="w-3.5 h-3.5 text-blue-900" />
              Durasi Periode
            </div>
            <div className="text-lg font-bold text-slate-900 font-mono tabular-nums">
              {kpiTotals.durasiHari}{" "}
              <span className="text-xs font-normal text-slate-500">Hari</span>
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {effectiveRange
                ? `${tglId(effectiveRange.dari)} sampai ${tglId(effectiveRange.sampai)}`
                : "Periode aktif"}
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-lg border border-slate-200/90 shadow-2xs">
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mb-0.5 font-medium">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
              Total Hari Masuk
            </div>
            <div className="text-lg font-bold text-emerald-800 font-mono tabular-nums">
              {kpiTotals.hadir}
            </div>
            <div className="text-[10px] text-slate-400">Akumulasi hadir kerja</div>
          </div>
        </div>

        {/* Quick Project Badges List */}
        <div>
          <div className="text-[11px] font-semibold text-slate-600 mb-1.5 flex items-center justify-between">
            <span>Daftar Proyek &amp; Jumlah Personel:</span>
            <span className="text-[10px] text-slate-400 font-normal">Personel</span>
          </div>
          <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
            {projects.map(p => (
              <div
                key={p.fileName}
                className="flex items-center justify-between p-1.5 bg-white rounded-md border border-slate-200/80 text-xs"
              >
                <span className="font-medium text-slate-800 truncate pr-2" title={p.nama}>
                  {p.nama}
                </span>
                <span className="font-mono text-[11px] font-bold text-blue-900 bg-blue-50 px-2 py-0.2 rounded-sm shrink-0">
                  {p.mp} MP
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-200/70 text-[10px] text-slate-500 leading-tight">
        * Persentase kehadiran dihitung dari total hari masuk kerja dibagi kapasitas mandays seluruh personel.
      </div>
    </div>
  );
};

