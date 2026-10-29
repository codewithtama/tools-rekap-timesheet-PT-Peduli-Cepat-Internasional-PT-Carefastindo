import React, { useState, useMemo } from "react";
import { Download, Activity, Search, X, Filter, Info, Clock } from "lucide-react";
import { KaryawanCek, KATEGORI_FILE, LateIncident } from "../types/attendance";
import {
  hitungPola,
  aggregateLateByEmployee,
  aggregateLateByProject,
  detectLatePatterns,
  formatDurasiMenit,
} from "../utils/attendanceEngine";
import {
  buildCekKategoriXlsx,
  buildCekKeterlambatanXlsx,
  downloadBlob,
} from "../utils/excelExporter";
import { CekSummaryKaryawanTable, SummaryKaryawanRow } from "./cek-absensi/CekSummaryKaryawanTable";
import { CekDetailKejadianTable, DetailKejadianRow } from "./cek-absensi/CekDetailKejadianTable";
import { CekSummaryProjectTable } from "./cek-absensi/CekSummaryProjectTable";
import { CekTindakLanjutTable } from "./cek-absensi/CekTindakLanjutTable";

interface StepCekAbsensiViewProps {
  karyawan: KaryawanCek[];
  periodeTxt: string;
  hariBelumFinal: Set<string>;
  lateIncidents?: LateIncident[];
  latePeriodeTxt?: string;
}

