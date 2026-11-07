// Client-Side Event Synchronization Manager
// Ensures unified, real-time data synchronization across devices and browser tabs.
// The Server (Neon PostgreSQL + SQLite) is the SINGLE SOURCE OF TRUTH.

import { Student, ViolationRecord, PositiveRecord, User, Halaqah, Teacher } from '../types';

const PERSISTENT_SNAPSHOT_KEY = 'imbs_v3_persistent_snapshot';

const LEGACY_KEYS = [
  'imbs_deleted_student_ids',
  'imbs_created_students',
  'imbs_updated_students',
  'imbs_deleted_violation_ids',
  'imbs_created_violations',
  'imbs_deleted_record_ids',
  'imbs_cancelled_records',
  'imbs_created_records',
  'imbs_deleted_pos_record_ids',
  'imbs_cancelled_pos_records',
  'imbs_created_pos_records',
  'imbs_deleted_user_ids',
  'imbs_created_users',
  'imbs_updated_users',
  'imbs_deleted_halaqah_ids',
  'imbs_created_halaqahs',
  'imbs_updated_halaqahs',
  'imbs_deleted_teacher_ids',
  'imbs_created_teachers',
  'imbs_updated_teachers',
  'imbs_cached_server_state',
];

export function cleanupLegacyLocalStorageOverrides() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  for (const k of LEGACY_KEYS) {
    try {
      window.localStorage.removeItem(k);
    } catch {}
  }
  try {
    window.localStorage.setItem('imbs_schema_version', 'v3_server_single_truth');
  } catch {}
}

// Immediately purge legacy client overrides on script evaluation
cleanupLegacyLocalStorageOverrides();

let saveSnapshotTimeout: any = null;

function scheduleSnapshotBackup() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  if (saveSnapshotTimeout) clearTimeout(saveSnapshotTimeout);
  saveSnapshotTimeout = setTimeout(async () => {
    try {
      const apiBase = (import.meta as any).env?.VITE_API_URL || '/api';
      const res = await fetch(`${apiBase}/sync/state`);
      if (res.ok) {
        const json = await res.json();
        if (json.state) {
          window.localStorage.setItem(
            PERSISTENT_SNAPSHOT_KEY,
            JSON.stringify({
              state: json.state,
              updatedAt: Date.now(),
              cloudConnected: !!json.cloud?.isConnected,
            })
          );
        }
      }
    } catch {}
  }, 400);
}

