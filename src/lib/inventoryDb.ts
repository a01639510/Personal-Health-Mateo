export interface InventoryItem {
  id: string;
  barcode?: string;
  name: string;
  brand?: string;
  imageUrl?: string;
  imageBase64?: string;
  category: string;
  quantity: number;
  location?: string;
  entryDate: string;
  expirationDate: string;
  expirationPhotoBase64?: string;
  notifiedAt?: string;
}

const DB_NAME = 'chefrefri-inventory';
const DB_VERSION = 1;
const STORE_NAME = 'items';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('by_expiration', 'expirationDate', { unique: false });
        store.createIndex('by_category', 'category', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const request = fn(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function addItem(item: InventoryItem): Promise<void> {
  await withStore('readwrite', (store) => store.add(item));
}

export async function updateItem(item: InventoryItem): Promise<void> {
  await withStore('readwrite', (store) => store.put(item));
}

export async function deleteItem(id: string): Promise<void> {
  await withStore('readwrite', (store) => store.delete(id));
}

export async function getAllItemsSortedByExpiration(): Promise<InventoryItem[]> {
  const items = await withStore<InventoryItem[]>('readonly', (store) => store.getAll());
  return [...items].sort((a, b) => a.expirationDate.localeCompare(b.expirationDate));
}

export async function getItemsByCategory(category: string): Promise<InventoryItem[]> {
  const all = await getAllItemsSortedByExpiration();
  return all.filter((item) => item.category === category);
}

export async function exportAllAsJson(): Promise<string> {
  const items = await withStore<InventoryItem[]>('readonly', (store) => store.getAll());
  return JSON.stringify({ version: DB_VERSION, exportedAt: new Date().toISOString(), items }, null, 2);
}

export async function importFromJson(json: string): Promise<number> {
  const parsed = JSON.parse(json);
  const items: InventoryItem[] = Array.isArray(parsed) ? parsed : parsed.items || [];
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    for (const item of items) store.put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return items.length;
}
