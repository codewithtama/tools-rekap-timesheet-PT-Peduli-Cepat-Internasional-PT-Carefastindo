import React from "react";
import {
  Users,
  AlertTriangle,
  Thermometer,
  CalendarX,
  Clock,
  FileCheck,
  TimerReset,
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

export interface LateKpiTotals {
  count: number;
  totalMenit: number;
  karyawanCount: number;
}

interface AnalyticsKpiCardsProps {
  kpiTotals: KpiTotals;
  lateTotals?: LateKpiTotals | null;
}

export const AnalyticsKpiCards: React.FC<AnalyticsKpiCardsProps> = ({ kpiTotals, lateTotals }) => {
  const alfaMurni = Math.max(0, kpiTotals.alfa - kpiTotals.baA);
  const hasLate = !!(lateTotals && lateTotals.count > 0);

  return (
    <div
      className={`grid grid-cols-2 sm:grid-cols-3 ${
        hasLate ? "lg:grid-cols-7" : "lg:grid-cols-6"
      } gap-3`}
    >
      {/* 1. Total Personel */}
      <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-900 flex items-center justify-center shrink-0">
          <Users className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] text-slate-500 font-medium">Total Personel</div>
          <div className="text-base font-bold text-slate-900 font-mono tabular-nums">
            {kpiTotals.mp} MP
          </div>
        </div>
      </div>

      {/* 2. Total Alfa (A & a / BA Ditolak) */}
      <div className="p-3 bg-rose-50/60 border border-rose-200/70 rounded-xl flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] text-rose-800 font-semibold flex items-center gap-1">
            <span>Total Alfa</span>
            <span className="text-[9px] px-1 py-0.2 bg-rose-200/70 text-rose-900 rounded font-mono font-bold">
              A / a
            </span>
          </div>
          <div className="text-base font-bold text-rose-900 font-mono tabular-nums leading-tight">
            {kpiTotals.alfa}
          </div>
          <div className="text-[10px] text-rose-700 font-medium truncate mt-0.5" title="Sesuai aturan: a (BA Ditolak) tetap dihitung masuk ke Total Alfa">
            {kpiTotals.baA > 0 ? (
              <span>Termasuk <strong>{kpiTotals.baA}</strong> BA ditolak (a)</span>
            ) : (
              <span>A: {alfaMurni} (Alfa Murni)</span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Total Sakit */}
      <div className="p-3 bg-amber-50/60 border border-amber-200/60 rounded-xl flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
          <Thermometer className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] text-amber-800 font-medium">Total Sakit</div>
          <div className="text-base font-bold text-amber-900 font-mono tabular-nums">
            {kpiTotals.sakit}
          </div>
          <div className="text-[10px] text-amber-700 font-medium truncate mt-0.5">
            S / SR
          </div>
        </div>
      </div>

      {/* 4. Total Izin */}
      <div className="p-3 bg-sky-50/60 border border-sky-200/60 rounded-xl flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center shrink-0">
          <CalendarX className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] text-sky-800 font-medium">Total Izin</div>
          <div className="text-base font-bold text-sky-900 font-mono tabular-nums">
            {kpiTotals.izin}
          </div>
          <div className="text-[10px] text-sky-700 font-medium truncate mt-0.5">
            I / IR
          </div>
        </div>
      </div>

      {/* 5. Lembur Ganti */}
      <div className="p-3 bg-purple-50/60 border border-purple-200/60 rounded-xl flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center shrink-0">
          <Clock className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] text-purple-800 font-medium">Lembur Ganti</div>
          <div className="text-base font-bold text-purple-900 font-mono tabular-nums">
            {kpiTotals.lembur}
          </div>
          <div className="text-[10px] text-purple-700 font-medium truncate mt-0.5">
            Kode G
          </div>
        </div>
      </div>

      {/* 6. BA Diterima / Ditolak */}
      <div className="p-3 bg-teal-50/60 border border-teal-200/60 rounded-xl flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
          <FileCheck className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] text-teal-800 font-medium">BA Diterima / Ditolak</div>
          <div className="text-base font-bold text-teal-900 font-mono tabular-nums leading-tight">
            {kpiTotals.baH} / {kpiTotals.baA}
          </div>
          <div className="text-[10px] text-teal-700 font-medium truncate mt-0.5" title="h masuk Hadir, a masuk Alfa">
            h: {kpiTotals.baH} • a: {kpiTotals.baA} (ke Alfa)
          </div>
        </div>
      </div>

      {/* 7. Keterlambatan (Opsional, jika ada file diunggah) */}
      {hasLate && lateTotals && (
        <div className="p-3 bg-orange-50/70 border border-orange-200/80 rounded-xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-800 flex items-center justify-center shrink-0">
            <TimerReset className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] text-orange-800 font-medium">Keterlambatan</div>
            <div className="text-base font-bold text-orange-950 font-mono tabular-nums leading-tight">
              {lateTotals.count}x
            </div>
            <div
              className="text-[10px] text-orange-700 font-medium truncate mt-0.5"
              title={`Total ${lateTotals.totalMenit} menit keterlambatan dari ${lateTotals.karyawanCount} karyawan`}
            >
              {lateTotals.totalMenit} m ({lateTotals.karyawanCount} org)
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
