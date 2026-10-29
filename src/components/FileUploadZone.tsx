import React, { useRef, useState, useEffect } from "react";
import {
  UploadCloud,
  Download,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react";
import { buildDefaultTemplateBlob, downloadBlob } from "../utils/excelExporter";

interface FileUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  onTemplateSelected: (file: File) => void;
  onLateFileSelected: (file: File) => void;
  templateLoaded: boolean;
  templateFileName?: string;
  timesheetCount: number;
  lateCount?: number;
  lateFileName?: string;
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onFilesSelected,
  onTemplateSelected,
  onLateFileSelected,
  templateLoaded,
  templateFileName,
  timesheetCount,
  lateCount = 0,
  lateFileName,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(timesheetCount > 0);
  const timesheetInputRef = useRef<HTMLInputElement>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);
  const lateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (timesheetCount > 0) {
      setIsCollapsed(true);
    }
  }, [timesheetCount]);

  const handleTimesheetDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      onFilesSelected(files);
    }
  };

  const handleTemplateDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onTemplateSelected(e.dataTransfer.files[0]);
    }
  };

  const handleLateDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onLateFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleDownloadDefaultTemplate = async () => {
    const blob = await buildDefaultTemplateBlob();
    downloadBlob(blob, "SUMMARY_ABSENSI_TEMPLATE.xlsx");
  };

  // Compact Mode when files have already been uploaded
  if (isCollapsed && timesheetCount > 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3 mb-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <span>{timesheetCount} Berkas Timesheet Siap Diproses</span>
              <span className="text-[10px] font-normal font-mono bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                Data Siap
              </span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
              <span>
                Template: {templateLoaded ? (templateFileName || "SUMMARY_ABSENSI_TEMPLATE.xlsx") : "Bawaan (opsional)"}
              </span>
              <span>•</span>
              <span className={lateCount > 0 ? "text-amber-700 font-medium" : "text-slate-400"}>
                Keterlambatan: {lateCount > 0 ? `${lateCount} kejadian (${lateFileName})` : "Belum diunggah (opsional)"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={timesheetInputRef}
            type="file"
            multiple
            accept=".xls,.htm,.html,.xlsx"
            className="hidden"
            onChange={e => {
              if (e.target.files) {
                onFilesSelected(Array.from(e.target.files));
              }
            }}
          />
          <input
            ref={templateInputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={e => {
              if (e.target.files && e.target.files[0]) {
                onTemplateSelected(e.target.files[0]);
              }
            }}
          />
          <input
            ref={lateInputRef}
            type="file"
            accept=".xls,.htm,.html,.xlsx"
            className="hidden"
            onChange={e => {
              if (e.target.files && e.target.files[0]) {
                onLateFileSelected(e.target.files[0]);
              }
            }}
          />

          <button
            type="button"
            onClick={() => timesheetInputRef.current?.click()}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            + Timesheet
          </button>
          <button
            type="button"
            onClick={() => lateInputRef.current?.click()}
            className="px-2.5 py-1.5 text-xs font-medium text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer"
          >
            {lateCount > 0 ? "Ganti File Terlambat" : "+ File Terlambat"}
          </button>
          <button
            type="button"
            onClick={() => templateInputRef.current?.click()}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            {templateLoaded ? "Ganti Template" : "Template"}
          </button>
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
            title="Buka kotak unggah file besar"
          >
            <span>Buka Dropzone</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Expanded / Initial Mode
  return (
    <div className="relative mb-5">
      {timesheetCount > 0 && (
        <div className="flex justify-end mb-2">
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg cursor-pointer"
          >
            <span>Ringkas Area Unggah</span>
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Box 1: Multi-timesheet upload (6 cols) */}
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={handleTimesheetDrop}
          onClick={() => timesheetInputRef.current?.click()}
          className="md:col-span-6 border-2 border-dashed border-slate-300 hover:border-blue-700 bg-white hover:bg-blue-50/30 rounded-xl p-6 transition-colors cursor-pointer flex flex-col items-center justify-center text-center group min-h-[170px]"
        >
          <input
            ref={timesheetInputRef}
            type="file"
            multiple
            accept=".xls,.htm,.html,.xlsx"
            className="hidden"
            onChange={e => {
              if (e.target.files) {
                onFilesSelected(Array.from(e.target.files));
              }
            }}
          />
          <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
            <UploadCloud className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800 mb-1">
            Tarik &amp; Lepas File Timesheet ke Sini
          </h3>
          <p className="text-xs text-slate-500 max-w-sm">
            Format .xls unduhan sistem absensi atau file .html (bisa pilih banyak sekaligus).
            {timesheetCount > 0 && (
              <span className="block mt-1 font-semibold text-blue-900">
                {timesheetCount} file timesheet siap diproses
              </span>
            )}
          </p>
        </div>

        {/* Box 2: Laporan Keterlambatan Upload (3 cols) */}
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={handleLateDrop}
          className={`md:col-span-3 border rounded-xl p-4 flex flex-col justify-between transition-colors ${
            lateCount > 0 ? "border-amber-300 bg-amber-50/40" : "border-slate-300 bg-white"
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-700" />
                Laporan Terlambat
              </span>
              {lateCount > 0 ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                  {lateCount} Kejadian
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  Opsional
                </span>
              )}
            </div>

            <h4 className="text-xs font-semibold text-slate-800 mb-1">
              File Keterlambatan (.xls)
            </h4>
            <p className="text-[11px] text-slate-500 mb-2">
              {lateCount > 0
                ? `File: ${lateFileName || "Laporan Terlambat"}`
                : "Unduhan laporan keterlambatan karyawan (format tabel HTML sistem). Otomatis hitung menit > 0."}
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <input
              ref={lateInputRef}
              type="file"
              accept=".xls,.htm,.html,.xlsx"
              className="hidden"
              onChange={e => {
                if (e.target.files && e.target.files[0]) {
                  onLateFileSelected(e.target.files[0]);
                }
              }}
            />
            <button
              type="button"
              onClick={() => lateInputRef.current?.click()}
              className="w-full py-1.5 px-2 text-xs font-medium text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors text-center cursor-pointer"
            >
              {lateCount > 0 ? "Ganti File Terlambat" : "Unggah Keterlambatan"}
            </button>
          </div>
        </div>

        {/* Box 3: Template Summary Absensi upload (3 cols) */}
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={handleTemplateDrop}
          className={`md:col-span-3 border rounded-xl p-4 flex flex-col justify-between transition-colors ${
            templateLoaded ? "border-emerald-200 bg-emerald-50/50" : "border-slate-300 bg-white"
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Template Summary
              </span>
              {templateLoaded ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  Terpasang
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  Opsional
                </span>
              )}
            </div>

            <h4 className="text-xs font-semibold text-slate-800 mb-1 truncate">
              SUMMARY_TEMPLATE.xlsx
            </h4>
            <p className="text-[11px] text-slate-500 mb-2 truncate">
              {templateLoaded
                ? (templateFileName || "SUMMARY_ABSENSI_TEMPLATE.xlsx")
                : "Format rekap 13 kolom untuk Langkah 2."}
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <input
              ref={templateInputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={e => {
                if (e.target.files && e.target.files[0]) {
                  onTemplateSelected(e.target.files[0]);
                }
              }}
            />
            <button
              type="button"
              onClick={() => templateInputRef.current?.click()}
              className="flex-1 py-1.5 px-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-center cursor-pointer"
            >
              {templateLoaded ? "Ganti" : "Unggah"}
            </button>
            <button
              type="button"
              onClick={handleDownloadDefaultTemplate}
              title="Unduh format standar rekap 13 kolom"
              className="py-1.5 px-2 text-xs font-medium text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Format</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
