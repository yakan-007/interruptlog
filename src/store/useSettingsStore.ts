import { create, StateCreator } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { dbGet, dbSet } from '@/lib/db'; // dbヘルパーをインポート

export const INTERRUPT_TYPES_STORE_KEY = 'interrupt-types-config'; // キー名を変更

export interface InterruptTypeItem {
  id: string;
  label: string;
  isDefault?: boolean;
}

export interface SettingsState {
  interruptTypes: InterruptTypeItem[];
  isHydrated: boolean;
  actions: {
    addInterruptType: (label: string) => void;
    removeInterruptType: (id: string) => void;
    updateInterruptType: (id: string, newLabel: string) => void;
    initializeOrMergeTypes: (storedTypes?: InterruptTypeItem[]) => void;
  };
}

const initialDefaultInterruptTypes: InterruptTypeItem[] = [
  { id: 'default-meeting', label: 'Meeting', isDefault: true },
  { id: 'default-call', label: 'Call', isDefault: true },
  { id: 'default-qna', label: 'Q&A', isDefault: true },
  { id: 'default-visit', label: 'Visit', isDefault: true },
  { id: 'default-chat', label: 'Chat', isDefault: true },
  { id: 'default-other', label: 'Other', isDefault: true },
];

const storeCreator: StateCreator<SettingsState, [], []> = (set, get) => ({
  interruptTypes: initialDefaultInterruptTypes,
  isHydrated: false, // isHydratedはpersistミドルウェアによって管理されることも
  actions: {
    initializeOrMergeTypes: (storedTypes?: InterruptTypeItem[]) => {
      const defaults = initialDefaultInterruptTypes;
      if (storedTypes && storedTypes.length > 0) {
        const customStoredTypes = storedTypes.filter(st => !st.isDefault);
        const defaultStoredTypesMap = new Map(storedTypes.filter(st => st.isDefault).map(dt => [dt.id, dt]));

        const mergedDefaults = defaults.map(def => defaultStoredTypesMap.get(def.id) || def);
        
        const finalTypes = [...mergedDefaults, ...customStoredTypes];
        // 重複排除 (念のため、idベースで)
        const uniqueTypes = Array.from(new Map(finalTypes.map(item => [item.id, item])).values());
        set({ interruptTypes: uniqueTypes, isHydrated: true });
      } else {
        set({ interruptTypes: defaults, isHydrated: true });
      }
    },
    addInterruptType: (label: string) => {
      if (!label.trim()) return;
      const newType: InterruptTypeItem = { id: uuidv4(), label: label.trim(), isDefault: false };
      // ラベルの重複チェック (オプション)
      if (get().interruptTypes.some(type => type.label.toLowerCase() === newType.label.toLowerCase())) {
        console.warn('Attempted to add duplicate interrupt type label:', newType.label);
        return; // 重複する場合は追加しない
      }
      set((state) => ({ interruptTypes: [...state.interruptTypes, newType] }));
    },
    removeInterruptType: (id: string) => {
      set((state) => ({
        interruptTypes: state.interruptTypes.filter(type => type.id !== id && !type.isDefault),
      }));
    },
    updateInterruptType: (id: string, newLabel: string) => {
      if (!newLabel.trim()) return;
      // ラベルの重複チェック (オプション) - 自分自身は除く
      if (get().interruptTypes.some(type => type.id !== id && type.label.toLowerCase() === newLabel.toLowerCase())) {
        console.warn('Attempted to update to a duplicate interrupt type label:', newLabel);
        return; // 重複する場合は更新しない
      }
      set((state) => ({
        interruptTypes: state.interruptTypes.map(type =>
          type.id === id && !type.isDefault ? { ...type, label: newLabel.trim() } : type
        ),
      }));
    },
  },
});

const useSettingsStore = create<SettingsState>()(
  persist(
    storeCreator,
    {
      name: INTERRUPT_TYPES_STORE_KEY,
      storage: createJSONStorage(() => ({
        getItem: async (name) => {
          // console.log(`[${INTERRUPT_TYPES_STORE_KEY}] getItem`, name);
          const value = await dbGet<string>(name); // dbGetがパース済みのオブジェクトを返す場合はstringではない
          return value || null; // Zustandのpersistは文字列を期待
        },
        setItem: async (name, value) => {
          // console.log(`[${INTERRUPT_TYPES_STORE_KEY}] setItem`, name, value);
          await dbSet(name, value); // dbSetは文字列を受け取って保存
        },
        removeItem: async (name) => {
          // console.log(`[${INTERRUPT_TYPES_STORE_KEY}] removeItem`, name);
          await dbSet(name, undefined); // idb-keyvalではundefinedをセットすると削除される
        },
      })),
      // partialize で永続化する対象を絞る
      partialize: (state) => ({ interruptTypes: state.interruptTypes }),
      // ハイドレーション完了後の処理
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error(`An error happened during hydration of ${INTERRUPT_TYPES_STORE_KEY}`, error);
          state?.actions.initializeOrMergeTypes(); // エラー時もデフォルトで初期化
        } else if (state) {
          // console.log(`${INTERRUPT_TYPES_STORE_KEY} hydration finished`, state.interruptTypes);
          state.actions.initializeOrMergeTypes(state.interruptTypes);
        } else {
          // stateがundefinedの場合（初回起動時などDBに何もない）
          // storeCreatorの初期値が使われるので、ここでのinitializeOrMergeTypes呼び出しでも良い
          // ただし、persistミドルウェアが初期値をセットした後で呼ばれるので、
          // useSettingsStore.getState().actions.initializeOrMergeTypes(); のように外部で呼ぶ方が確実かも
        }
      },
      // version: 1, // スキーママイグレーション用 (将来的に)
    }
  )
);

export default useSettingsStore; 