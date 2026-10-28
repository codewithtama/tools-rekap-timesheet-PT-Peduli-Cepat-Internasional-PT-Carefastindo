import React from "react";
import { FileSpreadsheet, Sparkles, RefreshCw, Download } from "lucide-react";

interface HeaderProps {
  onLoadSample: () => void;
  onReset: () => void;
  hasData: boolean;
  onDownloadAllMasterZip?: () => void;
  activeStep: number;
  setActiveStep: (step: number) => void;
  templateLoaded: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onLoadSample,
  onReset,
  hasData,
  onDownloadAllMasterZip,
  activeStep,
  setActiveStep,
  templateLoaded,
}) => {
  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-900 text-white flex items-center justify-center shadow-xs">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
              Pengolahan Absensi &amp; Paket PIC Proyek
            </h1>
            <p className="text-xs text-slate-500 whitespace-nowrap">
              Divisi HRD &amp; Personalia · PT Peduli Cepat Internasional
            </p>
          </div>
        </div>

        {/* Zone 2: Navigation Links / Step Tabs */}
        {hasData && (
          <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveStep(1)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                activeStep === 1
                  ? "bg-white text-blue-900 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              1. Konversi Timesheet
            </button>
            <button
              onClick={() => setActiveStep(2)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                activeStep === 2
                  ? "bg-white text-blue-900 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              2. Rekap Summary
              {!templateLoaded && (
                <span className="ml-1 text-[10px] text-amber-600 font-normal">
                  (Dilewati)
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveStep(3)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                activeStep === 3
                  ? "bg-white text-blue-900 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              3. Cek Ketidakhadiran
            </button>
            <button
              onClick={() => setActiveStep(4)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                activeStep === 4
                  ? "bg-white text-blue-900 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              4. Paket PIC Proyek
            </button>
          </nav>
        )}

        {/* Zone 3: Primary Action Buttons */}
        <div className="flex items-center gap-2">
          {!hasData ? (
            <button
              onClick={onLoadSample}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-900 rounded-lg hover:bg-blue-800 transition-colors shadow-xs whitespace-nowrap cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Coba Contoh Data
            </button>
          ) : (
            <>
              {onDownloadAllMasterZip && (
                <button
                  onClick={onDownloadAllMasterZip}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-900 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap cursor-pointer"
                  title="Unduh seluruh file rekap, summary, cek ketidakhadiran, dan paket PIC dalam satu arsip ZIP"
                >
                  <Download className="w-3.5 h-3.5" />
                  Unduh Semua File (ZIP)
                </button>
              )}
              <button
                onClick={onReset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Mulai Ulang
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
