import { getAuth, onAuthStateChanged, signInAnonymously, type User } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  initializeFirestore,
  onSnapshot,
  orderBy,
  persistentLocalCache,
  persistentMultipleTabManager,
  query,
  type Firestore,
} from "firebase/firestore";
import { firebaseApp } from "./ai";
import type { Entry } from "./ledger";

let db: Firestore | null = null;

function firestore(): Firestore {
  if (db) return db;
  // Offline first: every write lands in IndexedDB at once and syncs when the shop has signal.
  db = initializeFirestore(firebaseApp(), {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
  return db;
}

export function watchUser(cb: (u: User | null) => void): () => void {
  const auth = getAuth(firebaseApp());
  const stop = onAuthStateChanged(auth, (u) => {
    if (u) cb(u);
    else signInAnonymously(auth).catch(() => cb(null));
  });
  return stop;
}

const entriesOf = (uid: string) => collection(firestore(), "shops", uid, "entries");

export function watchEntries(uid: string, cb: (e: Entry[], pending: number) => void, onError: (e: Error) => void) {
  return onSnapshot(
    query(entriesOf(uid), orderBy("at", "desc")),
    { includeMetadataChanges: true },
    (snap) => {
      let pending = 0;
      const list = snap.docs.map((d) => {
        if (d.metadata.hasPendingWrites) pending++;
        return { ...(d.data() as Omit<Entry, "id">), id: d.id };
      });
      cb(list, pending);
    },
    onError,
  );
}

export async function saveEntry(uid: string, e: Omit<Entry, "id">): Promise<void> {
  // Not awaited for the server: offline writes resolve only when synced, so fire and let the cache hold it.
  void addDoc(entriesOf(uid), e);
}

export async function removeEntry(uid: string, id: string): Promise<void> {
  void deleteDoc(doc(firestore(), "shops", uid, "entries", id));
}

// A book that lives only in memory, for the one-click judge demo at /app/demo. Nothing is written to Firestore.
export interface Book {
  watch(cb: (e: Entry[], pending: number) => void, onError: (e: Error) => void): () => void;
  save(e: Omit<Entry, "id">): void;
  remove(id: string): void;
}

export function firestoreBook(uid: string): Book {
  return {
    watch: (cb, onError) => watchEntries(uid, cb, onError),
    save: (e) => void saveEntry(uid, e),
    remove: (id) => void removeEntry(uid, id),
  };
}

export function memoryBook(seed: Omit<Entry, "id">[]): Book {
  let entries: Entry[] = seed.map((e, i) => ({ ...e, id: `demo-${i}` }));
  const subs = new Set<(e: Entry[], p: number) => void>();
  const emit = () => {
    const sorted = [...entries].sort((a, b) => b.at - a.at);
    subs.forEach((s) => s(sorted, 0));
  };
  let n = entries.length;
  return {
    watch(cb) {
      subs.add(cb);
      queueMicrotask(emit);
      return () => void subs.delete(cb);
    },
    save(e) {
      entries = [...entries, { ...e, id: `demo-${n++}` }];
      emit();
    },
    remove(id) {
      entries = entries.filter((e) => e.id !== id);
      emit();
    },
  };
}
