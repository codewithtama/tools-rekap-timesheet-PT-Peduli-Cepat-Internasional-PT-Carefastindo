import React, { useState } from "react";
import { Download, AlertCircle, FileSpreadsheet, Users, ListFilter, Activity } from "lucide-react";
import { KaryawanCek, KATEGORI_FILE } from "../types/attendance";
import { hitungPola } from "../utils/attendanceEngine";
import { buildCekKategoriXlsx, downloadBlob } from "../utils/excelExporter";

interface StepCekAbsensiViewProps {
  karyawan: KaryawanCek[];
  periodeTxt: string;
  hariBelumFinal: Set<string>;
}

export const StepCekAbsensiView: React.FC<StepCekAbsensiViewProps> = ({
  karyawan,
  periodeTxt,
  hariBelumFinal,
}) => {
  const [activeKat, setActiveKat] = useState<"ALFA" | "SAKIT" | "IZIN" | "LEMBUR" | "BA">("ALFA");
  const [subTab, setSubTab] = useState<"summary" | "detail" | "project" | "tindak_lanjut">("summary");
  const [downloading, setDownloading] = useState(false);

  const activeKatConfig = KATEGORI_FILE.find(k => k[1] === activeKat) || KATEGORI_FILE[0];

  const handleDownloadXlsx = async () => {
    setDownloading(true);
    try {
      const blob = await buildCekKategoriXlsx(
        karyawan,
        activeKat,
        activeKatConfig[2],
        periodeTxt,
        hariBelumFinal
      );
      const stempel = periodeTxt ? periodeTxt.replace(/[^A-Za-z0-9]+/g, "-") : "EXPORT";
      downloadBlob(blob, `CEK_${activeKat}_${stempel}.xlsx`);
    } catch (err) {
      console.error(err);
      alert("Gagal mengunduh file: " + (err as Error).message);
    } finally {
      setDownloading(false);
    }
  };

  // 1. Data for Summary Karyawan
  const summaryKaryawanRows: any[] = [];
  const perProject: Record<string, { karyawanCount: number; incidentCount: number; baH?: number; baA?: number }> = {};
  let totalIncidents = 0;
  let totalBaH = 0;
  let totalBaA = 0;

  karyawan.forEach(k => {
    const ev = k.kejadian.filter(e => e[2] === activeKat);
    if (ev.length === 0) return;

    if (!perProject[k.project]) {
      perProject[k.project] = { karyawanCount: 0, incidentCount: 0, baH: 0, baA: 0 };
    }
    perProject[k.project].karyawanCount++;
    perProject[k.project].incidentCount += ev.length;
    totalIncidents += ev.length;

    if (activeKat === "BA") {
      const nh = ev.filter(e => e[1] === "h").length;
      const na = ev.length - nh;
      perProject[k.project].baH = (perProject[k.project].baH || 0) + nh;
      perProject[k.project].baA = (perProject[k.project].baA || 0) + na;
      totalBaH += nh;
      totalBaA += na;
      const tgl = ev.map(e => `${e[0]} (${e[1]})`).join(", ");
      summaryKaryawanRows.push({
        nuc: k.nuc,
        nama: k.nama,
        jabatan: k.jabatan,
        project: k.project,
        baH: nh,
        baA: na,
        total: ev.length,
        tanggal: tgl,
      });
    } else {
      const tgl = ev.map(e => e[0]).filter(t => t !== "-").join(", ");
      summaryKaryawanRows.push({
        nuc: k.nuc,
        nama: k.nama,
        jabatan: k.jabatan,
        project: k.project,
        total: ev.length,
        tanggal: tgl || "-",
      });
    }
  });

  // 2. Data for Detail Kejadian
  const detailRows: any[] = [];
  karyawan.forEach(k => {
    k.kejadian.filter(e => e[2] === activeKat).forEach(([t, kode]) => {
      let status = "";
      if (activeKat === "BA") {
        status = kode === "h" ? "BA Diterima (Hadir)" : "BA Ditolak (Alfa)";
      }
      detailRows.push({
        nuc: k.nuc,
        nama: k.nama,
        jabatan: k.jabatan,
        project: k.project,
        tanggal: t,
        kode,
        status,
      });
    });
  });

  // 3. Data for Perlu Tindak Lanjut
  const polas =
    activeKat === "ALFA" || activeKat === "SAKIT" || activeKat === "IZIN"
      ? hitungPola(karyawan, activeKat, hariBelumFinal)
      : [];

  return (
    <div className="space-y-4">
      {/* Category Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 p-2.5 rounded-xl shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {KATEGORI_FILE.map(([, kat, kodeTxt]) => {
            const count = karyawan.filter(k => k.kejadian.some(e => e[2] === kat)).length;
            const isSelected = activeKat === kat;
            return (
              <button
                key={kat}
                onClick={() => {
                  setActiveKat(kat as any);
                  if (subTab === "tindak_lanjut" && (kat === "LEMBUR" || kat === "BA")) {
                    setSubTab("summary");
                  }
                }}
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  isSelected
                    ? "bg-blue-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <span>{kat}</span>
                <span className="text-[10px] opacity-75 font-normal font-mono">
                  ({kodeTxt})
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={handleDownloadXlsx}
          disabled={downloading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          {downloading ? "Membuat..." : `Unduh CEK_${activeKat}.xlsx`}
        </button>
      </div>

      {/* Sub-view View Switcher (Summary, Detail, Project, Tindak Lanjut) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="p-3 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSubTab("summary")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                subTab === "summary"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Summary Karyawan ({summaryKaryawanRows.length})
            </button>
            <button
              onClick={() => setSubTab("detail")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                subTab === "detail"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Detail Kejadian ({detailRows.length})
            </button>
            <button
              onClick={() => setSubTab("project")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                subTab === "project"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Summary Project ({Object.keys(perProject).length})
            </button>
            {(activeKat === "ALFA" || activeKat === "SAKIT" || activeKat === "IZIN") && (
              <button
                onClick={() => setSubTab("tindak_lanjut")}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 ${
                  subTab === "tindak_lanjut"
                    ? "bg-rose-100 text-rose-900 font-semibold shadow-2xs"
                    : "text-rose-700 hover:bg-rose-50"
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                Perlu Tindak Lanjut ({polas.length})
              </button>
            )}
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Total Kejadian: <strong className="text-slate-800">{totalIncidents}</strong>
          </div>
        </div>

        {/* View Content 1: Summary Karyawan */}
        {subTab === "summary" && (
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[#1F3864] text-white sticky top-0 z-10 select-none">
                <tr>
                  <th className="px-2.5 py-2 border border-slate-400 text-center w-10">No</th>
                  <th className="px-3 py-2 border border-slate-400 text-center w-28">NUC</th>
                  <th className="px-3 py-2 border border-slate-400 text-left min-w-[180px]">Nama</th>
                  <th className="px-3 py-2 border border-slate-400 text-left min-w-[140px]">Jabatan</th>
                  <th className="px-3 py-2 border border-slate-400 text-left min-w-[180px]">Project</th>
                  {activeKat === "BA" ? (
                    <>
                      <th className="px-2.5 py-2 border border-slate-400 text-center w-24">BA Diterima (h)</th>
                      <th className="px-2.5 py-2 border border-slate-400 text-center w-24">BA Ditolak (a)</th>
                      <th className="px-2.5 py-2 border border-slate-400 text-center w-20">Total BA</th>
                    </>
                  ) : (
                    <th className="px-2.5 py-2 border border-slate-400 text-center w-20">Jumlah</th>
                  )}
                  <th className="px-3 py-2 border border-slate-400 text-left min-w-[200px]">Tanggal Kejadian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {summaryKaryawanRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                      Tidak ada data {activeKat} pada periode ini.
                    </td>
                  </tr>
                ) : (
                  summaryKaryawanRows.map((r, i) => (
                    <tr key={i} className={i % 2 === 1 ? "bg-slate-50/50" : "bg-white"}>
                      <td className="px-2.5 py-1.5 border border-slate-200 text-center font-mono text-[11px] text-slate-500">
                        {i + 1}
                      </td>
                      <td className="px-3 py-1.5 border border-slate-200 font-mono text-slate-700">
                        {r.nuc}
                      </td>
                      <td className="px-3 py-1.5 border border-slate-200 font-medium text-slate-900">
                        {r.nama}
                      </td>
                      <td className="px-3 py-1.5 border border-slate-200 text-slate-600">
                        {r.jabatan}
                      </td>
                      <td className="px-3 py-1.5 border border-slate-200 text-slate-800">
                        {r.project}
                      </td>
                      {activeKat === "BA" ? (
                        <>
                          <td className="px-2.5 py-1.5 border border-slate-200 text-center font-bold text-sky-800 bg-sky-50/30 tabular-nums">
                            {r.baH}
                          </td>
                          <td className="px-2.5 py-1.5 border border-slate-200 text-center font-bold text-rose-800 bg-rose-50/30 tabular-nums">
                            {r.baA}
                          </td>
                          <td className="px-2.5 py-1.5 border border-slate-200 text-center font-bold text-slate-900 tabular-nums">
                            {r.total}
                          </td>
                        </>
                      ) : (
                        <td className="px-2.5 py-1.5 border border-slate-200 text-center font-bold text-slate-900 tabular-nums">
                          {r.total}
                        </td>
                      )}
                      <td className="px-3 py-1.5 border border-slate-200 text-slate-600 text-[11px]">
                        {r.tanggal}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* View Content 2: Detail Kejadian */}
        {subTab === "detail" && (
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[#1F3864] text-white sticky top-0 z-10 select-none">
                <tr>
                  <th className="px-2.5 py-2 border border-slate-400 text-center w-10">No</th>
                  <th className="px-3 py-2 border border-slate-400 text-center w-28">NUC</th>
                  <th className="px-3 py-2 border border-slate-400 text-left min-w-[180px]">Nama</th>
                  <th className="px-3 py-2 border border-slate-400 text-left min-w-[130px]">Jabatan</th>
                  <th className="px-3 py-2 border border-slate-400 text-left min-w-[180px]">Project</th>
                  <th className="px-3 py-2 border border-slate-400 text-center w-28">Tanggal</th>
                  <th className="px-2.5 py-2 border border-slate-400 text-center w-16">Kode</th>
                  {activeKat === "BA" && (
                    <th className="px-3 py-2 border border-slate-400 text-left min-w-[140px]">Status</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {detailRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                      Tidak ada detail kejadian pada kategori ini.
                    </td>
                  </tr>
                ) : (
                  detailRows.map((r, i) => (
                    <tr key={i} className={i % 2 === 1 ? "bg-slate-50/50" : "bg-white"}>
                      <td className="px-2.5 py-1.5 border border-slate-200 text-center font-mono text-[11px] text-slate-500">
                        {i + 1}
                      </td>
                      <td className="px-3 py-1.5 border border-slate-200 font-mono text-slate-700">
                        {r.nuc}
                      </td>
                      <td className="px-3 py-1.5 border border-slate-200 font-medium text-slate-900">
                        {r.nama}
                      </td>
                      <td className="px-3 py-1.5 border border-slate-200 text-slate-600">
                        {r.jabatan}
                      </td>
                      <td className="px-3 py-1.5 border border-slate-200 text-slate-800">
                        {r.project}
                      </td>
                      <td className="px-3 py-1.5 border border-slate-200 text-center font-medium text-slate-800">
                        {r.tanggal}
                      </td>
                      <td className="px-2.5 py-1.5 border border-slate-200 text-center font-mono font-bold text-blue-900">
                        {r.kode}
                      </td>
                      {activeKat === "BA" && (
                        <td className="px-3 py-1.5 border border-slate-200 font-semibold text-[11px]">
                          <span
                            className={
                              r.kode === "h"
                                ? "text-sky-700 bg-sky-50 px-2 py-0.5 rounded-sm"
                                : "text-rose-700 bg-rose-50 px-2 py-0.5 rounded-sm"
                            }
                          >
                            {r.status}
                          </span>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* View Content 3: Summary Project */}
        {subTab === "project" && (
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[#1F3864] text-white sticky top-0 z-10 select-none">
                <tr>
                  <th className="px-2.5 py-2 border border-slate-400 text-center w-10">No</th>
                  <th className="px-3 py-2 border border-slate-400 text-left min-w-[240px]">Project</th>
                  <th className="px-3 py-2 border border-slate-400 text-center w-32">Jumlah Karyawan</th>
                  {activeKat === "BA" ? (
                    <>
                      <th className="px-3 py-2 border border-slate-400 text-center w-28">BA Diterima (h)</th>
                      <th className="px-3 py-2 border border-slate-400 text-center w-28">BA Ditolak (a)</th>
                      <th className="px-3 py-2 border border-slate-400 text-center w-28">Total BA</th>
                    </>
                  ) : (
                    <th className="px-3 py-2 border border-slate-400 text-center w-32">Total Kejadian</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {Object.entries(perProject).map(([proj, stats], i) => (
                  <tr key={i} className={i % 2 === 1 ? "bg-slate-50/50" : "bg-white"}>
                    <td className="px-2.5 py-1.5 border border-slate-200 text-center font-mono text-[11px] text-slate-500">
                      {i + 1}
                    </td>
                    <td className="px-3 py-1.5 border border-slate-200 font-semibold text-slate-900">
                      {proj}
                    </td>
                    <td className="px-3 py-1.5 border border-slate-200 text-center font-mono tabular-nums">
                      {stats.karyawanCount}
                    </td>
                    {activeKat === "BA" ? (
                      <>
                        <td className="px-3 py-1.5 border border-slate-200 text-center font-mono tabular-nums text-sky-800 font-bold">
                          {stats.baH || 0}
                        </td>
                        <td className="px-3 py-1.5 border border-slate-200 text-center font-mono tabular-nums text-rose-800 font-bold">
                          {stats.baA || 0}
                        </td>
                        <td className="px-3 py-1.5 border border-slate-200 text-center font-mono tabular-nums font-bold text-slate-900">
                          {stats.incidentCount}
                        </td>
                      </>
                    ) : (
                      <td className="px-3 py-1.5 border border-slate-200 text-center font-mono tabular-nums font-bold text-slate-900">
                        {stats.incidentCount}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* View Content 4: Perlu Tindak Lanjut */}
        {subTab === "tindak_lanjut" && (
          <div>
            <div className="p-3 bg-rose-50 border-b border-rose-200 text-xs text-rose-900 leading-relaxed">
              <strong>Kriteria Pola:</strong> Beruntun (minimal 3 hari berturut-turut), Mengapit Off (kategori sama sebelum dan sesudah hari Off), Sering (minimal 3 kejadian).
              {hariBelumFinal.size > 0 && (
                <span className="block mt-0.5 text-rose-800">
                  Tanggal yang belum final diabaikan dari deteksi pola.
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
                  {polas.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-emerald-700 bg-emerald-50/50">
                        Tidak ada pola {activeKat} yang perlu ditindaklanjuti pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    polas.map(p => (
                      <tr key={p.no} className={p.no % 2 === 1 ? "bg-slate-50/50" : "bg-white"}>
                        <td className="px-2.5 py-2 border border-slate-200 text-center font-mono text-[11px] text-slate-500">
                          {p.no}
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
        )}
      </div>
    </div>
  );
};
