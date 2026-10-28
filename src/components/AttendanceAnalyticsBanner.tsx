import React, { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  AlertTriangle,
  Thermometer,
  CalendarX,
  Clock,
  FileCheck,
  Building2,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { RekapProjectData } from "../types/attendance";
import { jmlHari, tglId } from "../utils/attendanceEngine";

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
  // Aggregate overall KPI metrics
  const kpiTotals = useMemo(() => {
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
  const pieData = useMemo(() => {
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
  const barData = useMemo(() => {
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

  const renderPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percent =
        kpiTotals.totalAnomali > 0
          ? Math.round((data.value / kpiTotals.totalAnomali) * 100)
          : 0;
      return (
        <div className="bg-slate-900/95 backdrop-blur-xs text-white px-3 py-2 rounded-lg text-xs shadow-lg border border-slate-700 font-sans">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: data.payload.color }}
            />
            <span className="font-semibold">{data.name}:</span>
            <span className="font-mono font-bold tabular-nums">{data.value} hari</span>
            <span className="text-slate-400 font-mono text-[11px]">({percent}%)</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = barData.find(b => b.name === label);
      return (
        <div className="bg-slate-900/95 backdrop-blur-xs text-white p-3 rounded-lg text-xs shadow-lg border border-slate-700 font-sans min-w-[160px]">
          <div className="font-semibold text-slate-200 border-b border-slate-700 pb-1.5 mb-2">
            {item?.fullName || label}
          </div>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  {entry.name}:
                </span>
                <span className="font-mono font-bold tabular-nums text-white">
                  {entry.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 shadow-2xs space-y-5">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Ringkasan Kehadiran &amp; Catatan Lapangan
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Gambaran kehadiran dan catatan ketidakhadiran dari {projects.length} proyek yang sedang berjalan.
          </p>
        </div>
        <div className="text-xs font-mono text-slate-500">
          Total Catatan Khusus: <strong className="text-slate-900 tabular-nums">{kpiTotals.totalAnomali}</strong> hari
        </div>
      </div>

      {/* KPI Stat Cards Strip (6 items) */}
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

      {/* Tri-Column Responsive Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1">
        {/* Kolom 1: Integrated Executive Summary Sidebar Card (4 cols) */}
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

        {/* Kolom 2: Donut Chart Distribusi Global (4 cols) */}
        <div className="lg:col-span-6 xl:col-span-4 border border-slate-200 bg-white rounded-xl p-4 flex flex-col justify-between">
          <div className="mb-1">
            <h3 className="text-xs font-bold text-slate-800">
              Porsi Ketidakhadiran &amp; Lembur
            </h3>
            <p className="text-[11px] text-slate-500">
              Perbandingan jenis ketidakhadiran di semua proyek
            </p>
          </div>

          <div className="h-48 relative flex items-center justify-center my-1">
            {pieData.length === 0 ? (
              <div className="text-xs text-slate-400 italic">
                Tidak ada data catatan khusus pada periode ini.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={renderPieTooltip} />
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={72}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={2} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}

            {pieData.length > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-bold font-mono text-slate-900 tabular-nums">
                  {kpiTotals.totalAnomali}
                </span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                  Hari
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 pt-2 border-t border-slate-100 text-xs">
            {pieData.map(item => (
              <div key={item.name} className="flex items-center gap-1 text-slate-600">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[11px] font-medium text-slate-700">{item.name}:</span>
                <span className="font-mono font-bold text-slate-900 tabular-nums text-[11px]">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Kolom 3: Grouped Bar Chart Per Proyek (4 cols) */}
        <div className="lg:col-span-6 xl:col-span-4 border border-slate-200 bg-white rounded-xl p-4 flex flex-col justify-between">
          <div className="mb-1">
            <h3 className="text-xs font-bold text-slate-800">
              Perbandingan Tiap Proyek
            </h3>
            <p className="text-[11px] text-slate-500">
              Jumlah Alfa, Sakit, Izin, dan Lembur di tiap lokasi
            </p>
          </div>

          <div className="h-56">
            {barData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                Belum ada data proyek.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: -25, bottom: 20 }}>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: "#64748B" }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#64748B" }}
                    allowDecimals={false}
                  />
                  <Tooltip content={renderBarTooltip} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ fontSize: "10px", paddingBottom: "6px" }}
                  />
                  <Bar dataKey="Alfa" fill={CATEGORY_COLORS.Alfa} radius={[2, 2, 0, 0]} maxBarSize={16} />
                  <Bar dataKey="Sakit" fill={CATEGORY_COLORS.Sakit} radius={[2, 2, 0, 0]} maxBarSize={16} />
                  <Bar dataKey="Izin" fill={CATEGORY_COLORS.Izin} radius={[2, 2, 0, 0]} maxBarSize={16} />
                  <Bar dataKey="Lembur" fill={CATEGORY_COLORS.Lembur} radius={[2, 2, 0, 0]} maxBarSize={16} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
