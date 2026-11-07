/**
 * Helper untuk pemrosesan, parsing, dan pengurutan kelas sekolah / pesantren
 * Mendukung angka Romawi (I, II, ..., VII, VIII, IX, X, XI, XII) dan Arab (1, 2, ..., 12)
 * beserta pembeda rombel / seksi (contoh: VII-A, VIII B, IX.1, dsb).
 */

const ROMAN_MAP: Record<string, number> = {
  XII: 12,
  XI: 11,
  X: 10,
  IX: 9,
  VIII: 8,
  VII: 7,
  VI: 6,
  V: 5,
  IV: 4,
  III: 3,
  II: 2,
  I: 1,
};

export interface ParsedClass {
  grade: number;
  section: string;
}

/**
 * Parsing teks nama kelas menjadi nilai numerik tingkatan (grade) dan rombel (section).
 * Contoh:
 * - "VII" -> { grade: 7, section: "" }
 * - "Kelas IX-A" -> { grade: 9, section: "A" }
 * - "8B" -> { grade: 8, section: "B" }
 */
export function parseClassGrade(classStr?: string | null): ParsedClass {
  if (!classStr) return { grade: 999, section: '' };
  let str = String(classStr).trim();

  // Buang awalan "kelas" jika ada
  str = str.replace(/^kelas\s+/i, '').trim();

  // Cek apakah diawali angka Romawi (XII s/d I)
  const romanMatch = str.match(/^(XII|XI|X|IX|VIII|VII|VI|V|IV|III|II|I)([\s\-_.]?.*)$/i);
  if (romanMatch) {
    const val = ROMAN_MAP[romanMatch[1].toUpperCase()] || 999;
    const sec = romanMatch[2].replace(/^[\s\-_.]+/, '').trim();
    return { grade: val, section: sec };
  }

  // Cek apakah diawali angka Arab (1 s/d 12)
  const numMatch = str.match(/^(\d+)([\s\-_.]?.*)$/);
  if (numMatch) {
    const val = parseInt(numMatch[1], 10);
    const sec = numMatch[2].replace(/^[\s\-_.]+/, '').trim();
    return { grade: val, section: sec };
  }

  return { grade: 999, section: str };
}

/**
 * Fungsi komparator untuk mengurutkan kelas secara logis (Angka Romawi / Jenjang Kelas).
 * Mengurutkan: VII (7) < VIII (8) < IX (9) < X (10) < XI (11) < XII (12)
 * Apabila jenjangnya sama, diurutkan menurut rombel/seksi (A < B < C).
 */
export function compareClasses(a?: string | null, b?: string | null): number {
  const pA = parseClassGrade(a);
  const pB = parseClassGrade(b);

  if (pA.grade !== pB.grade) {
    return pA.grade - pB.grade;
  }
  return pA.section.localeCompare(pB.section, undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * Mengurutkan array string nama kelas menggunakan compareClasses
 */
export function sortClasses(classes: string[]): string[] {
  return [...classes].sort(compareClasses);
}
