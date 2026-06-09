import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Client, ClientType } from '../types/business';
import { saveToFirestore, deleteFromFirestore } from '../services/firestoreSync';
import { useAuthStore } from './authStore';

const KEY = 'clients';

type ClientState = {
  clients: Client[];
  addClient:      (c: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'type'> & { type?: ClientType }) => Client;
  updateClient:   (id: string, partial: Partial<Client>) => void;
  deleteClient:   (id: string) => void;
  getClient:      (id: string) => Client | undefined;
  replaceClients: (clients: Client[]) => void;
  load: () => Promise<void>;
};

function persist(clients: Client[]) {
  AsyncStorage.setItem(KEY, JSON.stringify(clients)).catch(console.error);
}

export const useClientStore = create<ClientState>((set, get) => ({
  clients: [],

  addClient: (data) => {
    const now = new Date().toISOString();
    const client: Client = {
      ...data,
      type: data.type ?? 'COMPANY',   // default when caller omits
      id: Date.now().toString(),
      createdAt: now,
      updatedAt: now,
    };
    const next = [client, ...get().clients];
    set({ clients: next });
    persist(next);
    const uid = useAuthStore.getState().user?.id;
    if (uid) saveToFirestore(uid, 'clients', client.id, client);
    return client;
  },

  updateClient: (id, partial) => {
    const updated = { ...get().clients.find(c => c.id === id)!, ...partial, updatedAt: new Date().toISOString() };
    const next = get().clients.map(c => c.id === id ? updated : c);
    set({ clients: next });
    persist(next);
    const uid = useAuthStore.getState().user?.id;
    if (uid) saveToFirestore(uid, 'clients', id, updated);
  },

  deleteClient: (id) => {
    const next = get().clients.filter(c => c.id !== id);
    set({ clients: next });
    persist(next);
    const uid = useAuthStore.getState().user?.id;
    if (uid) deleteFromFirestore(uid, 'clients', id);
  },

  getClient:      (id) => get().clients.find(c => c.id === id),
  replaceClients: (clients) => { set({ clients }); persist(clients); },

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const parsed: Client[] = JSON.parse(raw);
        // Migrate legacy clients without a type
        const migrated = parsed.map(c => c.type ? c : { ...c, type: 'COMPANY' as const });
        set({ clients: migrated });
      }
    } catch { /* ignore */ }
  },
}));
