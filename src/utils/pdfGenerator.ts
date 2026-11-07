import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SchoolSettings, Student, ViolationRecord } from '../types';

/**
 * Gambar Emblem Vektor Resmi Pesantren IMBS (Fallback jika logo gambar tidak di-render oleh jsPDF)
 */
function drawOfficialEmblem(doc: jsPDF, cx: number, cy: number, r: number = 10) {
  // Outer circular shield with deep navy
  doc.setFillColor(15, 36, 63);
  doc.circle(cx, cy, r, 'F');

  // Gold outer decorative ring
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.7);
  doc.circle(cx, cy, r - 0.7, 'D');

  // Inner subtle gold ring
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(0.3);
  doc.circle(cx, cy, r - 1.8, 'D');

  // Islamic Crescent & Star Motif (Gold)
  doc.setFillColor(245, 158, 11);
  doc.circle(cx, cy - 2.8, 2.2, 'F');
  doc.setFillColor(15, 36, 63);
  doc.circle(cx + 0.8, cy - 3.4, 1.9, 'F');

  // Little star inside crescent
  doc.setFillColor(255, 255, 255);
  doc.circle(cx + 1.2, cy - 2.2, 0.45, 'F');

  // Open Quran Book geometric lines (White)
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.5);
  doc.line(cx - 4.5, cy + 2.2, cx, cy + 3.8);
  doc.line(cx, cy + 3.8, cx + 4.5, cy + 2.2);
  doc.line(cx - 4.5, cy + 0.6, cx, cy + 2);
  doc.line(cx, cy + 2, cx + 4.5, cy + 0.6);
  doc.line(cx, cy + 2, cx + 4.5, cy + 3.8);

  // Institution Monogram
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.setTextColor(245, 158, 11);
  doc.text('IMBS', cx, cy + 6.6, { align: 'center' });
}

/**
 * Gambar Kop Surat Resmi Lembaga / Sekolah (Tata Letak Seimbang Tanpa Tumpang Tindih)
 */
function drawOfficialHeader(doc: jsPDF, settings: SchoolSettings): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  let currentHeaderY = 16;

  let logoDrawn = false;

  // Render Official Logo if Base64 from device upload (21x21 mm on the top-left margin)
  if (settings.logo_url && settings.logo_url.startsWith('data:image/')) {
    try {
      let format = 'PNG';
      if (settings.logo_url.includes('image/jpeg') || settings.logo_url.includes('image/jpg')) {
        format = 'JPEG';
      } else if (settings.logo_url.includes('image/webp')) {
        format = 'WEBP';
      }
      doc.addImage(settings.logo_url, format, 15, 14, 21, 21);
      logoDrawn = true;
    } catch (err) {
      console.warn('PDF Header Logo render warning:', err);
    }
  }

  // If no base64 logo drawn, render official vector emblem directly
  if (!logoDrawn) {
    drawOfficialEmblem(doc, 25, 24, 10.5);
  }

  // 1. Nama Sekolah Utama (Deep Navy) - Auto-scaled to never collide with logo
  doc.setFont('helvetica', 'bold');
  let schoolNameSize = 12.5;
  doc.setFontSize(schoolNameSize);
  const schoolNameUpper = (settings.school_name || "PESANTREN TAHFIZH AL-QUR'AN IMAM ASY-SYATHIBI").toUpperCase();
  while (doc.getTextWidth(schoolNameUpper) > 124 && schoolNameSize > 8.5) {
    schoolNameSize -= 0.5;
    doc.setFontSize(schoolNameSize);
  }
  doc.setTextColor(15, 36, 63); // #0f243f Deep Navy
  doc.text(schoolNameUpper, pageWidth / 2, currentHeaderY, { align: 'center' });

  // 2. Sub-header Divisi / Kop Surat Text (Split cleanly if contains separator or exceeds safe width)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 86, 160); // #1e56a0 Royal Navy

  const kopText = settings.kop_surat_text || "DIVISI HALAQAH TAHFIZH AL-QUR'AN";
  let kopLine1 = kopText;
  let kopLine2 = '';

  if (kopText.includes(' - ')) {
    const parts = kopText.split(' - ');
    kopLine1 = parts[0].trim();
    kopLine2 = parts.slice(1).join(' - ').trim();
  } else if (kopText.includes(' – ')) {
    const parts = kopText.split(' – ');
    kopLine1 = parts[0].trim();
    kopLine2 = parts.slice(1).join(' – ').trim();
  } else if (doc.getTextWidth(kopText) > 120) {
    const words = kopText.split(' ');
    const mid = Math.ceil(words.length / 2);
    kopLine1 = words.slice(0, mid).join(' ');
    kopLine2 = words.slice(mid).join(' ');
  }

  currentHeaderY += 5.5;
  doc.text(kopLine1, pageWidth / 2, currentHeaderY, { align: 'center' });

  if (kopLine2) {
    currentHeaderY += 4.5;
    doc.text(kopLine2, pageWidth / 2, currentHeaderY, { align: 'center' });
  }

  // 3. Alamat & Kontak Resmi Lembaga
  currentHeaderY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 90, 105);
  const addressText = `${settings.address || 'Jl. Karang Anyar No. 45, Kompleks Islamic Center, Bogor, Jawa Barat'}`;
  doc.text(addressText, pageWidth / 2, currentHeaderY, { align: 'center' });

  currentHeaderY += 4;
  doc.setFontSize(7.5);
  const contactText = `Telp: ${settings.phone || '0811-9876-5432'} | Email: ${settings.email || 'tahfizh@imamsyathibi.sch.id'}`;
  doc.text(contactText, pageWidth / 2, currentHeaderY, { align: 'center' });

  // 4. Double Rule Horizontal Line (Kop Surat Style: 1.3pt Thick + 0.4pt Thin)
  currentHeaderY += 4.5;
  doc.setDrawColor(15, 36, 63);
  doc.setLineWidth(1.3);
  doc.line(14, currentHeaderY, pageWidth - 14, currentHeaderY);

  doc.setLineWidth(0.4);
  doc.line(14, currentHeaderY + 1.1, pageWidth - 14, currentHeaderY + 1.1);

  return currentHeaderY + 7;
}

