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
import { Users, AlertTriangle, Thermometer, CalendarX, Clock, FileCheck } from "lucide-react";
import { RekapProjectData } from "../types/attendance";

interface AttendanceAnalyticsBannerProps {
  projects: RekapProjectData[];
}

const CATEGORY_COLORS = {
  Alfa: "#E11D48", // Rose 600
  Sakit: "#D97706", // Amber 600
  Izin: "#0284C7", // Sky 600
  Lembur: "#7C3AED", // Purple 600
  "BA Diterima": "#0D9488", // Teal 600
  "BA Ditolak": "#F43F5E", // Rose 500
};

export const AttendanceAnalyticsBanner: React.FC<AttendanceAnalyticsBannerProps> = ({
  projects,
}) => {
  // Aggregate overall KPI metrics
  const kpiTotals = useMemo(() => {
    let mp = 0;
    let alfa = 0;
    let sakit = 0;
    let izin = 0;
    let lembur = 0;
    let baH = 0;
    let baA = 0;

    projects.forEach(p => {
      mp += p.mp;
      alfa += p.A;
      sakit += p.SAKIT;
      izin += p.IZIN;
      lembur += p.G;
      baH += p.BA;
      baA += p.BAT;
    });

    return {
      mp,
      alfa,
      sakit,
      izin,
      lembur,
      baH,
      baA,
      totalAnomali: alfa + sakit + izin + lembur + baH + baA,
    };
  }, [projects]);

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
    // Filter out categories with 0 count to keep chart clean
    return list.filter(item => item.value > 0);
  }, [kpiTotals]);

  // Data for Bar Chart per Project
  const barData = useMemo(() => {
    return projects.map(p => {
      // Shorten project name for cleaner X-axis display
      const shortName = p.nama.length > 18 ? p.nama.substring(0, 16) + "…" : p.nama;
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

  // Custom Tooltip for Pie Chart
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

  // Custom Tooltip for Bar Chart
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
      {/* Top Header & Context */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Ringkasan Analitik Absensi Real-Time
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Distribusi kejadian ketidakhadiran dan lembur dari {projects.length} lokasi proyek yang sedang diproses.
          </p>
        </div>
        <div className="text-xs font-mono text-slate-500">
          Total Kejadian: <strong className="text-slate-900 tabular-nums">{kpiTotals.totalAnomali}</strong> hari
        </div>
      </div>

      {/* KPI Stat Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-900 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-medium">Manpower</div>
            <div className="text-base font-bold text-slate-900 font-mono tabular-nums">
              {kpiTotals.mp}
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
            <div className="text-[11px] text-teal-800 font-medium">Total BA (h/a)</div>
            <div className="text-base font-bold text-teal-900 font-mono tabular-nums">
              {kpiTotals.baH}/{kpiTotals.baA}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
        {/* Sisi Kiri: Donut Chart Distribusi Global (5 cols) */}
        <div className="lg:col-span-5 border border-slate-100 bg-slate-50/40 rounded-xl p-4 flex flex-col justify-between">
          <div className="mb-2">
            <h3 className="text-xs font-bold text-slate-800">
              Distribusi Kategori Absensi
            </h3>
            <p className="text-[11px] text-slate-500">
              Proporsi kumulatif ketidakhadiran di seluruh proyek
            </p>
          </div>

          <div className="h-56 relative flex items-center justify-center">
            {pieData.length === 0 ? (
              <div className="text-xs text-slate-400 italic">
                Tidak ada data anomali absensi pada periode ini.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={renderPieTooltip} />
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={54}
                    outerRadius={80}
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

            {/* Centered Total Metric in Donut Hole */}
            {pieData.length > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-bold font-mono text-slate-900 tabular-nums">
                  {kpiTotals.totalAnomali}
                </span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                  Kejadian
                </span>
              </div>
            )}
          </div>

          {/* Clean Unboxed Legend */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 pt-2 border-t border-slate-200/60 text-xs">
            {pieData.map(item => (
              <div key={item.name} className="flex items-center gap-1.5 text-slate-600">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-medium text-slate-700">{item.name}:</span>
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Sisi Kanan: Grouped Bar Chart Per Proyek (7 cols) */}
        <div className="lg:col-span-7 border border-slate-100 bg-slate-50/40 rounded-xl p-4 flex flex-col justify-between">
          <div className="mb-2">
            <h3 className="text-xs font-bold text-slate-800">
              Perbandingan Anomali Absensi per Proyek
            </h3>
            <p className="text-[11px] text-slate-500">
              Frekuensi Alfa, Sakit, Izin, dan Lembur di masing-masing lokasi kerja
            </p>
          </div>

          <div className="h-64">
            {barData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                Belum ada data proyek.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    allowDecimals={false}
                  />
                  <Tooltip content={renderBarTooltip} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ fontSize: "11px", paddingBottom: "10px" }}
                  />
                  <Bar dataKey="Alfa" fill={CATEGORY_COLORS.Alfa} radius={[3, 3, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="Sakit" fill={CATEGORY_COLORS.Sakit} radius={[3, 3, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="Izin" fill={CATEGORY_COLORS.Izin} radius={[3, 3, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="Lembur" fill={CATEGORY_COLORS.Lembur} radius={[3, 3, 0, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
