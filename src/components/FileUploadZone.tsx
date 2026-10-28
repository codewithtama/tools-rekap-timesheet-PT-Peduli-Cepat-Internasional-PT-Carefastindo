import React, { useRef } from "react";
import { UploadCloud, FileSpreadsheet, Download, AlertTriangle, CheckCircle2 } from "lucide-react";
import { buildDefaultTemplateBlob, downloadBlob } from "../utils/excelExporter";

interface FileUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  onTemplateSelected: (file: File) => void;
  templateLoaded: boolean;
  templateFileName?: string;
  timesheetCount: number;
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onFilesSelected,
  onTemplateSelected,
  templateLoaded,
  templateFileName,
  timesheetCount,
}) => {
  const timesheetInputRef = useRef<HTMLInputElement>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);

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

  const handleDownloadDefaultTemplate = async () => {
    const blob = await buildDefaultTemplateBlob();
    downloadBlob(blob, "SUMMARY_ABSENSI_TEMPLATE.xlsx");
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Box 1: Multi-timesheet upload */}
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={handleTimesheetDrop}
        onClick={() => timesheetInputRef.current?.click()}
        className="md:col-span-2 border-2 border-dashed border-slate-300 hover:border-blue-700 bg-white hover:bg-blue-50/30 rounded-xl p-6 transition-colors cursor-pointer flex flex-col items-center justify-center text-center group min-h-[160px]"
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
        <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
          <UploadCloud className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-800 mb-1">
          Tarik &amp; Letakkan File Timesheet di Sini
        </h3>
        <p className="text-xs text-slate-500 max-w-md">
          Mendukung banyak file sekaligus (.xls hasil download sistem atau .html).
          {timesheetCount > 0 && (
            <span className="block mt-1 font-medium text-blue-900">
              {timesheetCount} file timesheet siap diproses
            </span>
          )}
        </p>
      </div>

      {/* Box 2: Template Summary Absensi upload */}
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={handleTemplateDrop}
        className={`border rounded-xl p-5 flex flex-col justify-between transition-colors ${
          templateLoaded
            ? "border-emerald-200 bg-emerald-50/50"
            : "border-slate-300 bg-white"
        }`}
      >
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Template Summary
            </span>
            {templateLoaded ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Terpasang
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                <AlertTriangle className="w-3.5 h-3.5" />
                Opsional
              </span>
            )}
          </div>

          <h4 className="text-xs font-semibold text-slate-800 mb-1">
            SUMMARY_ABSENSI_TEMPLATE.xlsx
          </h4>
          <p className="text-[11px] text-slate-500 mb-3">
            {templateLoaded
              ? `File: ${templateFileName || "SUMMARY_ABSENSI_TEMPLATE.xlsx"}`
              : "Jika tidak ada, Langkah 2 dilewati & Langkah 3 tetap jalan."}
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
            className="flex-1 py-1.5 px-2.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-center"
          >
            {templateLoaded ? "Ganti Template" : "Unggah Template"}
          </button>
          <button
            type="button"
            onClick={handleDownloadDefaultTemplate}
            title="Unduh template standar 13 kolom"
            className="py-1.5 px-2.5 text-xs font-medium text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors flex items-center justify-center gap-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Template Standar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