export const StepCekAbsensiView: React.FC<StepCekAbsensiViewProps> = ({
  karyawan,
  periodeTxt,
  hariBelumFinal,
  lateIncidents = [],
  latePeriodeTxt,
}) => {
  const [activeKat, setActiveKat] = useState<"ALFA" | "SAKIT" | "IZIN" | "LEMBUR" | "BA" | "TERLAMBAT">("ALFA");
  const [subTab, setSubTab] = useState<"summary" | "detail" | "project" | "tindak_lanjut">("summary");
  const [downloading, setDownloading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("ALL");

  const activeKatConfig = KATEGORI_FILE.find(k => k[1] === activeKat);

  const handleDownloadXlsx = async () => {
    setDownloading(true);
    try {
      const stempel = periodeTxt ? periodeTxt.replace(/[^A-Za-z0-9]+/g, "-") : "EXPORT";

      if (activeKat === "TERLAMBAT") {
        const blob = await buildCekKeterlambatanXlsx(lateIncidents, latePeriodeTxt || periodeTxt);
        downloadBlob(blob, `CEK_TERLAMBAT_${stempel}.xlsx`);
      } else {
        const blob = await buildCekKategoriXlsx(
          karyawan,
          activeKat,
          activeKatConfig ? activeKatConfig[2] : activeKat,
          periodeTxt,
          hariBelumFinal
        );
        downloadBlob(blob, `CEK_${activeKat}_${stempel}.xlsx`);
      }
    } catch (err) {
      console.error(err);
      alert("Gagal mengunduh file: " + (err as Error).message);
    } finally {
      setDownloading(false);
    }
  };

  const cleanQuery = searchQuery.trim().toLowerCase();

  // 1. Raw Data for Summary Karyawan
  const allSummaryKaryawanRows = useMemo<SummaryKaryawanRow[]>(() => {
    if (activeKat === "TERLAMBAT") {
      const lateSummaries = aggregateLateByEmployee(lateIncidents);
      return lateSummaries.map(s => ({
        nuc: s.nuc,
        nama: s.nama,
        jabatan: s.jabatan,
        project: s.project,
        total: s.frekuensi,
        totalMenit: s.totalMenit,
        tanggal: s.tanggalList.join(", "),
      }));
    }

    const rows: SummaryKaryawanRow[] = [];
    karyawan.forEach(k => {
      let ev = k.kejadian.filter(e => e[2] === activeKat);

      if (activeKat === "BA") {
        if (selectedTypeFilter === "BA_H") {
          ev = ev.filter(e => e[1] === "h");
        } else if (selectedTypeFilter === "BA_A") {
          ev = ev.filter(e => e[1] === "a");
        }
      }

      if (ev.length === 0) return;

      if (activeKat === "BA") {
        const nh = ev.filter(e => e[1] === "h").length;
        const na = ev.length - nh;
        const tgl = ev.map(e => `${e[0]} (${e[1]})`).join(", ");
        rows.push({
          nuc: k.nuc,
          nama: k.nama,
          jabatan: k.jabatan,
          project: k.project,
          baH: nh,
          baA: na,
          total: ev.length,
          tanggal: tgl,
        });
      } else if (activeKat === "ALFA") {
        const na = ev.filter(e => e[1] === "a").length;
        const tgl = ev
          .map(e => (e[1] === "a" ? `${e[0]} (a - BA ditolak)` : `${e[0]} (A)`))
          .join(", ");
        rows.push({
          nuc: k.nuc,
          nama: k.nama,
          jabatan: k.jabatan,
          project: k.project,
          baA: na,
          total: ev.length,
          tanggal: tgl || "-",
        });
      } else {
        const tgl = ev.map(e => e[0]).filter(t => t !== "-").join(", ");
        rows.push({
          nuc: k.nuc,
          nama: k.nama,
          jabatan: k.jabatan,
          project: k.project,
          total: ev.length,
          tanggal: tgl || "-",
        });
      }
    });
    return rows;
  }, [karyawan, activeKat, selectedTypeFilter, lateIncidents]);

  // Filtered Summary Karyawan Rows based on search query
  const filteredSummaryKaryawanRows = useMemo(() => {
    if (!cleanQuery) return allSummaryKaryawanRows;
    return allSummaryKaryawanRows.filter(r =>
      [r.nuc, r.nama, r.jabatan, r.project, r.tanggal]
        .some(val => String(val || "").toLowerCase().includes(cleanQuery))
    );
  }, [allSummaryKaryawanRows, cleanQuery]);

  // 2. Raw Data for Detail Kejadian
  const allDetailRows = useMemo<DetailKejadianRow[]>(() => {
    if (activeKat === "TERLAMBAT") {
      return lateIncidents.map(inc => ({
        nuc: inc.nuc,
        nama: inc.nama,
        jabatan: inc.jabatan,
        project: inc.project,
        tanggal: inc.tanggal,
        kode: formatDurasiMenit(inc.menit),
        status: `Masuk: ${inc.jamMasuk} (Jadwal: ${inc.jadwalMulai})`,
      }));
    }

    const rows: DetailKejadianRow[] = [];
    karyawan.forEach(k => {
      let ev = k.kejadian.filter(e => e[2] === activeKat);

      if (activeKat === "BA") {
        if (selectedTypeFilter === "BA_H") {
          ev = ev.filter(e => e[1] === "h");
        } else if (selectedTypeFilter === "BA_A") {
          ev = ev.filter(e => e[1] === "a");
        }
      }

      ev.forEach(([t, kode]) => {
        let status = "";
        if (activeKat === "BA") {
          status = kode === "h" ? "BA Diterima (Hadir)" : "BA Ditolak (Alfa)";
        } else if (activeKat === "ALFA") {
          status = kode === "a" ? "BA Ditolak (Tetap Alfa)" : "Alfa Murni";
        }
        rows.push({
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
    return rows;
  }, [karyawan, activeKat, selectedTypeFilter, lateIncidents]);

  // Filtered Detail Rows based on search query
  const filteredDetailRows = useMemo(() => {
    if (!cleanQuery) return allDetailRows;
    return allDetailRows.filter(r =>
      [r.nuc, r.nama, r.jabatan, r.project, r.tanggal, r.kode, r.status]
        .some(val => String(val || "").toLowerCase().includes(cleanQuery))
    );
  }, [allDetailRows, cleanQuery]);

  // 3. Raw Data for Summary Project
  const filteredPerProject = useMemo(() => {
    if (activeKat === "TERLAMBAT") {
      const map: Record<string, { karyawanSet: Set<string>; incidentCount: number; baH: number; baA: number; totalMenit: number }> = {};
      lateIncidents.forEach(inc => {
        const proj = inc.project || "Tanpa Project";
        if (cleanQuery) {
          const match = [inc.nuc, inc.nama, inc.jabatan, proj, inc.tanggal].some(val =>
            String(val || "").toLowerCase().includes(cleanQuery)
          );
          if (!match) return;
        }
        if (!map[proj]) {
          map[proj] = { karyawanSet: new Set(), incidentCount: 0, baH: 0, baA: 0, totalMenit: 0 };
        }
        map[proj].karyawanSet.add(`${inc.nuc}___${inc.nama}`);
        map[proj].incidentCount++;
        map[proj].totalMenit += inc.menit;
      });
      return map;
    }

    const map: Record<string, { karyawanSet: Set<string>; incidentCount: number; baH: number; baA: number; totalMenit?: number }> = {};
    filteredDetailRows.forEach(r => {
      if (!map[r.project]) {
        map[r.project] = { karyawanSet: new Set(), incidentCount: 0, baH: 0, baA: 0 };
      }
      map[r.project].karyawanSet.add(`${r.nuc}___${r.nama}`);
      map[r.project].incidentCount++;
      if (r.kode === "h") map[r.project].baH++;
      if (r.kode === "a") map[r.project].baA++;
    });

    return map;
  }, [filteredDetailRows, activeKat]);

  // 4. Raw Data for Perlu Tindak Lanjut
  const allPolas = useMemo(() => {
    if (activeKat === "TERLAMBAT") {
      const summaries = aggregateLateByEmployee(lateIncidents);
      return detectLatePatterns(summaries, 3);
    }
    if (activeKat === "ALFA" || activeKat === "SAKIT" || activeKat === "IZIN") {
      return hitungPola(karyawan, activeKat, hariBelumFinal);
    }
    return [];
  }, [karyawan, activeKat, hariBelumFinal, lateIncidents]);

  // Filtered Polas based on search query
  const filteredPolas = useMemo(() => {
    if (!cleanQuery) return allPolas;
    return allPolas.filter(p =>
      [p.nuc, p.nama, p.jabatan, p.project, p.pola, p.detail]
        .some(val => String(val || "").toLowerCase().includes(cleanQuery))
    );
  }, [allPolas, cleanQuery]);

  const handleResetSearch = () => {
    setSearchQuery("");
    setSelectedTypeFilter("ALL");
  };

  return (
    <div className="space-y-4">
      {/* Global Search Bar & Anomaly Filter Toolbar */}
      <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input Box */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Ketik nama karyawan, NIK/NUC, jabatan, atau proyek untuk mencari..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-900 focus:border-blue-900 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full cursor-pointer"
              title="Bersihkan pencarian"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Anomaly Type Dropdown Filter */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Pilihan Kategori:</span>
          </div>
          <select
            value={selectedTypeFilter}
            onChange={e => {
              const val = e.target.value;
              setSelectedTypeFilter(val);
              if (["ALFA", "SAKIT", "IZIN", "LEMBUR", "BA", "TERLAMBAT"].includes(val)) {
                setActiveKat(val as any);
              } else if (val === "BA_H" || val === "BA_A") {
                setActiveKat("BA");
              }
            }}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 font-medium focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-900 cursor-pointer"
          >
            <option value="ALL">Semua di {activeKat}</option>
            <option value="ALFA">Alfa (A / a)</option>
            <option value="SAKIT">Sakit (S / SR)</option>
            <option value="IZIN">Izin (I / IR)</option>
            <option value="LEMBUR">Lembur (G)</option>
            <option value="BA">Semua BA (h &amp; a)</option>
            <option value="BA_H">BA Diterima / Hadir (h)</option>
            <option value="BA_A">BA Ditolak / Alfa (a)</option>
            {lateIncidents.length > 0 && <option value="TERLAMBAT">Keterlambatan Menit</option>}
          </select>
        </div>
      </div>

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
                  if (selectedTypeFilter !== "ALL" && !selectedTypeFilter.startsWith(kat)) {
                    setSelectedTypeFilter("ALL");
                  }
                  if (subTab === "tindak_lanjut" && (kat === "LEMBUR" || kat === "BA")) {
                    setSubTab("summary");
                  }
                }}
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
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

          {/* Tab Tambahan: TERLAMBAT (bila file diunggah) */}
          {lateIncidents.length > 0 && (
            <button
              onClick={() => {
                setActiveKat("TERLAMBAT");
                setSelectedTypeFilter("TERLAMBAT");
              }}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeKat === "TERLAMBAT"
                  ? "bg-amber-800 text-white shadow-xs"
                  : "text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/80"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>TERLAMBAT</span>
              <span className="text-[10px] opacity-75 font-normal font-mono">
                (&gt;0 m)
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeKat === "TERLAMBAT"
                    ? "bg-white/20 text-white"
                    : "bg-amber-200 text-amber-900"
                }`}
              >
                {lateIncidents.length}
              </span>
            </button>
          )}
        </div>

        <button
          onClick={handleDownloadXlsx}
          disabled={downloading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          {downloading ? "Membuat file..." : `Unduh CEK_${activeKat}.xlsx`}
        </button>
      </div>

      {/* Info Banner on Category Rules */}
      {activeKat === "ALFA" && (
        <div className="flex items-start gap-2.5 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900">
          <Info className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Aturan Operasional Alfa:</span> Sesuai regulasi absensi, kategori{" "}
            <strong>ALFA (A/a)</strong> mencakup kode <strong>A (Alfa Murni)</strong> dan kode{" "}
            <strong>a (BA Ditolak)</strong> yang tetap dihitung sebagai Alfa.
          </div>
        </div>
      )}

      {activeKat === "BA" && (
        <div className="flex items-start gap-2.5 p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-900">
          <Info className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Keterangan Berita Acara (BA):</span> Kode <strong>h</strong> adalah BA Diterima (dihitung Masuk / Hadir), sedangkan kode <strong>a</strong> adalah BA Ditolak (tetap dihitung Alfa).
          </div>
        </div>
      )}

      {activeKat === "TERLAMBAT" && (
        <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950">
          <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Laporan Keterlambatan:</span> Menghitung seluruh kejadian dengan{" "}
            <strong>Keterlambatan &gt; 0 menit</strong> berdasarkan selisih jam masuk aktual terhadap jadwal mulai kerja.
          </div>
        </div>
      )}

      {/* Sub Tabs: Summary Karyawan | Detail Kejadian | Summary Project | Perlu Tindak Lanjut */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="flex border-b border-slate-200 bg-slate-50/70 px-4 pt-2 gap-2 overflow-x-auto select-none">
          <button
            onClick={() => setSubTab("summary")}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              subTab === "summary"
                ? "border-blue-900 text-blue-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Summary Karyawan ({filteredSummaryKaryawanRows.length})
          </button>
          <button
            onClick={() => setSubTab("detail")}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              subTab === "detail"
                ? "border-blue-900 text-blue-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Detail Kejadian ({filteredDetailRows.length})
          </button>
          <button
            onClick={() => setSubTab("project")}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              subTab === "project"
                ? "border-blue-900 text-blue-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Summary Project ({Object.keys(filteredPerProject).length})
          </button>
          {(activeKat === "ALFA" || activeKat === "SAKIT" || activeKat === "IZIN" || activeKat === "TERLAMBAT") && (
            <button
              onClick={() => setSubTab("tindak_lanjut")}
              className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                subTab === "tindak_lanjut"
                  ? "border-rose-600 text-rose-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-rose-600" />
              <span>{activeKat === "TERLAMBAT" ? "Sering Terlambat (≥3x)" : "Perlu Tindak Lanjut"}</span>
              {filteredPolas.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-rose-100 text-rose-800 font-bold">
                  {filteredPolas.length}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Tab 1: Summary Karyawan */}
        {subTab === "summary" && (
          <CekSummaryKaryawanTable
            rows={filteredSummaryKaryawanRows}
            activeKat={activeKat}
            searchQuery={searchQuery}
            onResetSearch={handleResetSearch}
          />
        )}

        {/* Tab 2: Detail Kejadian */}
        {subTab === "detail" && (
          <CekDetailKejadianTable
            rows={filteredDetailRows}
            activeKat={activeKat}
            searchQuery={searchQuery}
            onResetSearch={handleResetSearch}
          />
        )}

        {/* Tab 3: Summary Project */}
        {subTab === "project" && (
          <CekSummaryProjectTable
            filteredPerProject={filteredPerProject}
            activeKat={activeKat}
            searchQuery={searchQuery}
            onResetSearch={handleResetSearch}
          />
        )}

        {/* Tab 4: Perlu Tindak Lanjut */}
        {subTab === "tindak_lanjut" && (
          <CekTindakLanjutTable
            filteredPolas={filteredPolas}
            activeKat={activeKat === "TERLAMBAT" ? "ALFA" : activeKat}
            hariBelumFinalCount={activeKat === "TERLAMBAT" ? 0 : hariBelumFinal.size}
            searchQuery={searchQuery}
            onResetSearch={handleResetSearch}
          />
        )}
      </div>
    </div>
  );
};
