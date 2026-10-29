import React from "react";
import {
  Users,
  AlertTriangle,
  Thermometer,
  CalendarX,
  Clock,
  FileCheck,
} from "lucide-react";

export interface KpiTotals {
  mp: number;
  hadir: number;
  off: number;
  alfa: number;
  sakit: number;
  izin: number;
  lembur: number;
  baH: number;
  baA: number;
  durasiHari: number;
  attendanceRate: number;
  totalAnomali: number;
}

interface AnalyticsKpiCardsProps {
  kpiTotals: KpiTotals;
}

export const AnalyticsKpiCards: React.FC<AnalyticsKpiCardsProps> = ({ kpiTotals }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-900 flex items-center justify-center shrink-0">
          <Users className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[11px] text-slate-500 font-medium">Total Personel</div>
          <div className="text-base font-bold text-slate-900 font-mono tabular-nums">
            {kpiTotals.mp} MP
          </div>
        </div>
      </div>

      <div className="p-3 bg-rose-50/60 border border-rose-200/60 rounded-xl flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[11px] text-rose-800 font-medium">Total Alfa</div>
          <div className="text-base font-bold text-rose-900 font-mono tabular-nums">
            {kpiTotals.alfa}
          </div>
        </div>
      </div>

      <div className="p-3 bg-amber-50/60 border border-amber-200/60 rounded-xl flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
          <Thermometer className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[11px] text-amber-800 font-medium">Total Sakit</div>
          <div className="text-base font-bold text-amber-900 font-mono tabular-nums">
            {kpiTotals.sakit}
          </div>
        </div>
      </div>

      <div className="p-3 bg-sky-50/60 border border-sky-200/60 rounded-xl flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center shrink-0">
          <CalendarX className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[11px] text-sky-800 font-medium">Total Izin</div>
          <div className="text-base font-bold text-sky-900 font-mono tabular-nums">
            {kpiTotals.izin}
          </div>
        </div>
      </div>

      <div className="p-3 bg-purple-50/60 border border-purple-200/60 rounded-xl flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center shrink-0">
          <Clock className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[11px] text-purple-800 font-medium">Lembur Ganti</div>
          <div className="text-base font-bold text-purple-900 font-mono tabular-nums">
            {kpiTotals.lembur}
          </div>
        </div>
      </div>

      <div className="p-3 bg-teal-50/60 border border-teal-200/60 rounded-xl flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
          <FileCheck className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[11px] text-teal-800 font-medium">BA Diterima / Ditolak</div>
          <div className="text-base font-bold text-teal-900 font-mono tabular-nums">
            {kpiTotals.baH}/{kpiTotals.baA}
          </div>
        </div>
      </div>
    </div>
  );
};

