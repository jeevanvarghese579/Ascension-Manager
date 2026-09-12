import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { db as firestore } from './firebase';

const LOCAL_DATABASE = 'ascension-manager-local';
const LOCAL_STORE = 'app-data';
const LOCAL_RECORD = 'database';
const CLOUD_ROOT = 'ascensionManagerUsers';
const CLOUD_COLLECTIONS = ['students', 'items', 'participations', 'groupMembers', 'uploadedPhotos'];

function openLocalDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(LOCAL_DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(LOCAL_STORE)) {
        request.result.createObjectStore(LOCAL_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function localRequest(mode, action) {
  return openLocalDatabase().then(
    (database) =>
      new Promise((resolve, reject) => {
        const transaction = database.transaction(LOCAL_STORE, mode);
        const store = transaction.objectStore(LOCAL_STORE);
        const request = action(store);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => database.close();
        transaction.onerror = () => reject(transaction.error);
      })
  );
}

export async function loadLocalData({ legacyStorageKey, createDefault, normalize }) {
  const stored = await localRequest('readonly', (store) => store.get(LOCAL_RECORD));
  if (stored) return normalize(stored);

  const legacy = localStorage.getItem(legacyStorageKey);
  let initial = createDefault();
  if (legacy) {
    try {
      initial = normalize(JSON.parse(legacy));
    } catch {
      // Keep the default data if the legacy value cannot be read.
    }
  }
  await saveLocalData(initial);
  return initial;
}

export function saveLocalData(value) {
  return localRequest('readwrite', (store) => store.put(value, LOCAL_RECORD));
}

const userRoot = (userId) => doc(firestore, CLOUD_ROOT, userId);
const userCollection = (userId, name) => collection(firestore, CLOUD_ROOT, userId, name);

function logFirestoreOperation(operation, path, details = {}) {
  console.info('[Ascension Firestore]', {
    operation,
    projectId: firestore.app.options.projectId,
    path,
    ...details
  });
}

export async function loadCloudData(userId, createDefault, normalize) {
  const rootPath = `${CLOUD_ROOT}/${userId}`;
  logFirestoreOperation('get', rootPath, { uid: userId });
  let rootSnapshot;
  try {
    rootSnapshot = await getDoc(userRoot(userId));
  } catch (error) {
    console.error('[Ascension Firestore] Workspace root read denied or failed', {
      uid: userId,
      projectId: firestore.app.options.projectId,
      path: rootPath,
      code: error?.code || null,
      message: error?.message || String(error)
    });
    throw error;
  }
  if (!rootSnapshot.exists()) {
    const initial = createDefault();
    await saveCloudData(userId, initial, null);
    return initial;
  }

  const root = rootSnapshot.data();
  const entries = await Promise.all(
    CLOUD_COLLECTIONS.map(async (name) => {
      logFirestoreOperation('list', `${CLOUD_ROOT}/${userId}/${name}`, { uid: userId });
      const snapshot = await getDocs(userCollection(userId, name));
      return [name, snapshot.docs.map((entry) => ({ ...entry.data(), id: entry.id }))];
    })
  );

  return normalize({
    categories: root.categories,
    levels: root.levels,
    ...Object.fromEntries(entries)
  });
}

function changedRecords(previous = [], next = []) {
  const before = new Map(previous.map((entry) => [entry.id, entry]));
  const after = new Map(next.map((entry) => [entry.id, entry]));
  const changes = [];

  after.forEach((value, id) => {
    if (JSON.stringify(before.get(id)) !== JSON.stringify(value)) {
      changes.push({ type: 'set', id, value });
    }
  });
  before.forEach((_, id) => {
    if (!after.has(id)) changes.push({ type: 'delete', id });
  });
  return changes;
}

export async function saveCloudData(userId, value, previous) {
  logFirestoreOperation('set', `${CLOUD_ROOT}/${userId}`, { uid: userId });
  await setDoc(
    userRoot(userId),
    {
      categories: value.categories,
      levels: value.levels,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

  const operations = CLOUD_COLLECTIONS.flatMap((name) =>
    changedRecords(previous?.[name], value[name]).map((change) => ({ ...change, collectionName: name }))
  );

  for (let index = 0; index < operations.length; index += 400) {
    logFirestoreOperation('batch-write', `${CLOUD_ROOT}/${userId}/{collection}/{document}`, {
      uid: userId,
      operationCount: Math.min(400, operations.length - index)
    });
    const batch = writeBatch(firestore);
    operations.slice(index, index + 400).forEach((operation) => {
      const reference = doc(userCollection(userId, operation.collectionName), operation.id);
      if (operation.type === 'delete') batch.delete(reference);
      else batch.set(reference, operation.value);
    });
    await batch.commit();
  }
}
