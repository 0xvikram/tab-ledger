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
