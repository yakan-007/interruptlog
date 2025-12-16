import { get, set, del, clear, keys } from 'idb-keyval';

export const dbGet = async <T>(key: IDBValidKey): Promise<T | undefined> => {
  return get<T>(key);
};

export const dbSet = async (key: IDBValidKey, value: any): Promise<void> => {
  return set(key, value);
};

export const dbDel = async (key: IDBValidKey): Promise<void> => {
  return del(key);
};

export const dbClear = async (): Promise<void> => {
  return clear();
};

export const dbKeys = async <KeyType extends IDBValidKey>(): Promise<
  KeyType[]
> => {
  return keys<KeyType>();
}; 