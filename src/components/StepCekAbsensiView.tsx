import React, { useState, useMemo } from "react";
import { Download, Activity, Search, X, Filter } from "lucide-react";
import { KaryawanCek, KATEGORI_FILE } from "../types/attendance";
import { hitungPola } from "../utils/attendanceEngine";
import { buildCekKategoriXlsx, downloadBlob } from "../utils/excelExporter";
import { CekSummaryKaryawanTable, SummaryKaryawanRow } from "./cek-absensi/CekSummaryKaryawanTable";
import { CekDetailKejadianTable, DetailKejadianRow } from "./cek-absensi/CekDetailKejadianTable";
import { CekSummaryProjectTable } from "./cek-absensi/CekSummaryProjectTable";
import { CekTindakLanjutTable } from "./cek-absensi/CekTindakLanjutTable";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("ALL");

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

  const cleanQuery = searchQuery.trim().toLowerCase();

  // 1. Raw Data for Summary Karyawan
  const allSummaryKaryawanRows = useMemo<SummaryKaryawanRow[]>(() => {
    const rows: SummaryKaryawanRow[] = [];
    karyawan.forEach(k => {
      let ev = k.kejadian.filter(e => e[2] === activeKat);

      // Handle sub-filtering for BA (BA_H or BA_A)
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
  }, [karyawan, activeKat, selectedTypeFilter]);

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
  }, [karyawan, activeKat, selectedTypeFilter]);

  // Filtered Detail Rows based on search query
  const filteredDetailRows = useMemo(() => {
    if (!cleanQuery) return allDetailRows;
    return allDetailRows.filter(r =>
      [r.nuc, r.nama, r.jabatan, r.project, r.tanggal, r.kode, r.status]
        .some(val => String(val || "").toLowerCase().includes(cleanQuery))
    );
  }, [allDetailRows, cleanQuery]);

  // 3. Raw Data for Summary Project (Aggregated from Filtered Detail Rows)
  const filteredPerProject = useMemo(() => {
    const map: Record<string, { karyawanSet: Set<string>; incidentCount: number; baH: number; baA: number }> = {};

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
  }, [filteredDetailRows]);

  // 4. Raw Data for Perlu Tindak Lanjut
  const allPolas = useMemo(() => {
    if (activeKat === "ALFA" || activeKat === "SAKIT" || activeKat === "IZIN") {
      return hitungPola(karyawan, activeKat, hariBelumFinal);
    }
    return [];
  }, [karyawan, activeKat, hariBelumFinal]);

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
            placeholder="Ketik nama karyawan, NIK, jabatan, atau proyek untuk mencari..."
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
              if (["ALFA", "SAKIT", "IZIN", "LEMBUR", "BA"].includes(val)) {
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
          </select>
        </div>
      </div>

      {/* Category Tabs (5 Categories) */}
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

      {/* Sub-view Switcher with Live Filtered Counts */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="p-3 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSubTab("summary")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                subTab === "summary"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Rekap Karyawan ({filteredSummaryKaryawanRows.length})
            </button>
            <button
              onClick={() => setSubTab("detail")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                subTab === "detail"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Rincian Tanggal ({filteredDetailRows.length})
            </button>
            <button
              onClick={() => setSubTab("project")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                subTab === "project"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Rekap per Proyek ({Object.keys(filteredPerProject).length})
            </button>
            {(activeKat === "ALFA" || activeKat === "SAKIT" || activeKat === "IZIN") && (
              <button
                onClick={() => setSubTab("tindak_lanjut")}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                  subTab === "tindak_lanjut"
                    ? "bg-rose-100 text-rose-900 font-semibold shadow-2xs"
                    : "text-rose-700 hover:bg-rose-50"
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                Perlu Tindak Lanjut ({filteredPolas.length})
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
            {cleanQuery && (
              <span className="text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md font-mono">
                Hasil pencarian &quot;{searchQuery}&quot;
              </span>
            )}
            <span>
              Total Ditampilkan:{" "}
              <strong className="text-slate-800 tabular-nums font-mono">
                {filteredDetailRows.length}
              </strong>
            </span>
          </div>
        </div>

        {/* View 1: Summary Karyawan */}
        {subTab === "summary" && (
          <CekSummaryKaryawanTable
            rows={filteredSummaryKaryawanRows}
            activeKat={activeKat}
            searchQuery={searchQuery}
            onResetSearch={handleResetSearch}
          />
        )}

        {/* View 2: Detail Kejadian */}
        {subTab === "detail" && (
          <CekDetailKejadianTable
            rows={filteredDetailRows}
            activeKat={activeKat}
            searchQuery={searchQuery}
            onResetSearch={handleResetSearch}
          />
        )}

        {/* View 3: Summary Project */}
        {subTab === "project" && (
          <CekSummaryProjectTable
            filteredPerProject={filteredPerProject}
            activeKat={activeKat}
            searchQuery={searchQuery}
            onResetSearch={handleResetSearch}
          />
        )}

        {/* View 4: Perlu Tindak Lanjut */}
        {subTab === "tindak_lanjut" && (
          <CekTindakLanjutTable
            filteredPolas={filteredPolas}
            activeKat={activeKat}
            hariBelumFinalCount={hariBelumFinal.size}
            searchQuery={searchQuery}
            onResetSearch={handleResetSearch}
          />
        )}
      </div>
    </div>
  );
};