export const storageSync = {
  notifyDataChange(detail?: { action: string; resource: string; id?: string }) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app:data-changed', { detail }));
      scheduleSnapshotBackup();
    }
  },

  // === Backward compatibility stubs (always defer to server authority) ===
  getDeletedStudentIds(): Set<string> {
    return new Set<string>();
  },
  addDeletedStudentId(id: string) {
    this.notifyDataChange({ action: 'delete', resource: 'student', id });
  },
  getCreatedStudents(): Student[] {
    return [];
  },
  saveCreatedStudent(student: Student) {
    this.notifyDataChange({ action: 'create', resource: 'student', id: student.id });
  },
  saveCreatedStudentsBulk(_students: Student[]) {
    this.notifyDataChange({ action: 'bulk_create', resource: 'student' });
  },
  getUpdatedStudents(): Record<string, Partial<Student>> {
    return {};
  },
  saveUpdatedStudent(id: string, _updates: Partial<Student>) {
    this.notifyDataChange({ action: 'update', resource: 'student', id });
  },

  // === VIOLATION RECORDS ===
  getDeletedRecordIds(): Set<string> {
    return new Set<string>();
  },
  addDeletedRecordId(id: string) {
    this.notifyDataChange({ action: 'delete', resource: 'record', id });
  },
  getCancelledRecords(): Record<string, string> {
    return {};
  },
  addCancelledRecord(id: string, _reason: string) {
    this.notifyDataChange({ action: 'cancel', resource: 'record', id });
  },
  getCreatedRecords(): ViolationRecord[] {
    return [];
  },
  saveCreatedRecord(record: ViolationRecord) {
    this.notifyDataChange({ action: 'create', resource: 'record', id: record.id });
  },

  // === POSITIVE RECORDS ===
  getDeletedPosRecordIds(): Set<string> {
    return new Set<string>();
  },
  addDeletedPosRecordId(id: string) {
    this.notifyDataChange({ action: 'delete', resource: 'positive_record', id });
  },
  getCancelledPosRecords(): Record<string, string> {
    return {};
  },
  addCancelledPosRecord(id: string, _reason: string) {
    this.notifyDataChange({ action: 'cancel', resource: 'positive_record', id });
  },
  getCreatedPosRecords(): PositiveRecord[] {
    return [];
  },
  saveCreatedPosRecord(record: PositiveRecord) {
    this.notifyDataChange({ action: 'create', resource: 'positive_record', id: record.id });
  },

  // === USERS ===
  getDeletedUserIds(): Set<string> {
    return new Set<string>();
  },
  addDeletedUserId(id: string) {
    this.notifyDataChange({ action: 'delete', resource: 'user', id });
  },
  getCreatedUsers(): User[] {
    return [];
  },
  saveCreatedUser(u: User) {
    this.notifyDataChange({ action: 'create', resource: 'user', id: u.id });
  },
  getUpdatedUsers(): Record<string, Partial<User>> {
    return {};
  },
  saveUpdatedUser(id: string, _updates: Partial<User>) {
    this.notifyDataChange({ action: 'update', resource: 'user', id });
  },

  // === HALAQAH ===
  getDeletedHalaqahIds(): Set<string> {
    return new Set<string>();
  },
  addDeletedHalaqahId(id: string) {
    this.notifyDataChange({ action: 'delete', resource: 'halaqah', id });
  },
  getCreatedHalaqahs(): Halaqah[] {
    return [];
  },
  saveCreatedHalaqah(h: Halaqah) {
    this.notifyDataChange({ action: 'create', resource: 'halaqah', id: h.id });
  },
  getUpdatedHalaqahs(): Record<string, Partial<Halaqah>> {
    return {};
  },
  saveUpdatedHalaqah(id: string, _updates: Partial<Halaqah>) {
    this.notifyDataChange({ action: 'update', resource: 'halaqah', id });
  },

  // === TEACHERS ===
  getDeletedTeacherIds(): Set<string> {
    return new Set<string>();
  },
  addDeletedTeacherId(id: string) {
    this.notifyDataChange({ action: 'delete', resource: 'teacher', id });
  },
  getCreatedTeachers(): Teacher[] {
    return [];
  },
  saveCreatedTeacher(t: Teacher) {
    this.notifyDataChange({ action: 'create', resource: 'teacher', id: t.id });
  },
  getUpdatedTeachers(): Record<string, Partial<Teacher>> {
    return {};
  },
  saveUpdatedTeacher(id: string, _updates: Partial<Teacher>) {
    this.notifyDataChange({ action: 'update', resource: 'teacher', id });
  },

  // === VIOLATIONS MASTER ===
  getDeletedViolationIds(): Set<string> {
    return new Set<string>();
  },
  addDeletedViolationId(id: string) {
    this.notifyDataChange({ action: 'delete', resource: 'violation', id });
  },
  getCreatedViolations(): any[] {
    return [];
  },
  saveCreatedViolation(v: any) {
    this.notifyDataChange({ action: 'create', resource: 'violation', id: v.id });
  },

  // === RESET & SYNC HELPERS ===
  resetToDemo() {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(PERSISTENT_SNAPSHOT_KEY);
    }
    cleanupLegacyLocalStorageOverrides();
    this.notifyDataChange({ action: 'reset', resource: 'all' });
  },

  async syncWithServer(): Promise<{ success: boolean; cloud?: any; state?: any }> {
    const apiBase = (import.meta as any).env?.VITE_API_URL || '/api';
    try {
      const res = await fetch(`${apiBase}/sync/state`);
      if (!res.ok) return { success: false };
      const json = await res.json();
      const serverState = json.state;
      const isCloudConnected = !!json.cloud?.isConnected;

      // If cloud is connected, server state is always the authoritative source of truth
      if (isCloudConnected) {
        if (typeof window !== 'undefined' && window.localStorage && serverState) {
          window.localStorage.setItem(
            PERSISTENT_SNAPSHOT_KEY,
            JSON.stringify({ state: serverState, updatedAt: Date.now(), cloudConnected: true })
          );
        }
        this.notifyDataChange({ action: 'sync_completed', resource: 'all' });
        return { success: true, cloud: json.cloud, state: serverState };
      }

      // If in serverless ephemeral mode (Vercel without Postgres/Blob)
      if (typeof window !== 'undefined' && window.localStorage) {
        const rawLocal = window.localStorage.getItem(PERSISTENT_SNAPSHOT_KEY);
        if (rawLocal) {
          try {
            const localData = JSON.parse(rawLocal);
            const localState = localData.state;

            // Check if server is a cold-started container that has fewer students/records/halaqahs or missing tombstones than local
            const serverStudentCount = Array.isArray(serverState?.students) ? serverState.students.length : 0;
            const localStudentCount = Array.isArray(localState?.students) ? localState.students.length : 0;
            const serverHalaqahCount = Array.isArray(serverState?.halaqah) ? serverState.halaqah.length : 0;
            const localHalaqahCount = Array.isArray(localState?.halaqah) ? localState.halaqah.length : 0;
            const serverRecordCount = Array.isArray(serverState?.violation_records) ? serverState.violation_records.length : 0;
            const localRecordCount = Array.isArray(localState?.violation_records) ? localState.violation_records.length : 0;
            const localTombstoneCount = Array.isArray(localState?.tombstones) ? localState.tombstones.length : 0;

            const isServerCold =
              (serverStudentCount === 0 && localStudentCount > 0) ||
              (serverHalaqahCount === 0 && localHalaqahCount > 0) ||
              (serverRecordCount === 0 && localRecordCount > 0) ||
              localTombstoneCount > (serverState?.tombstones?.length || 0);

            if (isServerCold && localState) {
              console.log('[StorageSync] Serverless container is cold, automatically re-hydrating latest snapshot...');
              const pushRes = await fetch(`${apiBase}/sync/state`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientState: localState }),
              });
              if (pushRes.ok) {
                const pushJson = await pushRes.json();
                this.notifyDataChange({ action: 'rehydrate_completed', resource: 'all' });
                return { success: true, cloud: json.cloud, state: pushJson.state || localState };
              }
            }
          } catch (e) {
            console.warn('[StorageSync] Error checking local snapshot:', e);
          }
        }

        // Save server state to local snapshot
        if (serverState) {
          window.localStorage.setItem(
            PERSISTENT_SNAPSHOT_KEY,
            JSON.stringify({ state: serverState, updatedAt: Date.now(), cloudConnected: false })
          );
        }
      }

      this.notifyDataChange({ action: 'sync_completed', resource: 'all' });
      return { success: true, cloud: json.cloud, state: serverState };
    } catch (err) {
      console.warn('[StorageSync] Server sync notice:', err);
    }
    return { success: false };
  },

  reconcileDeletedStudentIds(_serverStudentIds: string[]) {},
};

// Automatic multi-device / multi-tab synchronizer
if (typeof window !== 'undefined') {
  // Sync when user refocuses the browser or switches tabs
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      storageSync.syncWithServer();
    }
  });

  window.addEventListener('focus', () => {
    storageSync.syncWithServer();
  });

  // Background light sync every 25s when tab is active
  setInterval(() => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      storageSync.syncWithServer();
    }
  }, 25000);
}
