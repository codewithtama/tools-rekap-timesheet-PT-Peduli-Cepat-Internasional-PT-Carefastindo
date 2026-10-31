/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import { Header } from "./components/Header";
import { FileUploadZone } from "./components/FileUploadZone";
import { DateRangeControl } from "./components/DateRangeControl";
import { AttendanceAnalyticsBanner } from "./components/AttendanceAnalyticsBanner";
import { StepKonversiView } from "./components/StepKonversiView";
import { StepSummaryView } from "./components/StepSummaryView";
import { StepCekAbsensiView } from "./components/StepCekAbsensiView";
import { StepPaketPicView } from "./components/StepPaketPicView";
import { EmptyStateGuide } from "./components/EmptyStateGuide";
import { CloudflareTurnstileChallenge } from "./components/CloudflareTurnstileChallenge";
import {
  TimesheetData,
  RekapProjectData,
  KaryawanCek,
  PicPackage,
  LateIncident,
} from "./types/attendance";
import {
  parseTimesheet,
  analisisHariBerjalan,
  potongData,
  hitungRekapProject,
  ekstraksiCekAbsensi,
  bangunPaketPic,
  periodeJudul,
  tglId,
  parseISODate,
  parseLaporanKeterlambatan,
} from "./utils/attendanceEngine";
import { getSampleTimesheets } from "./utils/sampleData";
import {
  buildRekapXlsx,
  buildSummaryXlsx,
  buildCekKategoriXlsx,
  buildCekKeterlambatanXlsx,
  buildMasterZip,
  downloadBlob,
} from "./utils/excelExporter";
import { ShieldCheck } from "lucide-react";

