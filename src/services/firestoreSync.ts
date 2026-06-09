/**
 * Firestore sync service.
 * All functions are fire-and-forget safe — they catch errors silently
 * so the app works offline / when Firebase isn't configured.
 */

import {
  collection, doc, setDoc, getDoc, getDocs,
  deleteDoc as fsDeleteDoc, writeBatch, serverTimestamp,
} from 'firebase/firestore';
import { getFirebaseDb } from './firebase';

import { JournalEntry } from '../types';
import { BusinessProfile, Client, SalesInvoice } from '../types/business';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Firestore Timestamps → ISO strings so data stays JSON-serialisable. */
function normalizeDates(obj: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object' && typeof v.toDate === 'function') {
      out[k] = (v.toDate() as Date).toISOString();
    } else {
      out[k] = v;
    }
  }
  return out;
}

function userCol(uid: string, col: string) {
  return collection(getFirebaseDb(), 'users', uid, col);
}

function userDoc(uid: string, col: string, id: string) {
  return doc(getFirebaseDb(), 'users', uid, col, id);
}

// ─────────────────────────────────────────────────────────────
// Generic CRUD
// ─────────────────────────────────────────────────────────────

export async function saveToFirestore(
  uid: string, col: string, id: string, data: object,
): Promise<void> {
  try {
    await setDoc(userDoc(uid, col, id), { ...data, _updatedAt: serverTimestamp() });
  } catch { /* offline or not configured */ }
}

export async function deleteFromFirestore(
  uid: string, col: string, id: string,
): Promise<void> {
  try {
    await fsDeleteDoc(userDoc(uid, col, id));
  } catch { /* offline */ }
}

async function loadCollection<T>(uid: string, col: string): Promise<T[]> {
  const snap = await getDocs(userCol(uid, col));
  return snap.docs.map(d => normalizeDates(d.data()) as unknown as T);
}

// ─────────────────────────────────────────────────────────────
// Business profile (single document)
// ─────────────────────────────────────────────────────────────

export async function saveBusinessProfile(uid: string, profile: BusinessProfile): Promise<void> {
  try {
    await setDoc(
      doc(getFirebaseDb(), 'users', uid, 'profile', 'businessProfile'),
      { ...profile, _updatedAt: serverTimestamp() },
    );
  } catch { /* offline */ }
}

export async function loadBusinessProfile(uid: string): Promise<BusinessProfile | null> {
  try {
    const snap = await getDoc(doc(getFirebaseDb(), 'users', uid, 'profile', 'businessProfile'));
    return snap.exists() ? normalizeDates(snap.data()) as unknown as BusinessProfile : null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// Initial full sync on login
// ─────────────────────────────────────────────────────────────

export interface AllUserData {
  journalEntries: JournalEntry[];
  clients:        Client[];
  invoices:       SalesInvoice[];
  profile:        BusinessProfile | null;
}

export async function loadAllFromFirestore(uid: string): Promise<AllUserData> {
  try {
    const [journalEntries, clients, invoices, profile] = await Promise.all([
      loadCollection<JournalEntry>(uid, 'journalEntries'),
      loadCollection<Client>(uid, 'clients'),
      loadCollection<SalesInvoice>(uid, 'invoices'),
      loadBusinessProfile(uid),
    ]);
    return {
      journalEntries: journalEntries.map(e => ({
        ...e,
        date:      new Date(e.date as unknown as string),
        createdAt: new Date(e.createdAt as unknown as string),
      })),
      clients,
      invoices,
      profile,
    };
  } catch {
    return { journalEntries: [], clients: [], invoices: [], profile: null };
  }
}

/** Upload local data to Firestore (used for new users on first login). */
export async function uploadAllToFirestore(
  uid: string,
  data: { journal: JournalEntry[]; clients: Client[]; invoices: SalesInvoice[]; profile: BusinessProfile },
): Promise<void> {
  try {
    const batch = writeBatch(getFirebaseDb());
    const ts    = serverTimestamp();

    data.journal.forEach(e => {
      batch.set(userDoc(uid, 'journalEntries', e.id), {
        ...e, date: e.date.toISOString(), createdAt: e.createdAt.toISOString(), _updatedAt: ts,
      });
    });
    data.clients.forEach(c => batch.set(userDoc(uid, 'clients', c.id),   { ...c, _updatedAt: ts }));
    data.invoices.forEach(i => batch.set(userDoc(uid, 'invoices', i.id), { ...i, _updatedAt: ts }));

    await batch.commit();

    // Profile is a single doc, not in the batch
    await saveBusinessProfile(uid, data.profile);
  } catch { /* offline */ }
}
