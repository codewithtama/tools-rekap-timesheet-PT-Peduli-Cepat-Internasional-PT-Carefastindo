/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import { Header } from "./components/Header";
import { FileUploadZone } from "./components/FileUploadZone";
import { DateRangeControl } from "./components/DateRangeControl";
import { StepKonversiView } from "./components/StepKonversiView";
import { StepSummaryView } from "./components/StepSummaryView";
import { StepCekAbsensiView } from "./components/StepCekAbsensiView";
import { StepPaketPicView } from "./components/StepPaketPicView";
import { AttendanceAnalyticsBanner } from "./components/AttendanceAnalyticsBanner";
import { TimesheetData, RekapProjectData, KaryawanCek, PicPackage } from "./types/attendance";
import {
  parseTimesheet,
  analisisHariBerjalan,
  potongData,
  hitungRekapProject,
  ekstraksiCekAbsensi,
  bangunPaketPic,
  periodeJudul,
  tglId,
} from "./utils/attendanceEngine";
import { getSampleTimesheets } from "./utils/sampleData";
import {
  buildRekapXlsx,
  buildSummaryXlsx,
  buildCekKategoriXlsx,
  buildMasterZip,
  downloadBlob,
  buildDefaultTemplateBlob,
} from "./utils/excelExporter";
import {
  FileSpreadsheet,
  Layers,
  Search,
  Send,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

export default function App() {
  const [timesheetsRaw, setTimesheetsRaw] = useState<{ name: string; content: string }[]>([]);
  const [templateLoaded, setTemplateLoaded] = useState<boolean>(false);
  const [templateFileName, setTemplateFileName] = useState<string>("");
  const [activeStep, setActiveStep] = useState<number>(1);
  const [prosesSemua, setProsesSemua] = useState<boolean>(false);
  const [customRange, setCustomRange] = useState<{ dari: Date; sampai: Date } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Parse raw timesheets into TimesheetData
  const parsedTimesheets = useMemo<TimesheetData[]>(() => {
    const list: TimesheetData[] = [];
    for (const raw of timesheetsRaw) {
      try {
        const parsed = parseTimesheet(raw.content, raw.name);
        list.push(parsed);
      } catch (err) {
        console.warn(`Gagal parse file ${raw.name}:`, err);
      }
    }
    return list;
  }, [timesheetsRaw]);

  // Detected unified period across all parsed timesheets
  const detectedPeriod = useMemo<{ awal: Date; akhir: Date } | null>(() => {
    const periods = parsedTimesheets.map(t => t.periode).filter((p): p is [Date, Date] => p !== null);
    if (periods.length === 0) return null;
    const awal = new Date(Math.min(...periods.map(p => p[0].getTime())));
    const akhir = new Date(Math.max(...periods.map(p => p[1].getTime())));
    return { awal, akhir };
  }, [parsedTimesheets]);

  // Unclosed day analysis ("hari berjalan")
  const hariBelumFinal = useMemo<Record<string, [number, number]>>(() => {
    if (parsedTimesheets.length === 0) return {};
    return analisisHariBerjalan(parsedTimesheets);
  }, [parsedTimesheets]);

  // Determine effective date range
  const effectiveRange = useMemo<{ dari: Date; sampai: Date } | null>(() => {
    if (!detectedPeriod) return null;
    if (prosesSemua) {
      return { dari: detectedPeriod.awal, sampai: detectedPeriod.akhir };
    }
    if (customRange) {
      return customRange;
    }

    // Default: if hari berjalan detected, cut back to safe day
    const datesBelum = Object.keys(hariBelumFinal).sort();
    if (datesBelum.length > 0) {
      const earliestUnclosed = new Date(datesBelum[0]);
      earliestUnclosed.setDate(earliestUnclosed.getDate() - 1);
      if (earliestUnclosed >= detectedPeriod.awal) {
        return { dari: detectedPeriod.awal, sampai: earliestUnclosed };
      }
    }

    return { dari: detectedPeriod.awal, sampai: detectedPeriod.akhir };
  }, [detectedPeriod, prosesSemua, customRange, hariBelumFinal]);

  // Slice timesheets to effective range
  const effectiveTimesheets = useMemo<TimesheetData[]>(() => {
    if (!effectiveRange) return parsedTimesheets;
    return parsedTimesheets.map(ts => {
      try {
        const { data } = potongData(ts, effectiveRange.dari, effectiveRange.sampai);
        return data;
      } catch (err) {
        return ts;
      }
    });
  }, [parsedTimesheets, effectiveRange]);

  // Step 2 Data: Project Aggregations
  const rekapProjects = useMemo<RekapProjectData[]>(() => {
    return effectiveTimesheets.map(ts => hitungRekapProject(ts));
  }, [effectiveTimesheets]);

  // Step 3 Data: Anomaly Checking
  const karyawanCek = useMemo<KaryawanCek[]>(() => {
    // Collect g_peta per file
    const gPeta: Record<string, Record<string, string[]>> = {};
    effectiveTimesheets.forEach(ts => {
      gPeta[ts.fileName] = {};
      ts.emps.forEach(e => {
        if (e.g_hari.length > 0) {
          gPeta[ts.fileName][e.nik] = e.g_hari.map(idx => {
            const d = ts.dates[idx];
            return d ? tglId(d) : ts.day_labels[idx];
          });
        }
      });
    });

    return ekstraksiCekAbsensi(effectiveTimesheets, gPeta);
  }, [effectiveTimesheets]);

  // Unclosed days set in ISO format
  const hariBelumFinalSet = useMemo<Set<string>>(() => {
    if (prosesSemua) return new Set();
    return new Set(Object.keys(hariBelumFinal));
  }, [hariBelumFinal, prosesSemua]);

  const periodeTxt = useMemo<string>(() => {
    if (!effectiveRange) return "";
    return periodeJudul(effectiveRange.dari, effectiveRange.sampai);
  }, [effectiveRange]);

  const stempel = useMemo<string>(() => {
    if (!effectiveRange) return "PERIODE";
    const d0 = effectiveRange.dari.toISOString().slice(0, 10).replace(/-/g, "");
    const d1 = effectiveRange.sampai.toISOString().slice(0, 10).replace(/-/g, "");
    return `${d0}-${d1}`;
  }, [effectiveRange]);

  // Step 4 Data: PIC Packages
  const picPackages = useMemo<PicPackage[]>(() => {
    return bangunPaketPic(karyawanCek, periodeTxt, hariBelumFinalSet);
  }, [karyawanCek, periodeTxt, hariBelumFinalSet]);

  // Cache for Rekap Blobs
  const [rekapBlobs, setRekapBlobs] = useState<Record<string, Blob>>({});

  useEffect(() => {
    let isMounted = true;
    async function generateAllRekaps() {
      const cache: Record<string, Blob> = {};
      for (const ts of effectiveTimesheets) {
        try {
          const blob = await buildRekapXlsx(ts);
          const safe = ts.proyek.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim();
          cache[safe] = blob;
        } catch (e) {
          console.error(e);
        }
      }
      if (isMounted) setRekapBlobs(cache);
    }
    if (effectiveTimesheets.length > 0) {
      generateAllRekaps();
    }
    return () => {
      isMounted = false;
    };
  }, [effectiveTimesheets]);

  // Handler: Load Preloaded Sample Timesheets
  const handleLoadSample = () => {
    setIsLoading(true);
    const samples = getSampleTimesheets();
    setTimesheetsRaw(samples.map(s => ({ name: s.fileName, content: s.content })));
    setTemplateLoaded(true);
    setTemplateFileName("SUMMARY_ABSENSI_TEMPLATE.xlsx (Sample)");
    setCustomRange(null);
    setProsesSemua(false);
    setActiveStep(1);
    setTimeout(() => {
      setIsLoading(false);
    }, 400);
  };

  // Handler: Reset Application
  const handleReset = () => {
    setTimesheetsRaw([]);
    setTemplateLoaded(false);
    setTemplateFileName("");
    setCustomRange(null);
    setProsesSemua(false);
    setActiveStep(1);
  };

  // Handler: User Uploads Timesheet Files
  const handleFilesSelected = async (files: File[]) => {
    setIsLoading(true);
    const newItems: { name: string; content: string }[] = [];

    for (const file of files) {
      try {
        const text = await file.text();
        newItems.push({ name: file.name, content: text });
      } catch (err) {
        console.error("Gagal membaca file:", file.name, err);
      }
    }

    setTimesheetsRaw(prev => [...prev, ...newItems]);
    setCustomRange(null);
    setIsLoading(false);
  };

  // Handler: User Uploads Template File
  const handleTemplateSelected = (file: File) => {
    setTemplateLoaded(true);
    setTemplateFileName(file.name);
  };

  // Handler: User Activates Default Template
  const handleActivateDefaultTemplate = async () => {
    setTemplateLoaded(true);
    setTemplateFileName("SUMMARY_ABSENSI_TEMPLATE.xlsx (Default)");
  };

  // Handler: Download Master ZIP
  const handleDownloadMasterZip = async () => {
    if (!effectiveRange) return;
    setIsLoading(true);
    try {
      // 1. Summary Blob
      let summaryBlob: Blob | null = null;
      if (templateLoaded) {
        summaryBlob = await buildSummaryXlsx(rekapProjects, effectiveRange.dari, effectiveRange.sampai);
      }

      // 2. 5 Cek Blobs
      const cekBlobs: { name: string; blob: Blob }[] = [];
      const kats: ("ALFA" | "SAKIT" | "IZIN" | "LEMBUR" | "BA")[] = [
        "ALFA", "SAKIT", "IZIN", "LEMBUR", "BA"
      ];
      for (const kat of kats) {
        const kodeTxt = kat === "BA" ? "h/a" : kat === "ALFA" ? "A/a" : kat === "SAKIT" ? "S/SR" : kat === "IZIN" ? "I/IR" : "G/g";
        const b = await buildCekKategoriXlsx(karyawanCek, kat, kodeTxt, periodeTxt, hariBelumFinalSet);
        cekBlobs.push({ name: `CEK_${kat}_${stempel}.xlsx`, blob: b });
      }

      // 3. Rekap Blobs list
      const rekapList = Object.entries(rekapBlobs).map(([safeName, blob]) => ({ safeName, blob }));

      // 4. Build Master Zip
      const masterBlob = await buildMasterZip(
        picPackages,
        periodeTxt,
        stempel,
        summaryBlob,
        cekBlobs,
        rekapList
      );

      downloadBlob(masterBlob, `PAKET_LENGKAP_ABSENSI_${stempel}.zip`);
    } catch (err) {
      console.error(err);
      alert("Gagal membuat Master ZIP: " + (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const hasData = effectiveTimesheets.length > 0;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header
        onLoadSample={handleLoadSample}
        onReset={handleReset}
        hasData={hasData}
        onDownloadAllMasterZip={hasData ? handleDownloadMasterZip : undefined}
        activeStep={activeStep}
        setActiveStep={setActiveStep}
        templateLoaded={templateLoaded}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* Upload & Dropzone Area */}
        <FileUploadZone
          onFilesSelected={handleFilesSelected}
          onTemplateSelected={handleTemplateSelected}
          templateLoaded={templateLoaded}
          templateFileName={templateFileName}
          timesheetCount={parsedTimesheets.length}
        />

        {/* Date Range Controller (if period is detected) */}
        {detectedPeriod && effectiveRange && (
          <DateRangeControl
            awal={detectedPeriod.awal}
            akhir={detectedPeriod.akhir}
            dariTanggal={effectiveRange.dari}
            sampaiTanggal={effectiveRange.sampai}
            onRangeChange={(dari, sampai) => {
              setCustomRange({ dari, sampai });
              setProsesSemua(false);
            }}
            hariBelumFinal={hariBelumFinal}
            prosesSemua={prosesSemua}
            onToggleSemua={() => {
              setProsesSemua(!prosesSemua);
              if (!prosesSemua) setCustomRange(null);
            }}
          />
        )}

        {/* Loading Overlay */}
        {isLoading && (
          <div className="p-8 text-center bg-white border border-slate-200 rounded-xl my-6 shadow-xs animate-pulse">
            <p className="text-sm font-semibold text-blue-900">
              Memproses data absensi karyawan...
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Mengekstrak shift harian, lembur, dan mendeteksi pola absensi.
            </p>
          </div>
        )}

        {/* Empty State when no timesheet loaded */}
        {!hasData && !isLoading && (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 text-center shadow-xs">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-900 flex items-center justify-center mx-auto shadow-2xs">
                <FileSpreadsheet className="w-8 h-8" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Alur Kerja Absensi 4-in-1 Otomatis
                </h2>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                  Unggah file timesheet (.xls hasil download sistem) di atas atau gunakan data contoh untuk melihat alur kerja lengkap tanpa mengubah satu pun logika perhitungan bawaan.
                </p>
              </div>

              {/* 4 Steps Explanation Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left pt-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
                  <div className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4" />
                    1. Konversi Timesheet
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Ubah timesheet sistem menjadi <code>Rekap-Absensi-*.xlsx</code> dengan rumus Excel dan format rapi.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
                  <div className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <Layers className="w-4 h-4" />
                    2. Buat Summary
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Ringkas semua proyek ke 13 kolom template standar lengkap dengan Grand Total dan pencocokan nama.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
                  <div className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <Search className="w-4 h-4" />
                    3. Cek Absensi
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Pisahkan Alfa, Sakit, Izin, Lembur, dan BA (h/a) serta deteksi pola beruntun dan apit Off.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
                  <div className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <Send className="w-4 h-4" />
                    4. Paket PIC Proyek
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Satu paket per proyek berisi file Excel, Rekap, dan draft pesan WhatsApp siap tempel ke PIC.
                  </p>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-center gap-3">
                <button
                  onClick={handleLoadSample}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-xl transition-all shadow-xs"
                >
                  <Sparkles className="w-4 h-4" />
                  Coba Sekarang dengan Contoh Data
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Real-Time Attendance Analytics Banner (Recharts) */}
        {hasData && !isLoading && (
          <AttendanceAnalyticsBanner projects={rekapProjects} />
        )}

        {/* Active Step Views */}
        {hasData && !isLoading && (
          <div className="space-y-6">
            {activeStep === 1 && <StepKonversiView timesheets={effectiveTimesheets} />}
            {activeStep === 2 && (
              <StepSummaryView
                projects={rekapProjects}
                d0={effectiveRange!.dari}
                d1={effectiveRange!.sampai}
                templateLoaded={templateLoaded}
                onActivateDefaultTemplate={handleActivateDefaultTemplate}
              />
            )}
            {activeStep === 3 && (
              <StepCekAbsensiView
                karyawan={karyawanCek}
                periodeTxt={periodeTxt}
                hariBelumFinal={hariBelumFinalSet}
              />
            )}
            {activeStep === 4 && (
              <StepPaketPicView
                packages={picPackages}
                periodeTxt={periodeTxt}
                stempel={stempel}
                onDownloadMasterZip={handleDownloadMasterZip}
                rekapBlobs={rekapBlobs}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              Logika absensi, rumus perhitungan, dan deteksi pola 100% identik dengan script <code>proses_absensi.py</code>.
            </span>
          </div>
          <div>
            PT Peduli Cepat Internasional · HRD &amp; Personalia
          </div>
        </div>
      </footer>
    </div>
  );
}
