// Base de datos local (IndexedDB) del dispositivo. No hay servidor ni cuenta
// externa: los registros viven en el iPhone/navegador donde se instaló la app.
const DB_NAME = "guardagastos";
const DB_VERSION = 1;
const STORE = "transacciones";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("fecha", "fecha");
        store.createIndex("tipo", "tipo");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function newId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Date.now() + "-" + Math.random().toString(16).slice(2);
}

const DB = {
  async add(tx) {
    const record = Object.assign({ id: newId() }, tx);
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const t = db.transaction(STORE, "readwrite");
      t.objectStore(STORE).add(record);
      t.oncomplete = () => resolve(record);
      t.onerror = () => reject(t.error);
    });
  },

  async remove(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const t = db.transaction(STORE, "readwrite");
      t.objectStore(STORE).delete(id);
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    });
  },

  async all() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const t = db.transaction(STORE, "readonly");
      const req = t.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result.sort((a, b) => (a.fecha < b.fecha ? 1 : -1)));
      req.onerror = () => reject(req.error);
    });
  },

  async replaceAll(list) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const t = db.transaction(STORE, "readwrite");
      const store = t.objectStore(STORE);
      store.clear();
      list.forEach((item) => store.put(Object.assign({ id: item.id || newId() }, item)));
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    });
  },
};
