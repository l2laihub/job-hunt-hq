/**
 * Vitest setup. jsdom in this project's version pairing exposes a stub
 * `localStorage` with no methods, which breaks Zustand's persist middleware
 * (see src/lib/storage-sync.ts). Give tests a real in-memory Storage.
 */
const store = new Map<string, string>();

const memoryStorage: Storage = {
  get length() {
    return store.size;
  },
  key: (i) => [...store.keys()][i] ?? null,
  getItem: (k) => store.get(k) ?? null,
  setItem: (k, v) => void store.set(k, String(v)),
  removeItem: (k) => void store.delete(k),
  clear: () => store.clear(),
};

for (const target of [globalThis, window]) {
  Object.defineProperty(target, 'localStorage', {
    value: memoryStorage,
    configurable: true,
    writable: true,
  });
}
