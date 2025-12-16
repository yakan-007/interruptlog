import { StoreGet, StoreSet, EventsActions } from '../types';
import { PersistenceHelpers } from '../persistence';

export interface SliceContext {
  set: StoreSet;
  get: StoreGet;
  persist: PersistenceHelpers;
  getActions: () => EventsActions;
}
