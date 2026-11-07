import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SchoolSettings, Student, ViolationRecord } from '../types';

/**
 * Gambar Emblem Vektor Resmi Pesantren IMBS (Fallback jika logo SVG tidak bisa di-render oleh jsPDF)
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
  doc.line(cx, cy + 2, cx, cy + 3.8);

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
  const schoolNameUpper = (settings.school_name || 'PESANTREN TAHFIZH AL-QUR\'AN IMAM ASY-SYATHIBI').toUpperCase();
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

  const kopText = settings.kop_surat_text || 'DIVISI HALAQAH TAHFIZH AL-QUR\'AN';
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

export interface PDFGenerationResult {
  doc: jsPDF;
  fileName: string;
  blobUrl: string;
}

/**
 * Buat Dokumen jsPDF Laporan Riwayat Pelanggaran Lengkap (Filterable)
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
  doc.text('LAPORAN PENCATATAN PELANGGARAN & POIN HALAQAH', pageWidth / 2, currentY, { align: 'center' });

  currentY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  const printDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  doc.text(`Tahun Ajaran: ${settings.current_academic_year || '2025/2026'} | Dicetak pada: ${printDate}`, pageWidth / 2, currentY, { align: 'center' });

  // 3. Metadata Filter & Executive Summary Card (2-Column Clean Layout)
  currentY += 5;
  const boxHeight = 16;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.roundedRect(14, currentY, pageWidth - 28, boxHeight, 1.5, 1.5, 'FD');

  // Left Section: Parameters
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('PARAMETER FILTER', 19, currentY + 4.8);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  const halaqahText = filterInfo?.halaqah ? filterInfo.halaqah : 'Semua Divisi';
  const periodText = filterInfo?.period ? filterInfo.period : 'Semua Riwayat';
  const categoryText = filterInfo?.category ? `Kategori: ${filterInfo.category}` : 'Kategori: Semua';
  doc.text(`Halaqah: ${halaqahText}`, 19, currentY + 9.2);
  doc.text(`Periode: ${periodText}   |   ${categoryText}`, 19, currentY + 13.2);

  // Vertical Divider inside card
  const divX = pageWidth - 65;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(divX, currentY + 2.2, divX, currentY + boxHeight - 2.2);

  // Right Section: Statistics
  const sortedRecords = [...records].sort(
    (a, b) => (Number(b.points_snapshot) || 0) - (Number(a.points_snapshot) || 0)
  );

  const totalPoints = sortedRecords
    .filter((r) => r.status === 'active')
    .reduce((sum, r) => sum + Number(r.points_snapshot || 0), 0);

  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('RINGKASAN REKAPITULASI', divX + 5, currentY + 4.8);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 36, 63);
  doc.text(`Kejadian: ${sortedRecords.length} Catatan`, divX + 5, currentY + 9.2);

  if (totalPoints > 0) {
    doc.setTextColor(190, 24, 93); // Rose Red
  } else {
    doc.setTextColor(16, 120, 80); // Emerald Green
  }
  doc.text(`Total Poin: ${totalPoints} Poin`, divX + 5, currentY + 13.2);

  currentY += boxHeight + 5;

  // 4. Tabel Pelanggaran
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
    theme: 'grid',
    headStyles: {
      fillColor: [15, 36, 63],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [30, 41, 59],
      valign: 'middle',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', cellWidth: 18 },
      2: { cellWidth: 32 },
      3: { halign: 'center', cellWidth: 10 },
      4: { cellWidth: 24 },
      5: { cellWidth: 36 },
      6: { halign: 'center', fontStyle: 'bold', cellWidth: 14 },
      7: { halign: 'center', cellWidth: 16 },
      8: { cellWidth: 'auto' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14 },
  });

  // 5. Signature Section
  const finalY = (doc as any).lastAutoTable.finalY;
  const pageHeight = doc.internal.pageSize.getHeight();

  let sigY = finalY + 10;
  if (sigY + 36 > pageHeight - 15) {
    doc.addPage();
    sigY = 25;
  }

  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');

  const locDate = `Bogor, ${printDate}`;
  doc.text(locDate, pageWidth - 65, sigY);

  sigY += 5;
  doc.text('Mengetahui,', 25, sigY);
  doc.text('Koordinator Tahfizh / Mudir', 25, sigY + 4);

  doc.text('Petugas / Muhafizh Pengampu', pageWidth - 65, sigY + 4);

  sigY += 20;
  doc.setFont('helvetica', 'bold');
  doc.text('( ............................................ )', 25, sigY);
  doc.text(`( ${filterInfo?.muhafizh || '............................................'} )`, pageWidth - 65, sigY);

  const fileName = `Laporan_Pelanggaran_${new Date().toISOString().split('T')[0]}.pdf`;
  const blobUrl = doc.output('bloburl');

  return {
    doc,
    fileName,
    blobUrl: typeof blobUrl === 'string' ? blobUrl : URL.createObjectURL(doc.output('blob')),
  };
}

/**
 * Cetak Laporan Langsung (Fallback jika tidak preview)
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

  // 3. Biodata Santri Card
  currentY += 6;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, currentY, pageWidth - 28, 28, 2, 2, 'FD');

  doc.setFontSize(9);
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
    doc.setTextColor(16, 120, 80); // Dark Emerald Green
  } else if (netPoints < 50) {
    doc.setTextColor(180, 83, 9); // Amber
  } else {
    doc.setTextColor(190, 24, 93); // Rose/Red
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
    theme: 'grid',
    headStyles: {
      fillColor: [15, 36, 63],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [30, 41, 59],
      valign: 'middle',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', cellWidth: 18 },
      2: { halign: 'center', cellWidth: 12 },
      3: { cellWidth: 40 },
      4: { halign: 'center', fontStyle: 'bold', cellWidth: 14 },
      5: { cellWidth: 22 },
      6: { cellWidth: 26 },
      7: { halign: 'center', cellWidth: 15 },
      8: { cellWidth: 'auto' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14 },
  });

  // 5. Signature Section
  const finalY = (doc as any).lastAutoTable.finalY;
  const pageHeight = doc.internal.pageSize.getHeight();

  let sigY = finalY + 10;
  if (sigY + 36 > pageHeight - 15) {
    doc.addPage();
    sigY = 25;
  }

  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');

  const printDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  doc.text(`Dikeluarkan di Bogor pada: ${printDate}`, pageWidth - 70, sigY);

  sigY += 5;
  doc.text('Mengetahui,', 25, sigY);
  doc.text('Koordinator Tahfizh', 25, sigY + 4);

  doc.text('Muhafizh Pengampu', pageWidth - 70, sigY + 4);

  sigY += 22;
  doc.setFont('helvetica', 'bold');
  doc.text('( ............................................ )', 25, sigY);
  doc.text(`( ${student.teacher_name || '............................................'} )`, pageWidth - 70, sigY);

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
 * Cetak Surat Rekap Individual Santri Langsung (Fallback jika tidak preview)
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
