import { get, set, del, clear, keys } from 'idb-keyval';

export const dbGet = async <T>(key: IDBValidKey): Promise<T | undefined> => {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return undefined;
  }
  return get<T>(key);
};

export const dbSet = async (key: IDBValidKey, value: any): Promise<void> => {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return;
  }
  return set(key, value);
};

export const dbDel = async (key: IDBValidKey): Promise<void> => {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return;
  }
  return del(key);
};

export const dbClear = async (): Promise<void> => {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return;
  }
  return clear();
};

export const dbKeys = async <KeyType extends IDBValidKey>(): Promise<
  KeyType[]
> => {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return [];
  }
  return keys<KeyType>();
}; 