export default function App() {
  const [timesheetsRaw, setTimesheetsRaw] = useState<{ name: string; content: string }[]>([]);
  const [templateLoaded, setTemplateLoaded] = useState<boolean>(false);
  const [templateFileName, setTemplateFileName] = useState<string>("");
  const [activeStep, setActiveStep] = useState<number>(1);
  const [prosesSemua, setProsesSemua] = useState<boolean>(false);
  const [customRange, setCustomRange] = useState<{ dari: Date; sampai: Date } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [turnstileVerified, setTurnstileVerified] = useState<boolean>(false);

  // Late Incidents State (Laporan Keterlambatan)
  const [lateIncidents, setLateIncidents] = useState<LateIncident[]>([]);
  const [lateFileName, setLateFileName] = useState<string>("");
  const [latePeriodeTxt, setLatePeriodeTxt] = useState<string>("");

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

    const datesBelum = hariBelumFinal ? Object.keys(hariBelumFinal).sort() : [];
    if (datesBelum.length > 0 && datesBelum[0]) {
      const earliestUnclosed = parseISODate(datesBelum[0]);
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

  const hariBelumFinalSet = useMemo<Set<string>>(() => {
    if (prosesSemua || !hariBelumFinal) return new Set();
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

  const picPackages = useMemo<PicPackage[]>(() => {
    return bangunPaketPic(karyawanCek, periodeTxt, hariBelumFinalSet, lateIncidents);
  }, [karyawanCek, periodeTxt, hariBelumFinalSet, lateIncidents]);

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

  const handleReset = () => {
    setTimesheetsRaw([]);
    setTemplateLoaded(false);
    setTemplateFileName("");
    setLateIncidents([]);
    setLateFileName("");
    setLatePeriodeTxt("");
    setCustomRange(null);
    setProsesSemua(false);
    setActiveStep(1);
  };

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

  const handleTemplateSelected = (file: File) => {
    setTemplateLoaded(true);
    setTemplateFileName(file.name);
  };

  const handleLateFileSelected = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = parseLaporanKeterlambatan(text, file.name);
      setLateIncidents(parsed.incidents);
      setLateFileName(file.name);
      if (parsed.periodeTxt) {
        setLatePeriodeTxt(parsed.periodeTxt);
      }
    } catch (err) {
      console.error("Gagal membaca file keterlambatan:", err);
      alert("Gagal memproses file keterlambatan: " + (err as Error).message);
    }
  };

  const handleActivateDefaultTemplate = async () => {
    setTemplateLoaded(true);
    setTemplateFileName("SUMMARY_ABSENSI_TEMPLATE.xlsx (Default)");
  };

  const handleDownloadMasterZip = async () => {
    if (!effectiveRange) return;
    setIsLoading(true);
    try {
      let summaryBlob: Blob | null = null;
      if (templateLoaded) {
        summaryBlob = await buildSummaryXlsx(rekapProjects, effectiveRange.dari, effectiveRange.sampai);
      }

      const cekBlobs: { name: string; blob: Blob }[] = [];
      const kats: ("ALFA" | "SAKIT" | "IZIN" | "LEMBUR" | "BA")[] = [
        "ALFA", "SAKIT", "IZIN", "LEMBUR", "BA"
      ];
      for (const kat of kats) {
        const kodeTxt = kat === "BA" ? "h/a" : kat === "ALFA" ? "A/a" : kat === "SAKIT" ? "S/SR" : kat === "IZIN" ? "I/IR" : "G/g";
        const b = await buildCekKategoriXlsx(karyawanCek, kat, kodeTxt, periodeTxt, hariBelumFinalSet);
        cekBlobs.push({ name: `CEK_${kat}_${stempel}.xlsx`, blob: b });
      }

      // Add CEK_TERLAMBAT if late incidents exist
      if (lateIncidents.length > 0) {
        const lateBlob = await buildCekKeterlambatanXlsx(lateIncidents, latePeriodeTxt || periodeTxt);
        cekBlobs.push({ name: `CEK_TERLAMBAT_${stempel}.xlsx`, blob: lateBlob });
      }

      const rekapList = Object.entries(rekapBlobs).map(([safeName, blob]) => ({ safeName, blob }));

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

      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-5">
        <FileUploadZone
          onFilesSelected={handleFilesSelected}
          onTemplateSelected={handleTemplateSelected}
          onLateFileSelected={handleLateFileSelected}
          templateLoaded={templateLoaded}
          templateFileName={templateFileName}
          timesheetCount={parsedTimesheets.length}
          lateCount={lateIncidents.length}
          lateFileName={lateFileName}
        />

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

        {/* Real-Time Attendance Analytics Banner (Recharts) */}
        {hasData && !isLoading && (
          <AttendanceAnalyticsBanner
            projects={rekapProjects}
            effectiveRange={effectiveRange}
            lateIncidents={lateIncidents}
          />
        )}

        {isLoading && (
          <div className="p-8 text-center bg-white border border-slate-200 rounded-xl my-6 shadow-xs animate-pulse">
            <p className="text-sm font-semibold text-blue-900">
              Sedang merapikan data absensi karyawan...
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Membaca shift kerja harian, lembur ganti, dan memeriksa pola kehadiran.
            </p>
          </div>
        )}

        {!hasData && !isLoading && (
          <EmptyStateGuide onLoadSample={handleLoadSample} />
        )}

        {/* In-page Step Tab Header Bar directly above the Table view */}
        {hasData && !isLoading && (
          <div className="bg-white border border-slate-200 rounded-xl p-2.5 mb-5 shadow-2xs flex flex-wrap items-center justify-between gap-3 sticky top-[62px] z-20">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                onClick={() => setActiveStep(1)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeStep === 1
                    ? "bg-blue-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                1. Konversi Timesheet
              </button>
              <button
                onClick={() => setActiveStep(2)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeStep === 2
                    ? "bg-blue-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                2. Rekap Summary
                {!templateLoaded && (
                  <span className="text-[10px] opacity-75 font-normal">(Dilewati)</span>
                )}
              </button>
              <button
                onClick={() => setActiveStep(3)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeStep === 3
                    ? "bg-blue-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                3. Cek Ketidakhadiran
                {lateIncidents.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-amber-100 text-amber-800 font-bold">
                    +Terlambat
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveStep(4)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeStep === 4
                    ? "bg-blue-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                4. Paket PIC Proyek
              </button>
            </div>

            <div className="text-xs text-slate-500 font-medium hidden sm:flex items-center gap-1.5">
              <span>Menampilkan:</span>
              <span className="font-semibold text-blue-950 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                {activeStep === 1 && "Tabel Rekap Timesheet Harian"}
                {activeStep === 2 && "Tabel Ringkasan 13 Kolom & Grand Total"}
                {activeStep === 3 && (lateIncidents.length > 0 ? "Tabel Ketidakhadiran & Keterlambatan Menit" : "Tabel Ketidakhadiran & Pola Khusus")}
                {activeStep === 4 && "Paket Berkas & Draf Pesan PIC per Proyek"}
              </span>
            </div>
          </div>
        )}

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
                lateIncidents={lateIncidents}
                latePeriodeTxt={latePeriodeTxt}
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

      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="w-full px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              Rumus hitungan, penyesuaian hari kerja, dan deteksi pola absensi 100% mengikuti standar <code>proses_absensi.py</code>.
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setTurnstileVerified(false)}
              title="Klik untuk uji simulasi proteksi Cloudflare Turnstile"
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Cloudflare Protected</span>
            </button>
            <span>Divisi HRD &amp; Personalia · PT Peduli Cepat Internasional</span>
          </div>
        </div>
      </footer>

      {!turnstileVerified && (
        <CloudflareTurnstileChallenge onVerified={() => setTurnstileVerified(true)} />
      )}
    </div>
  );
}
