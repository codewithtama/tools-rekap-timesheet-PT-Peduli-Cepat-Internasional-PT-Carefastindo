import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export interface BarChartItem {
  fullName: string;
  name: string;
  Alfa: number;
  Sakit: number;
  Izin: number;
  Lembur: number;
  "BA Diterima": number;
  "BA Ditolak": number;
}

interface ProjectAttendanceBarChartProps {
  barData: BarChartItem[];
  categoryColors: {
    Alfa: string;
    Sakit: string;
    Izin: string;
    Lembur: string;
  };
}

export const ProjectAttendanceBarChart: React.FC<ProjectAttendanceBarChartProps> = ({
  barData,
  categoryColors,
}) => {
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
              <Bar dataKey="Alfa" fill={categoryColors.Alfa} radius={[2, 2, 0, 0]} maxBarSize={16} />
              <Bar dataKey="Sakit" fill={categoryColors.Sakit} radius={[2, 2, 0, 0]} maxBarSize={16} />
              <Bar dataKey="Izin" fill={categoryColors.Izin} radius={[2, 2, 0, 0]} maxBarSize={16} />
              <Bar dataKey="Lembur" fill={categoryColors.Lembur} radius={[2, 2, 0, 0]} maxBarSize={16} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

