import React, { useState } from "react";
import { Download, Copy, Check, MessageSquare, AlertCircle, FileArchive, Eye } from "lucide-react";
import { PicPackage } from "../types/attendance";
import { buildProjectZip, downloadBlob } from "../utils/excelExporter";

interface StepPaketPicViewProps {
  packages: PicPackage[];
  periodeTxt: string;
  stempel: string;
  onDownloadMasterZip: () => void;
  rekapBlobs: Record<string, Blob>;
}

export const StepPaketPicView: React.FC<StepPaketPicViewProps> = ({
  packages,
  periodeTxt,
  stempel,
  onDownloadMasterZip,
  rekapBlobs,
}) => {
  const [copiedProyek, setCopiedProyek] = useState<string | null>(null);
  const [previewPesan, setPreviewPesan] = useState<{ proyek: string; pesan: string } | null>(null);
  const [downloadingProyek, setDownloadingProyek] = useState<string | null>(null);

  const handleCopy = (proyek: string, pesan: string) => {
    navigator.clipboard.writeText(pesan);
    setCopiedProyek(proyek);
    setTimeout(() => {
      setCopiedProyek(null);
    }, 2500);
  };

  const handleDownloadSingleZip = async (pkg: PicPackage) => {
    setDownloadingProyek(pkg.proyek);
    try {
      const rekapBlob = rekapBlobs[pkg.aman];
      const zipBlob = await buildProjectZip(pkg, periodeTxt, stempel, rekapBlob);
      downloadBlob(zipBlob, `${pkg.aman}_${stempel}.zip`);
    } catch (err) {
      console.error(err);
      alert("Gagal mengunduh ZIP: " + (err as Error).message);
    } finally {
      setDownloadingProyek(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Paket PIC Proyek ({packages.length} Proyek)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Setiap paket proyek berisi: file Excel absensi proyek, rekap kehadiran, dan draf pesan WhatsApp yang siap dikirim ke PIC lapangan.
          </p>
        </div>

        <button
          onClick={onDownloadMasterZip}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-lg transition-colors shadow-xs cursor-pointer"
        >
          <FileArchive className="w-4 h-4" />
          Unduh Semua Paket (Master ZIP)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {packages.map(pkg => {
          const isCopied = copiedProyek === pkg.proyek;
          const isDownloading = downloadingProyek === pkg.proyek;
          const hasTl = pkg.n_tl > 0;

          return (
            <div
              key={pkg.proyek}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 line-clamp-1">
                      {pkg.proyek}
                    </h4>
                    <span className="text-xs text-slate-500">
                      {pkg.daftar.length} Karyawan Terdata
                    </span>
                  </div>

                  {hasTl ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full shrink-0">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {pkg.n_tl} Perlu Konfirmasi Lapangan
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                      Tidak Ada Catatan Khusus
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-5 gap-2 my-3 p-3 bg-slate-50 rounded-lg text-center font-mono">
                  <div>
                    <div className="text-[10px] text-slate-500 font-sans">Alfa</div>
                    <div className="text-xs font-bold text-rose-800">{pkg.tot.ALFA}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-sans">Sakit</div>
                    <div className="text-xs font-bold text-amber-800">{pkg.tot.SAKIT}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-sans">Izin</div>
                    <div className="text-xs font-bold text-amber-800">{pkg.tot.IZIN}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-sans">Lembur</div>
                    <div className="text-xs font-bold text-blue-800">{pkg.tot.LEMBUR}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-sans">BA (h/a)</div>
                    <div className="text-xs font-bold text-sky-800">
                      {pkg.tot.BA_h}/{pkg.tot.BA_a}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-100/70 border border-slate-200/80 rounded-lg text-[11px] font-mono text-slate-700 line-clamp-3 leading-relaxed mb-4">
                  {pkg.pesan}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPreviewPesan({ proyek: pkg.proyek, pesan: pkg.pesan })}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Lihat Draf Pesan
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(pkg.proyek, pkg.pesan)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                      isCopied
                        ? "bg-emerald-600 text-white"
                        : "bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100"
                    }`}
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Berhasil Disalin!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Salin Draf Pesan
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={isDownloading}
                    onClick={() => handleDownloadSingleZip(pkg)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-lg transition-colors shadow-2xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {isDownloading ? "Mengompres file..." : "Unduh ZIP Proyek"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {previewPesan && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 shadow-xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-900" />
                <h3 className="text-sm font-bold text-slate-900">
                  Draf Pesan PIC: {previewPesan.proyek}
                </h3>
              </div>
              <button
                onClick={() => setPreviewPesan(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50 border border-slate-200 p-4 rounded-lg font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed select-all">
              {previewPesan.pesan}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setPreviewPesan(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(previewPesan.pesan);
                  setCopiedProyek(previewPesan.proyek);
                  setTimeout(() => setCopiedProyek(null), 2500);
                }}
                className="px-4 py-2 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                {copiedProyek === previewPesan.proyek ? (
                  <>
                    <Check className="w-4 h-4" />
                    Berhasil Disalin!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Salin Draf Pesan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