/**
 * Gambar Bagian Pengesahan & Tanda Tangan Resmi (Konfigurasi Dinamis 3 Divisi dari Menu Pengaturan)
 */
function drawOfficialSignatures(
  doc: jsPDF,
  settings: SchoolSettings,
  startY: number,
  division?: string,
  overrideSigner2Name?: string | null
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  let sigY = startY + 8;
  if (sigY + 36 > pageHeight - 15) {
    doc.addPage();
    sigY = 22;
  }

  const printDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const city = settings.signature_city?.trim() || 'Bogor';
  const locDate = `${city}, ${printDate}`;

  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');

  // Tanggal & Lokasi di sisi kanan
  doc.text(locDate, pageWidth - 70, sigY);

  sigY += 5;

  let signer1Title = '';
  let signer1Name = '';
  let signer2Title = '';
  let signer2Name = '';

  const divLower = (division || '').toLowerCase();
  if (divLower === 'kesantrian') {
    signer1Title = settings.signer_kesantrian_1_title?.trim() || 'Kepala Kesantrian / Mudir';
    signer1Name = settings.signer_kesantrian_1_name?.trim() || settings.signer_1_name?.trim() || '';
    signer2Title = settings.signer_kesantrian_2_title?.trim() || 'Wali Asrama / Musyrif Kesantrian';
    signer2Name = overrideSigner2Name?.trim() || settings.signer_kesantrian_2_name?.trim() || settings.signer_2_name?.trim() || '';
  } else if (divLower === 'akademik') {
    signer1Title = settings.signer_akademik_1_title?.trim() || 'Kepala Sekolah / Kurikulum';
    signer1Name = settings.signer_akademik_1_name?.trim() || settings.signer_1_name?.trim() || '';
    signer2Title = settings.signer_akademik_2_title?.trim() || 'Wali Kelas / Guru Pengajar';
    signer2Name = overrideSigner2Name?.trim() || settings.signer_akademik_2_name?.trim() || settings.signer_2_name?.trim() || '';
  } else {
    // Default: Tahfizh (Halaqah)
    signer1Title = settings.signer_tahfizh_1_title?.trim() || settings.signer_1_title?.trim() || 'Koordinator Tahfizh / Mudir';
    signer1Name = settings.signer_tahfizh_1_name?.trim() || settings.signer_1_name?.trim() || '';
    signer2Title = settings.signer_tahfizh_2_title?.trim() || settings.signer_2_title?.trim() || 'Petugas / Muhafizh Pengampu';
    signer2Name = overrideSigner2Name?.trim() || settings.signer_tahfizh_2_name?.trim() || settings.signer_2_name?.trim() || '';
  }

  // Sisi Kiri - Pihak 1 (Mengetahui / Pimpinan)
  doc.text('Mengetahui,', 22, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(signer1Title, 22, sigY + 4.5);

  // Sisi Kanan - Pihak 2 (Pelapor / Petugas)
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Petugas Pengesah,', pageWidth - 70, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(signer2Title, pageWidth - 70, sigY + 4.5);

  sigY += 21;
  // Nama Pejabat Penandatangan
  const signer1Display = signer1Name ? `( ${signer1Name} )` : '( ............................................ )';
  doc.text(signer1Display, 22, sigY);

  const signer2Display = signer2Name ? `( ${signer2Name} )` : '( ............................................ )';
  doc.text(signer2Display, pageWidth - 70, sigY);

  return sigY;
}

export interface PDFGenerationResult {
  doc: jsPDF;
  fileName: string;
  blobUrl: string;
}

/**
 * Buat Dokumen jsPDF Laporan Riwayat Pelanggaran (Redesain Modern, Minimalis, Glassmorphic KPI)
 */
export function buildViolationReportPDF(
  records: ViolationRecord[],
  settings: SchoolSettings,
  filterInfo?: {
    period?: string;
    halaqah?: string;
    muhafizh?: string;
    category?: string;
    printedBy?: string;
    division?: string;
  }
): PDFGenerationResult {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // 1. Kop Surat
  let currentY = drawOfficialHeader(doc, settings);

  // 2. Judul Dokumen Modern
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 36, 63);
  doc.text('LAPORAN PENCATATAN KEDISIPLINAN & POIN HALAQAH', pageWidth / 2, currentY, { align: 'center' });

  currentY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  const printDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  doc.text(`Tahun Ajaran: ${settings.current_academic_year || '2025/2026'}  •  Dicetak pada: ${printDate}`, pageWidth / 2, currentY, { align: 'center' });

  // 3. Executive Summary Glassmorphic Cards (3 Modern KPI Cards)
  currentY += 5;
  const cardY = currentY;
  const cardHeight = 15;
  const cardMargin = 14;
  const totalUsableWidth = pageWidth - (cardMargin * 2);
  const gap = 3.5;
  const cardWidth = (totalUsableWidth - (gap * 2)) / 3;

  const sortedRecords = [...records].sort(
    (a, b) => (Number(b.points_snapshot) || 0) - (Number(a.points_snapshot) || 0)
  );

  const totalPoints = sortedRecords
    .filter((r) => r.status === 'active')
    .reduce((sum, r) => sum + Number(r.points_snapshot || 0), 0);

  // Card 1: Parameter Filter (Indigo Accent)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(cardMargin, cardY, cardWidth, cardHeight, 1.8, 1.8, 'FD');
  doc.setFillColor(79, 70, 229); // Indigo Accent
  doc.roundedRect(cardMargin, cardY, 1.4, cardHeight, 0.7, 0.7, 'F');

  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('PARAMETER FILTER', cardMargin + 4.5, cardY + 4.2);
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  const halaqahText = filterInfo?.halaqah ? filterInfo.halaqah : 'Semua Divisi & Halaqah';
  doc.text(halaqahText.substring(0, 30), cardMargin + 4.5, cardY + 8.2);
  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  const periodText = filterInfo?.period ? filterInfo.period : 'Semua Riwayat';
  doc.text(periodText.substring(0, 32), cardMargin + 4.5, cardY + 12);

  // Card 2: Total Catatan (Blue Accent)
  const card2X = cardMargin + cardWidth + gap;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(card2X, cardY, cardWidth, cardHeight, 1.8, 1.8, 'FD');
  doc.setFillColor(37, 99, 235); // Blue Accent
  doc.roundedRect(card2X, cardY, 1.4, cardHeight, 0.7, 0.7, 'F');

  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL KEJADIAN TERCATAT', card2X + 4.5, cardY + 4.2);
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${sortedRecords.length} Catatan`, card2X + 4.5, cardY + 9.5);
  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  const activeCount = sortedRecords.filter((r) => r.status === 'active').length;
  doc.text(`${activeCount} Aktif  •  ${sortedRecords.length - activeCount} Batal`, card2X + 4.5, cardY + 13);

  // Card 3: Total Poin (Rose / Emerald Accent)
  const card3X = cardMargin + (cardWidth * 2) + (gap * 2);
  const isRed = totalPoints > 0;
  doc.setFillColor(isRed ? 255 : 240, isRed ? 241 : 253, isRed ? 242 : 244);
  doc.setDrawColor(isRed ? 254 : 167, isRed ? 205 : 243, isRed ? 211 : 208);
  doc.roundedRect(card3X, cardY, cardWidth, cardHeight, 1.8, 1.8, 'FD');
  doc.setFillColor(isRed ? 225 : 16, isRed ? 29 : 185, isRed ? 72 : 129);
  doc.roundedRect(card3X, cardY, 1.4, cardHeight, 0.7, 0.7, 'F');

  doc.setFontSize(6.5);
  doc.setTextColor(isRed ? 190 : 4, isRed ? 24 : 120, isRed ? 93 : 87);
  doc.setFont('helvetica', 'bold');
  doc.text('AKUMULASI POIN PELANGGARAN', card3X + 4.5, cardY + 4.2);
  doc.setFontSize(10);
  doc.text(`${totalPoints} Poin Terakumulasi`, card3X + 4.5, cardY + 9.5);
  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'normal');
  doc.text(isRed ? 'Memerlukan pembinaan berkala' : 'Kondisi kedisiplinan aman', card3X + 4.5, cardY + 13);

  currentY += cardHeight + 5;

  // 4. Tabel Pelanggaran Redesain (Modern Minimalist dengan Pill Badge)
  const tableRows = sortedRecords.map((r, idx) => [
    (idx + 1).toString(),
    r.date || '-',
    r.student_name || '-',
    r.student_class_snapshot || '-',
    r.halaqah_name_snapshot || '-',
    r.violation_name_snapshot || '-',
    `${r.points_snapshot} Poin`,
    r.status === 'cancelled' ? 'Dibatalkan' : 'Aktif',
    r.notes || '-',
  ]);

  const bodyData: any[] = tableRows.length > 0
    ? tableRows
    : [
        [
          {
            content: '— Tidak ada catatan pelanggaran yang tercatat pada kriteria filter ini —',
            colSpan: 9,
            styles: {
              halign: 'center',
              fontStyle: 'italic',
              textColor: [100, 116, 139],
              minCellHeight: 14,
            },
          },
        ],
      ];

  autoTable(doc, {
    startY: currentY,
    head: [['No', 'Tanggal', 'Nama Santri', 'Kls', 'Halaqah', 'Jenis Pelanggaran', 'Poin', 'Status', 'Keterangan']],
    body: bodyData,
    theme: 'plain',
    headStyles: {
      fillColor: [30, 41, 59], // Slate 800 - Mewah, Modern & Bersih
      textColor: [255, 255, 255],
      fontSize: 7.8,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      cellPadding: { top: 2.5, bottom: 2.5, left: 1.5, right: 1.5 },
    },
    bodyStyles: {
      fontSize: 7.2,
      cellPadding: 2.3,
      textColor: [30, 41, 59],
      valign: 'middle',
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // Slate 50 row striping
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10, fontStyle: 'bold', textColor: [100, 116, 139] },
      1: { halign: 'center', cellWidth: 18 },
      2: { cellWidth: 32, fontStyle: 'bold' },
      3: { halign: 'center', cellWidth: 9, textColor: [79, 70, 229] },
      4: { cellWidth: 23 },
      5: { cellWidth: 36 },
      6: { halign: 'center', fontStyle: 'bold', cellWidth: 14, textColor: [190, 24, 93] },
      7: { halign: 'center', cellWidth: 16, fontStyle: 'bold' },
      8: { cellWidth: 24, textColor: [100, 116, 139] },
    },
    didDrawCell: (data) => {
      // Custom Chip Renderer for Status Column
      if (data.section === 'body' && data.column.index === 7 && data.cell.raw !== undefined) {
        const statusText = String(data.cell.raw);
        if (statusText === 'Aktif') {
          doc.setTextColor(16, 120, 80); // Emerald
        } else if (statusText === 'Dibatalkan') {
          doc.setTextColor(148, 163, 184); // Muted Slate
        }
      }
    },
    margin: { left: 14, right: 14 },
  });

  // 5. Bagian Pengesahan & Tanda Tangan Konfigurasi Lembaga Sesuai Divisi
  const finalY = (doc as any).lastAutoTable.finalY;
  drawOfficialSignatures(doc, settings, finalY, filterInfo?.division, filterInfo?.muhafizh);

  const fileName = `Laporan_Pelanggaran_${new Date().toISOString().split('T')[0]}.pdf`;
  const blobUrl = doc.output('bloburl');

  return {
    doc,
    fileName,
    blobUrl: typeof blobUrl === 'string' ? blobUrl : URL.createObjectURL(doc.output('blob')),
  };
}

/**
 * Cetak Laporan Riwayat Pelanggaran Langsung
 */
export function generateViolationReportPDF(
  records: ViolationRecord[],
  settings: SchoolSettings,
  filterInfo?: {
    period?: string;
    halaqah?: string;
    muhafizh?: string;
    category?: string;
    printedBy?: string;
  }
) {
  const result = buildViolationReportPDF(records, settings, filterInfo);
  result.doc.save(result.fileName);
  return result;
}

/**
 * Buat Dokumen jsPDF Laporan Data Santri & Poin Keseluruhan (Students List Report)
 */
export function buildStudentsListReportPDF(
  students: Student[],
  settings: SchoolSettings,
  filterInfo?: {
    classFilter?: string;
    halaqahFilter?: string;
    search?: string;
  }
): PDFGenerationResult {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // 1. Kop Surat
  let currentY = drawOfficialHeader(doc, settings);

  // 2. Judul Dokumen
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 36, 63);
  doc.text('LAPORAN DATA SANTRI & AKUMULASI POIN KEDISIPLINAN', pageWidth / 2, currentY, { align: 'center' });

  currentY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  const printDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  doc.text(`Tahun Ajaran: ${settings.current_academic_year || '2025/2026'}  •  Dicetak pada: ${printDate}`, pageWidth / 2, currentY, { align: 'center' });

  // 3. Stat Analytics Cards (4 Modern Glassmorphic Cards)
  currentY += 5;
  const cardY = currentY;
  const cardHeight = 15;
  const cardMargin = 14;
  const totalUsableWidth = pageWidth - (cardMargin * 2);
  const gap = 3;
  const cardWidth = (totalUsableWidth - (gap * 3)) / 4;

  const totalStudents = students.length;
  const safeCount = students.filter((s) => (Number(s.total_points) || 0) < 20).length;
  const guidanceCount = students.filter((s) => (Number(s.total_points) || 0) >= 20 && (Number(s.total_points) || 0) < 50).length;
  const warningCount = students.filter((s) => (Number(s.total_points) || 0) >= 50).length;

  const totalTahfizh = students.reduce((sum, s) => sum + (Number(s.tahfizh_points) || 0), 0);
  const totalKesantrian = students.reduce((sum, s) => sum + (Number(s.kesantrian_points) || 0), 0);
  const totalAkademik = students.reduce((sum, s) => sum + (Number(s.akademik_points) || 0), 0);

  // Card 1: Total Santri & Ringkasan Status
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(cardMargin, cardY, cardWidth, cardHeight, 1.8, 1.8, 'FD');
  doc.setFillColor(79, 70, 229); // Indigo
  doc.roundedRect(cardMargin, cardY, 1.4, cardHeight, 0.7, 0.7, 'F');
  doc.setFontSize(6.2);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL SANTRI', cardMargin + 4, cardY + 4.2);
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${totalStudents} Santri`, cardMargin + 4, cardY + 9.5);
  doc.setFontSize(6.2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Aman: ${safeCount}  •  Binaan: ${guidanceCount + warningCount}`, cardMargin + 4, cardY + 13);

  // Card 2: Poin Divisi Tahfizh (Emerald)
  const c2X = cardMargin + cardWidth + gap;
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(c2X, cardY, cardWidth, cardHeight, 1.8, 1.8, 'FD');
  doc.setFillColor(16, 185, 129); // Emerald
  doc.roundedRect(c2X, cardY, 1.4, cardHeight, 0.7, 0.7, 'F');
  doc.setFontSize(6.2);
  doc.setTextColor(4, 120, 87);
  doc.setFont('helvetica', 'bold');
  doc.text('POIN TAHFIZH', c2X + 4, cardY + 4.2);
  doc.setFontSize(9.5);
  doc.text(`${totalTahfizh} Poin`, c2X + 4, cardY + 9.5);
  doc.setFontSize(6.2);
  doc.setFont('helvetica', 'normal');
  doc.text('Akumulasi Halaqah', c2X + 4, cardY + 13);

  // Card 3: Poin Divisi Kesantrian (Blue)
  const c3X = cardMargin + (cardWidth * 2) + (gap * 2);
  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(191, 219, 254);
  doc.roundedRect(c3X, cardY, cardWidth, cardHeight, 1.8, 1.8, 'FD');
  doc.setFillColor(37, 99, 235); // Blue
  doc.roundedRect(c3X, cardY, 1.4, cardHeight, 0.7, 0.7, 'F');
  doc.setFontSize(6.2);
  doc.setTextColor(29, 78, 216);
  doc.setFont('helvetica', 'bold');
  doc.text('POIN KESANTRIAN', c3X + 4, cardY + 4.2);
  doc.setFontSize(9.5);
  doc.text(`${totalKesantrian} Poin`, c3X + 4, cardY + 9.5);
  doc.setFontSize(6.2);
  doc.setFont('helvetica', 'normal');
  doc.text('Akumulasi Asrama', c3X + 4, cardY + 13);

  // Card 4: Poin Divisi Akademik (Purple)
  const c4X = cardMargin + (cardWidth * 3) + (gap * 3);
  doc.setFillColor(250, 245, 255);
  doc.setDrawColor(233, 213, 255);
  doc.roundedRect(c4X, cardY, cardWidth, cardHeight, 1.8, 1.8, 'FD');
  doc.setFillColor(124, 58, 237); // Purple
  doc.roundedRect(c4X, cardY, 1.4, cardHeight, 0.7, 0.7, 'F');
  doc.setFontSize(6.2);
  doc.setTextColor(109, 40, 217);
  doc.setFont('helvetica', 'bold');
  doc.text('POIN AKADEMIK', c4X + 4, cardY + 4.2);
  doc.setFontSize(9.5);
  doc.text(`${totalAkademik} Poin`, c4X + 4, cardY + 9.5);
  doc.setFontSize(6.2);
  doc.setFont('helvetica', 'normal');
  doc.text('Akumulasi Sekolah', c4X + 4, cardY + 13);

  currentY += cardHeight + 5;

  // 4. Tabel Santri (Akumulasi Poin Per Divisi & Total Poin)
  const sortedStudents = [...students].sort(
    (a, b) => (Number(b.total_points) || 0) - (Number(a.total_points) || 0)
  );

  const tableRows = sortedStudents.map((s, idx) => {
    const ptsTahfizh = Number(s.tahfizh_points) || 0;
    const ptsKesantrian = Number(s.kesantrian_points) || 0;
    const ptsAkademik = Number(s.akademik_points) || 0;
    const ptsTotal = Number(s.total_points) || 0;
    const status = ptsTotal < 20 ? 'AMAN' : ptsTotal < 50 ? 'PEMBINAAN' : 'ATENSI SP';
    return [
      (idx + 1).toString(),
      s.student_number || '-',
      s.name,
      s.class || '-',
      `${ptsTahfizh} Poin`,
      `${ptsKesantrian} Poin`,
      `${ptsAkademik} Poin`,
      `${ptsTotal} Poin`,
      status,
    ];
  });

  const bodyData: any[] = tableRows.length > 0
    ? tableRows
    : [
        [
          {
            content: '— Tidak ada data santri yang cocok dengan kriteria filter —',
            colSpan: 9,
            styles: {
              halign: 'center',
              fontStyle: 'italic',
              textColor: [100, 116, 139],
              minCellHeight: 14,
            },
          },
        ],
      ];

  autoTable(doc, {
    startY: currentY,
    head: [['No', 'NIS', 'Nama Santri', 'Kls', 'Poin Tahfizh', 'Poin Kesantrian', 'Poin Akademik', 'Total Poin', 'Status']],
    body: bodyData,
    theme: 'plain',
    headStyles: {
      fillColor: [30, 41, 59], // Slate 800
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      cellPadding: { top: 2.5, bottom: 2.5, left: 1.2, right: 1.2 },
    },
    bodyStyles: {
      fontSize: 7.2,
      cellPadding: { top: 2.2, bottom: 2.2, left: 1.2, right: 1.2 },
      textColor: [30, 41, 59],
      valign: 'middle',
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 9, fontStyle: 'bold', textColor: [100, 116, 139] },
      1: { halign: 'center', cellWidth: 18 },
      2: { cellWidth: 46, fontStyle: 'bold' },
      3: { halign: 'center', cellWidth: 10, textColor: [79, 70, 229] },
      4: { halign: 'center', cellWidth: 22 },
      5: { halign: 'center', cellWidth: 24 },
      6: { halign: 'center', cellWidth: 23 },
      7: { halign: 'center', fontStyle: 'bold', cellWidth: 14 },
      8: { halign: 'center', fontStyle: 'bold', cellWidth: 16 },
    },
    didDrawCell: (data) => {
      if (data.section === 'body') {
        // Poin Tahfizh (kolom index 4)
        if (data.column.index === 4 && data.cell.raw !== undefined) {
          const raw = parseInt(String(data.cell.raw), 10) || 0;
          if (raw > 0) doc.setTextColor(16, 120, 80); // Emerald
        }
        // Poin Kesantrian (kolom index 5)
        if (data.column.index === 5 && data.cell.raw !== undefined) {
          const raw = parseInt(String(data.cell.raw), 10) || 0;
          if (raw > 0) doc.setTextColor(37, 99, 235); // Blue
        }
        // Poin Akademik (kolom index 6)
        if (data.column.index === 6 && data.cell.raw !== undefined) {
          const raw = parseInt(String(data.cell.raw), 10) || 0;
          if (raw > 0) doc.setTextColor(124, 58, 237); // Purple
        }
        // Total Poin (kolom index 7)
        if (data.column.index === 7 && data.cell.raw !== undefined) {
          const raw = parseInt(String(data.cell.raw), 10) || 0;
          if (raw === 0) {
            doc.setTextColor(16, 185, 129); // Emerald
          } else if (raw < 50) {
            doc.setTextColor(217, 119, 6); // Amber
          } else {
            doc.setTextColor(225, 29, 72); // Rose
          }
        }
        // Status styling (kolom index 8)
        if (data.column.index === 8 && data.cell.raw !== undefined) {
          const status = String(data.cell.raw);
          if (status === 'AMAN') {
            doc.setTextColor(4, 120, 87);
          } else if (status === 'PEMBINAAN') {
            doc.setTextColor(180, 83, 9);
          } else {
            doc.setTextColor(190, 24, 93);
          }
        }
      }
    },
    margin: { left: 14, right: 14 },
  });

  // 5. Pengesahan
  const finalY = (doc as any).lastAutoTable.finalY;
  drawOfficialSignatures(doc, settings, finalY, 'tahfizh');

  const fileName = `Laporan_Data_Santri_${new Date().toISOString().split('T')[0]}.pdf`;
  const blobUrl = doc.output('bloburl');

  return {
    doc,
    fileName,
    blobUrl: typeof blobUrl === 'string' ? blobUrl : URL.createObjectURL(doc.output('blob')),
  };
}

/**
 * Buat Dokumen jsPDF Surat Rekap Poin & Pelanggaran Individual Santri
 */
export function buildStudentDetailPDF(
  student: Student,
  records: ViolationRecord[],
  settings: SchoolSettings
): PDFGenerationResult {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // 1. Kop Surat
  let currentY = drawOfficialHeader(doc, settings);

  // 2. Judul
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 36, 63);
  doc.text('SURAT REKAPITULASI POIN & PELANGGARAN SANTRI', pageWidth / 2, currentY, { align: 'center' });

  currentY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Lembar Informasi Kedisiplinan & Capaian Kegiatan Halaqah Tahfizh', pageWidth / 2, currentY, { align: 'center' });

  // 3. Biodata Santri Glassmorphic Card
  currentY += 6;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.35);
  doc.roundedRect(14, currentY, pageWidth - 28, 28, 2, 2, 'FD');

  // Accent line
  doc.setFillColor(79, 70, 229);
  doc.roundedRect(14, currentY, 1.5, 28, 0.8, 0.8, 'F');

  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);

  // Left column
  doc.setFont('helvetica', 'bold');
  doc.text('Nama Santri', 20, currentY + 6);
  doc.text('NIS / ID', 20, currentY + 12);
  doc.text('Kelas', 20, currentY + 18);
  doc.text('Jenis Kelamin', 20, currentY + 24);

  doc.setFont('helvetica', 'normal');
  doc.text(`:  ${student.name}`, 48, currentY + 6);
  doc.text(`:  ${student.student_number}`, 48, currentY + 12);
  doc.text(`:  ${student.class}`, 48, currentY + 18);
  doc.text(`:  ${student.gender === 'L' ? 'Laki-laki' : 'Perempuan'}`, 48, currentY + 24);

  // Right column
  doc.setFont('helvetica', 'bold');
  doc.text('Halaqah', 110, currentY + 6);
  doc.text('Muhafizh', 110, currentY + 12);
  doc.text('Tahun Ajaran', 110, currentY + 18);
  doc.text('Status Santri', 110, currentY + 24);

  doc.setFont('helvetica', 'normal');
  doc.text(`:  ${student.halaqah_name || '-'}`, 136, currentY + 6);
  doc.text(`:  ${student.teacher_name || '-'}`, 136, currentY + 12);
  doc.text(`:  ${student.academic_year || '2025/2026'}`, 136, currentY + 18);

  const netPoints = Number(student.total_points || 0);
  const statusName = student.status_info?.statusName || (netPoints < 20 ? 'AMAN' : 'PERLU PEMBINAAN');
  doc.setFont('helvetica', 'bold');
  if (statusName === 'AMAN') {
    doc.setTextColor(16, 120, 80); // Emerald
  } else if (netPoints < 50) {
    doc.setTextColor(180, 83, 9); // Amber
  } else {
    doc.setTextColor(190, 24, 93); // Rose
  }
  doc.text(`:  ${statusName} (${netPoints} POIN)`, 136, currentY + 24);

  currentY += 34;

  // 4. Tabel Riwayat Pelanggaran
  const sortedRecords = [...records].sort(
    (a, b) => (Number(b.points_snapshot) || 0) - (Number(a.points_snapshot) || 0)
  );

  const tableRows = sortedRecords.map((r, idx) => [
    (idx + 1).toString(),
    r.date || '-',
    r.time || '-',
    r.violation_name_snapshot || '-',
    `${r.points_snapshot} Poin`,
    r.halaqah_name_snapshot || '-',
    r.teacher_name_snapshot || '-',
    r.status === 'cancelled' ? 'Dibatalkan' : 'Aktif',
    r.notes || '-',
  ]);

  const bodyData: any[] = tableRows.length > 0
    ? tableRows
    : [
        [
          {
            content: 'Alhamdulillah, tidak ada catatan pelanggaran disiplin yang tercatat untuk santri ini.',
            colSpan: 9,
            styles: {
              halign: 'center',
              fontStyle: 'italic',
              textColor: [16, 120, 80],
              minCellHeight: 18,
            },
          },
        ],
      ];

  autoTable(doc, {
    startY: currentY,
    head: [['No', 'Tanggal', 'Waktu', 'Jenis Pelanggaran', 'Poin', 'Halaqah', 'Muhafizh', 'Status', 'Catatan']],
    body: bodyData,
    theme: 'plain',
    headStyles: {
      fillColor: [30, 41, 59], // Slate 800
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      cellPadding: { top: 2.5, bottom: 2.5, left: 1.5, right: 1.5 },
    },
    bodyStyles: {
      fontSize: 7.2,
      cellPadding: 2.2,
      textColor: [30, 41, 59],
      valign: 'middle',
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10, fontStyle: 'bold', textColor: [100, 116, 139] },
      1: { halign: 'center', cellWidth: 18 },
      2: { halign: 'center', cellWidth: 14 },
      3: { cellWidth: 40 },
      4: { halign: 'center', fontStyle: 'bold', cellWidth: 14, textColor: [190, 24, 93] },
      5: { cellWidth: 22 },
      6: { cellWidth: 26 },
      7: { halign: 'center', cellWidth: 15, fontStyle: 'bold' },
      8: { cellWidth: 23, textColor: [100, 116, 139] },
    },
    margin: { left: 14, right: 14 },
  });

  // 5. Signature Section
  const finalY = (doc as any).lastAutoTable.finalY;
  drawOfficialSignatures(doc, settings, finalY, 'tahfizh', student.teacher_name);

  const cleanName = student.name.replace(/\s+/g, '_');
  const fileName = `Rekap_Poin_${cleanName}_${student.student_number}.pdf`;
  const blobUrl = doc.output('bloburl');

  return {
    doc,
    fileName,
    blobUrl: typeof blobUrl === 'string' ? blobUrl : URL.createObjectURL(doc.output('blob')),
  };
}

/**
 * Cetak Surat Rekap Individual Santri Langsung
 */
export function generateStudentDetailPDF(
  student: Student,
  records: ViolationRecord[],
  settings: SchoolSettings
) {
  const result = buildStudentDetailPDF(student, records, settings);
  result.doc.save(result.fileName);
  return result;
}
