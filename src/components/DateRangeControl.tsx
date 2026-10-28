import React from "react";
import { Calendar, AlertCircle, Check } from "lucide-react";
import { tglId, toISODate, parseISODate, jmlHari } from "../utils/attendanceEngine";

interface DateRangeControlProps {
  awal: Date;
  akhir: Date;
  dariTanggal: Date;
  sampaiTanggal: Date;
  onRangeChange: (dari: Date, sampai: Date) => void;
  hariBelumFinal: Record<string, [number, number]>;
  prosesSemua: boolean;
  onToggleSemua: () => void;
}

export const DateRangeControl: React.FC<DateRangeControlProps> = ({
  awal,
  akhir,
  dariTanggal,
  sampaiTanggal,
  onRangeChange,
  hariBelumFinal,
  prosesSemua,
  onToggleSemua,
}) => {
  const datesBelumFinal = Object.keys(hariBelumFinal).sort();
  const hasHariBerjalan = datesBelumFinal.length > 0;

  let totalA = 0;
  let totalTdk = 0;
  datesBelumFinal.forEach(iso => {
    totalA += hariBelumFinal[iso][0];
    totalTdk += hariBelumFinal[iso][1];
  });

  const namaTglBelumFinal =
    datesBelumFinal.length === 1
      ? tglId(parseISODate(datesBelumFinal[0]))
      : `${tglId(parseISODate(datesBelumFinal[0]))} s/d ${tglId(
          parseISODate(datesBelumFinal[datesBelumFinal.length - 1])
        )}`;

  const minIso = toISODate(awal);
  const maxIso = toISODate(akhir);

  const handleDariChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) return;
    const newDari = parseISODate(val);
    if (newDari <= sampaiTanggal) {
      onRangeChange(newDari, sampaiTanggal);
    }
  };

  const handleSampaiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) return;
    const newSampai = parseISODate(val);
    if (newSampai >= dariTanggal) {
      onRangeChange(dariTanggal, newSampai);
    }
  };

  const isDipotong =
    !prosesSemua &&
    (toISODate(dariTanggal) !== minIso || toISODate(sampaiTanggal) !== maxIso);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 shadow-2xs">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Detected Range Info */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-900 flex items-center justify-center shrink-0 mt-0.5">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Periode Terdeteksi Sistem
            </div>
            <div className="text-sm font-bold text-slate-800">
              {tglId(awal)} s/d {tglId(akhir)}
              <span className="ml-2 font-normal text-xs text-slate-500">
                ({jmlHari(awal, akhir)} hari)
              </span>
            </div>
            {isDipotong && (
              <div className="text-xs text-blue-700 font-medium mt-0.5">
                Dipakai: {tglId(dariTanggal)} s/d {tglId(sampaiTanggal)} ({jmlHari(dariTanggal, sampaiTanggal)} hari)
              </div>
            )}
          </div>
        </div>

        {/* Right: Date Inputs and All Period Toggle */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <label className="text-slate-600 font-medium">Dari:</label>
            <input
              type="date"
              min={minIso}
              max={toISODate(sampaiTanggal)}
              value={toISODate(dariTanggal)}
              disabled={prosesSemua}
              onChange={handleDariChange}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-800 disabled:bg-slate-100 disabled:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <label className="text-slate-600 font-medium">Sampai:</label>
            <input
              type="date"
              min={toISODate(dariTanggal)}
              max={maxIso}
              value={toISODate(sampaiTanggal)}
              disabled={prosesSemua}
              onChange={handleSampaiChange}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-800 disabled:bg-slate-100 disabled:text-slate-400"
            />
          </div>

          <button
            type="button"
            onClick={onToggleSemua}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              prosesSemua
                ? "bg-blue-900 text-white border-blue-900 shadow-xs"
                : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
            }`}
          >
            {prosesSemua && <Check className="w-3.5 h-3.5" />}
            Proses Seluruh Periode (--semua)
          </button>
        </div>
      </div>

      {/* Hari Berjalan Alert Banner */}
      {hasHariBerjalan && !prosesSemua && (
        <div className="mt-3 pt-3 border-t border-amber-200/60 bg-amber-50/70 -mx-4 -mb-4 p-3.5 rounded-b-xl flex items-start gap-2.5 text-xs text-amber-900">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold">
              Perhatian: Tanggal {namaTglBelumFinal} terdeteksi belum ditutup sistem (hari berjalan).
            </span>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              {totalTdk} dari {totalA} kode A pada tanggal itu belum dihitung oleh total bawaan sistem, sehingga kemungkinan besar bukan Alfa sungguhan.
              Filter &quot;Sampai&quot; secara otomatis diarahkan ke tanggal final terakhir ({tglId(sampaiTanggal)}).
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
