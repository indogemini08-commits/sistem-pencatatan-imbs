import React, { useEffect } from 'react';
import {
  X,
  Download,
  FileText,
  Printer,
  ExternalLink,
  CheckCircle,
  Eye,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-5xl h-[92vh] flex flex-col rounded-3xl bg-white/95 dark:bg-[#111726]/95 backdrop-blur-2xl border border-slate-200/90 dark:border-white/[0.12] shadow-2xl overflow-hidden animate-scale-in">
        {/* Header Bar */}
        <div className="p-4 sm:px-6 sm:py-4.5 border-b border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-900/50 shrink-0">
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
                  PDF Preview
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                {subtitle}
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Download/Simpan Button */}
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all transform active:scale-95 cursor-pointer whitespace-nowrap"
              title="Simpan & Download PDF"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Simpan PDF</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.1] border border-slate-200 dark:border-white/[0.1] text-xs font-bold transition-colors cursor-pointer"
              title="Cetak Dokumen"
            >
              <Printer className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span>Cetak</span>
            </button>

            {/* Open in new tab */}
            <button
              type="button"
              onClick={handleOpenNewTab}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] transition-colors cursor-pointer"
              title="Buka Pratinjau di Tab Penuh"
            >
              <ExternalLink className="w-4 h-4" />
            </button>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
              aria-label="Tutup Pratinjau"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* File Name Pill Sub-bar */}
        <div className="px-4 py-2 border-b border-slate-100 dark:border-white/[0.06] bg-slate-100/50 dark:bg-white/[0.02] flex items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-mono text-[11px] truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-500 dark:text-slate-400">Berkas:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{fileName}</span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 shrink-0">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            <span>Kop Surat & TTD Siap Cetak</span>
          </div>
        </div>

        {/* PDF Frame Viewer Body */}
        <div className="flex-1 w-full p-2 sm:p-4 bg-slate-100/70 dark:bg-[#0b101d]/60 overflow-hidden relative">
          <iframe
            src={`${blobUrl}#toolbar=1&navpanes=0`}
            title={title}
            className="w-full h-full rounded-2xl border border-slate-300/80 dark:border-white/[0.1] bg-white shadow-inner"
          />
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:px-6 sm:py-3.5 border-t border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-900/50 shrink-0">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
            💡 Pastikan data dan tanda tangan sudah sesuai sebelum mengunduh berkas.
          </span>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all transform active:scale-95 cursor-pointer"
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

