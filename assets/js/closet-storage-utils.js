"use strict";

(function exposeClosetStorageUtils() {
  function openDatabase({ name, version }) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(name, version);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("items")) {
          db.createObjectStore("items", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("images")) {
          const imageStore = db.createObjectStore("images", { keyPath: "id" });
          imageStore.createIndex("itemId", "itemId", { unique: false });
        }
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta", { keyPath: "key" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function all(db, storeName) {
    return new Promise((resolve, reject) => {
      const request = db.transaction(storeName, "readonly").objectStore(storeName).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  function get(db, storeName, key) {
    return new Promise((resolve, reject) => {
      const request = db.transaction(storeName, "readonly").objectStore(storeName).get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function put(db, storeName, value) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      tx.objectStore(storeName).put(value);
      tx.oncomplete = () => resolve(value);
      tx.onerror = () => reject(tx.error);
    });
  }

  function remove(db, storeName, key) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      tx.objectStore(storeName).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  function clear(db, storeNames) {
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
    return new Promise((resolve, reject) => {
      const tx = db.transaction(names, "readwrite");
      names.forEach((storeName) => tx.objectStore(storeName).clear());
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function metaValue(db, key) {
    const record = await get(db, "meta", key);
    return record?.value || "";
  }

  async function setMetaValue(db, key, value) {
    await put(db, "meta", { key, value });
  }

  window.closetStorageUtils = {
    all,
    clear,
    get,
    metaValue,
    openDatabase,
    put,
    remove,
    setMetaValue
  };
})();
