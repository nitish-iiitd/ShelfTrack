import { STORE_NAMES } from './constants.js';

const DB_NAME = 'shelftrack_db';
const DB_VERSION = 1;

let dbPromise = null;

export function getDatabase() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAMES.CATEGORIES)) {
        const store = db.createObjectStore(STORE_NAMES.CATEGORIES, { keyPath: 'id' });
        store.createIndex('name', 'name', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_NAMES.SUB_CATEGORIES)) {
        const store = db.createObjectStore(STORE_NAMES.SUB_CATEGORIES, { keyPath: 'id' });
        store.createIndex('category_id', 'category_id', { unique: false });
        store.createIndex('name', 'name', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_NAMES.PRODUCTS)) {
        const store = db.createObjectStore(STORE_NAMES.PRODUCTS, { keyPath: 'id' });
        store.createIndex('category_id', 'category_id', { unique: false });
        store.createIndex('sub_category_id', 'sub_category_id', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_NAMES.BACKUPS)) {
        const store = db.createObjectStore(STORE_NAMES.BACKUPS, { keyPath: 'id' });
        store.createIndex('created_at', 'created_at', { unique: false });
        store.createIndex('reason', 'reason', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

export async function getAll(storeName) {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function getById(storeName, id) {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function put(storeName, record) {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(record);
    request.onsuccess = () => resolve(record);
    request.onerror = () => reject(request.error);
  });
}

export async function remove(storeName, id) {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

export async function clearStore(storeName) {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

export async function replaceAllStores(data) {
  const db = await getDatabase();
  const stores = [STORE_NAMES.CATEGORIES, STORE_NAMES.SUB_CATEGORIES, STORE_NAMES.PRODUCTS];

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(stores, 'readwrite');

    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => reject(transaction.error);

    for (const storeName of stores) {
      transaction.objectStore(storeName).clear();
    }

    for (const category of data.categories || []) {
      transaction.objectStore(STORE_NAMES.CATEGORIES).put(category);
    }
    for (const subCategory of data.sub_categories || []) {
      transaction.objectStore(STORE_NAMES.SUB_CATEGORIES).put(subCategory);
    }
    for (const product of data.products || []) {
      transaction.objectStore(STORE_NAMES.PRODUCTS).put(product);
    }
  });
}
