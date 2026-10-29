import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, BarChart3 } from "lucide-react";
import { RekapProjectData } from "../types/attendance";
import { jmlHari } from "../utils/attendanceEngine";
import { AnalyticsKpiCards, KpiTotals } from "./analytics/AnalyticsKpiCards";
import { ExecutiveSummaryCard } from "./analytics/ExecutiveSummaryCard";
import { AttendanceCategoryPieChart, PieChartItem } from "./analytics/AttendanceCategoryPieChart";
import { ProjectAttendanceBarChart, BarChartItem } from "./analytics/ProjectAttendanceBarChart";

interface AttendanceAnalyticsBannerProps {
  projects: RekapProjectData[];
  effectiveRange?: { dari: Date; sampai: Date } | null;
}

const CATEGORY_COLORS = {
  Alfa: "#E11D48",
  Sakit: "#D97706",
  Izin: "#0284C7",
  Lembur: "#7C3AED",
  "BA Diterima": "#0D9488",
  "BA Ditolak": "#F43F5E",
};

export const AttendanceAnalyticsBanner: React.FC<AttendanceAnalyticsBannerProps> = ({
  projects,
  effectiveRange,
}) => {
  const [showCharts, setShowCharts] = useState<boolean>(false);

  // Aggregate overall KPI metrics
  const kpiTotals = useMemo<KpiTotals>(() => {
    let mp = 0;
    let hadir = 0;
    let off = 0;
    let alfa = 0;
    let sakit = 0;
    let izin = 0;
    let lembur = 0;
    let baH = 0;
    let baA = 0;

    projects.forEach(p => {
      mp += p.mp;
      hadir += p.H;
      off += p.OFF;
      alfa += p.A;
      sakit += p.SAKIT;
      izin += p.IZIN;
      lembur += p.G;
      baH += p.BA;
      baA += p.BAT;
    });

    const durasiHari =
      effectiveRange && effectiveRange.dari && effectiveRange.sampai
        ? jmlHari(effectiveRange.dari, effectiveRange.sampai)
        : 1;

    // Total possible employee-days (mandays)
    const totalMandays = mp * durasiHari;
    // Attendance rate percentage: (Hadir / Mandays) * 100
    const attendanceRate =
      totalMandays > 0 ? Math.min(100, Math.round((hadir / totalMandays) * 1000) / 10) : 0;

    return {
      mp,
      hadir,
      off,
      alfa,
      sakit,
      izin,
      lembur,
      baH,
      baA,
      durasiHari,
      attendanceRate,
      totalAnomali: alfa + sakit + izin + lembur + baH + baA,
    };
  }, [projects, effectiveRange]);

  // Data for Donut Chart
  const pieData = useMemo<PieChartItem[]>(() => {
    const list = [
      { name: "Alfa", value: kpiTotals.alfa, color: CATEGORY_COLORS.Alfa },
      { name: "Sakit", value: kpiTotals.sakit, color: CATEGORY_COLORS.Sakit },
      { name: "Izin", value: kpiTotals.izin, color: CATEGORY_COLORS.Izin },
      { name: "Lembur", value: kpiTotals.lembur, color: CATEGORY_COLORS.Lembur },
      { name: "BA Diterima", value: kpiTotals.baH, color: CATEGORY_COLORS["BA Diterima"] },
      { name: "BA Ditolak", value: kpiTotals.baA, color: CATEGORY_COLORS["BA Ditolak"] },
    ];
    return list.filter(item => item.value > 0);
  }, [kpiTotals]);

  // Data for Bar Chart per Project
  const barData = useMemo<BarChartItem[]>(() => {
    return projects.map(p => {
      const shortName = p.nama.length > 16 ? p.nama.substring(0, 14) + "…" : p.nama;
      return {
        fullName: p.nama,
        name: shortName,
        Alfa: p.A,
        Sakit: p.SAKIT,
        Izin: p.IZIN,
        Lembur: p.G,
        "BA Diterima": p.BA,
        "BA Ditolak": p.BAT,
      };
    });
  }, [projects]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 mb-5 shadow-2xs space-y-4">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Ringkasan Kehadiran &amp; Catatan Lapangan
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Gambaran kehadiran dan catatan ketidakhadiran dari {projects.length} proyek yang sedang berjalan.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs font-mono text-slate-500 hidden sm:inline">
            Total Catatan Khusus: <strong className="text-slate-900 tabular-nums">{kpiTotals.totalAnomali}</strong> hari
          </div>

          <button
            type="button"
            onClick={() => setShowCharts(!showCharts)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-900 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
            title={showCharts ? "Tutup tampilan grafik untuk melihat tabel data langsung" : "Buka tampilan grafik Donut dan perbandingan per proyek"}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>{showCharts ? "Sembunyikan Grafik" : "Tampilkan Grafik"}</span>
            {showCharts ? (
              <ChevronUp className="w-3.5 h-3.5 ml-0.5 text-blue-700" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 ml-0.5 text-blue-700" />
            )}
          </button>
        </div>
      </div>

      {/* KPI Stat Cards Strip (6 items, compact 1-row) */}
      <AnalyticsKpiCards kpiTotals={kpiTotals} />

      {/* Tri-Column Responsive Dashboard Grid (Collapsible) */}
      {showCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1 border-t border-slate-100 animate-in fade-in duration-200">
          {/* Kolom 1: Integrated Executive Summary Sidebar Card (4 cols) */}
          <ExecutiveSummaryCard
            kpiTotals={kpiTotals}
            projects={projects}
            effectiveRange={effectiveRange}
          />

          {/* Kolom 2: Donut Chart Distribusi Global (4 cols) */}
          <AttendanceCategoryPieChart
            pieData={pieData}
            kpiTotals={kpiTotals}
          />

          {/* Kolom 3: Grouped Bar Chart Per Proyek (4 cols) */}
          <ProjectAttendanceBarChart
            barData={barData}
            categoryColors={CATEGORY_COLORS}
          />
        </div>
      )}
    </div>
  );
};
