import { getFirebaseDb } from './firebase';
import {
  collection, addDoc, getDocs, deleteDoc, doc,
  query, where, orderBy, Timestamp,
} from 'firebase/firestore';
import { JournalEntry } from '../types';

const COLLECTION = 'journal';

export async function fetchUserEntries(userId: string, year: number, month?: number): Promise<JournalEntry[]> {
  try {
    const startDate = month
      ? new Date(year, month - 1, 1)
      : new Date(year, 0, 1);
    const endDate = month
      ? new Date(year, month, 0, 23, 59, 59)
      : new Date(year, 11, 31, 23, 59, 59);

    const q = query(
      collection(getFirebaseDb(), COLLECTION),
      where('userId', '==', userId),
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate)),
      orderBy('date', 'desc'),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({
      ...d.data(),
      id:        d.id,
      date:      (d.data().date as Timestamp).toDate(),
      createdAt: (d.data().createdAt as Timestamp).toDate(),
    })) as JournalEntry[];
  } catch (error) {
    console.error('Fetch entries failed:', error);
    return [];
  }
}

export async function addJournalEntry(entry: Omit<JournalEntry, 'id'>): Promise<string | null> {
  try {
    const ref = await addDoc(collection(getFirebaseDb(), COLLECTION), {
      ...entry,
      date:      Timestamp.fromDate(entry.date),
      createdAt: Timestamp.fromDate(entry.createdAt),
    });
    return ref.id;
  } catch (error) {
    console.error('Add entry failed:', error);
    return null;
  }
}

export async function deleteJournalEntry(entryId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(getFirebaseDb(), COLLECTION, entryId));
    return true;
  } catch (error) {
    console.error('Delete entry failed:', error);
    return false;
  }
}
