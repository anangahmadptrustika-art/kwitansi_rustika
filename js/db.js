/* =========================================================================
 * db.js — Lapisan penyimpanan berbasis IndexedDB
 * Menyimpan kwitansi, pengaturan, dan gambar (logo + bukti transfer) secara
 * lokal di browser. Tidak butuh server.
 * ========================================================================= */
(function (global) {
  "use strict";

  const DB_NAME = "kwitansiRustikaDB";
  const DB_VERSION = 1;
  const STORE_RECEIPTS = "receipts";
  const STORE_SETTINGS = "settings";

  let _db = null;

  function open() {
    return new Promise((resolve, reject) => {
      if (_db) return resolve(_db);
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_RECEIPTS)) {
          const s = db.createObjectStore(STORE_RECEIPTS, { keyPath: "id" });
          s.createIndex("createdAt", "createdAt", { unique: false });
          s.createIndex("requestDate", "requestDate", { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
          db.createObjectStore(STORE_SETTINGS, { keyPath: "key" });
        }
      };
      req.onsuccess = (e) => {
        _db = e.target.result;
        resolve(_db);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  function tx(store, mode) {
    return open().then((db) => db.transaction(store, mode).objectStore(store));
  }

  function reqToPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /* ----- Receipts ----- */
  const Receipts = {
    async all() {
      const store = await tx(STORE_RECEIPTS, "readonly");
      const list = await reqToPromise(store.getAll());
      // urut terbaru dulu
      return list.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    },
    async get(id) {
      const store = await tx(STORE_RECEIPTS, "readonly");
      return reqToPromise(store.get(id));
    },
    async put(receipt) {
      const store = await tx(STORE_RECEIPTS, "readwrite");
      await reqToPromise(store.put(receipt));
      return receipt;
    },
    async bulkPut(receipts) {
      const db = await open();
      return new Promise((resolve, reject) => {
        const t = db.transaction(STORE_RECEIPTS, "readwrite");
        const store = t.objectStore(STORE_RECEIPTS);
        receipts.forEach((r) => store.put(r));
        t.oncomplete = () => resolve(receipts.length);
        t.onerror = () => reject(t.error);
      });
    },
    async remove(id) {
      const store = await tx(STORE_RECEIPTS, "readwrite");
      return reqToPromise(store.delete(id));
    },
    async clear() {
      const store = await tx(STORE_RECEIPTS, "readwrite");
      return reqToPromise(store.clear());
    },
  };

  /* ----- Settings (key/value) ----- */
  const Settings = {
    async get(key) {
      const store = await tx(STORE_SETTINGS, "readonly");
      const row = await reqToPromise(store.get(key));
      return row ? row.value : undefined;
    },
    async set(key, value) {
      const store = await tx(STORE_SETTINGS, "readwrite");
      await reqToPromise(store.put({ key, value }));
      return value;
    },
  };

  global.DB = { open, Receipts, Settings, DB_NAME };
})(window);
