import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  FileText,
  Printer,
  ExternalLink,
  CheckCircle,
  Eye,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';
import jsPDF from 'jspdf';

interface PDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  fileName: string;
  blobUrl: string | null;
  doc: jsPDF | null;
  onDownloaded?: () => void;
}

export const PDFPreviewModal: React.FC<PDFPreviewModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle = 'Pratinjau dokumen resmi sebelum disimpan atau dicetak',
  fileName,
  blobUrl,
  doc,
  onDownloaded,
}) => {
  const [zoom, setZoom] = useState<number>(100);

  // ESC key listener to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !blobUrl) return null;

  const handleDownload = () => {
    if (doc) {
      doc.save(fileName);
    } else if (blobUrl) {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    if (onDownloaded) onDownloaded();
  };

  const handleOpenNewTab = () => {
    if (blobUrl) {
      window.open(blobUrl, '_blank');
    }
  };

  const handlePrint = () => {
    if (blobUrl) {
      const printWindow = window.open(blobUrl, '_blank');
      if (printWindow) {
        printWindow.focus();
      }
    }
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 20, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 20, 60));
  const handleZoomReset = () => setZoom(100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-5xl h-[94vh] flex flex-col rounded-3xl bg-white dark:bg-[#0e1424] backdrop-blur-2xl border border-slate-200/90 dark:border-white/[0.12] shadow-2xl overflow-hidden animate-scale-in">
        {/* Header Bar */}
        <div className="p-3.5 sm:px-6 sm:py-4 border-b border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between gap-3 bg-slate-50/90 dark:bg-[#12192c] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/25 shrink-0">
              <Eye className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                  {title}
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-white/[0.08] text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60">
                  <FileText className="w-3 h-3" />
                  Pratinjau Resmi
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                {subtitle}
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Zoom Controls */}
            <div className="hidden md:flex items-center bg-slate-200/60 dark:bg-white/[0.08] p-0.5 rounded-xl border border-slate-300/60 dark:border-white/[0.08] text-xs mr-1">
              <button
                type="button"
                onClick={handleZoomOut}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10 transition-colors"
                title="Perkecil (-)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleZoomReset}
                className="px-2 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-white/10 rounded-lg transition-colors"
                title="Reset Ukuran"
              >
                {zoom}%
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10 transition-colors"
                title="Perbesar (+)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.1] border border-slate-200 dark:border-white/[0.1] text-xs font-bold transition-colors cursor-pointer shadow-xs"
              title="Cetak Dokumen"
            >
              <Printer className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span>Cetak</span>
            </button>

            {/* Open in new tab */}
            <button
              type="button"
              onClick={handleOpenNewTab}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-white dark:hover:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] transition-colors cursor-pointer"
              title="Buka Pratinjau di Tab Baru"
            >
              <ExternalLink className="w-4 h-4" />
            </button>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
              aria-label="Tutup Pratinjau"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* File Name Pill Sub-bar */}
        <div className="px-4 py-2 border-b border-slate-200/70 dark:border-white/[0.06] bg-slate-100/60 dark:bg-white/[0.02] flex items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-mono text-[11px] truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-500 dark:text-slate-400">Nama File:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{fileName}</span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 shrink-0 font-medium">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            <span>Kop Surat Resmi & TTD Aktif</span>
          </div>
        </div>

        {/* PDF Frame Viewer Body (Clean Document Reader Backdrop) */}
        <div className="flex-1 w-full p-2 sm:p-5 bg-slate-200/80 dark:bg-[#070b14] overflow-auto flex items-center justify-center relative">
          <div className="w-full h-full max-w-4xl bg-white dark:bg-[#111726] rounded-2xl shadow-xl border border-slate-300/80 dark:border-white/[0.1] overflow-hidden flex flex-col">
            <iframe
              key={`pdf-frame-${zoom}`}
              src={`${blobUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH&zoom=${zoom}`}
              title={title}
              className="w-full h-full bg-white border-0"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:px-6 sm:py-3.5 border-t border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between gap-3 bg-slate-50/90 dark:bg-[#12192c] shrink-0">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
            💡 Pastikan data dan tanda tangan sudah sesuai sebelum mengunduh berkas.
          </span>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 transition-all transform active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              <span>Simpan & Download PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

