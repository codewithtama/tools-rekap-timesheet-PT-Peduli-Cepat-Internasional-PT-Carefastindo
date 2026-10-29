import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { KpiTotals } from "./AnalyticsKpiCards";

export interface PieChartItem {
  name: string;
  value: number;
  color: string;
}

interface AttendanceCategoryPieChartProps {
  pieData: PieChartItem[];
  kpiTotals: KpiTotals;
}

export const AttendanceCategoryPieChart: React.FC<AttendanceCategoryPieChartProps> = ({
  pieData,
  kpiTotals,
}) => {
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

  return (
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
  );
};

