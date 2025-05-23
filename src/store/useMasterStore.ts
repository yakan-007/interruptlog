import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export interface MasterPerson {
  id: string;
  name: string;
}

export interface MasterOrganization {
  id: string;
  name: string;
}

interface MasterState {
  persons: MasterPerson[];
  organizations: MasterOrganization[];
  actions: {
    addPerson: (name: string) => void;
    editPerson: (id: string, name: string) => void;
    removePerson: (id: string) => void;
    addOrganization: (name: string) => void;
    editOrganization: (id: string, name: string) => void;
    removeOrganization: (id: string) => void;
  };
}

const useMasterStore = create<MasterState>((set, get) => ({
  persons: [],
  organizations: [],
  actions: {
    addPerson: (name) => set((state) => ({ persons: [...state.persons, { id: uuidv4(), name }] })),
    editPerson: (id, name) => set((state) => ({ persons: state.persons.map(p => p.id === id ? { ...p, name } : p) })),
    removePerson: (id) => set((state) => ({ persons: state.persons.filter(p => p.id !== id) })),
    addOrganization: (name) => set((state) => ({ organizations: [...state.organizations, { id: uuidv4(), name }] })),
    editOrganization: (id, name) => set((state) => ({ organizations: state.organizations.map(o => o.id === id ? { ...o, name } : o) })),
    removeOrganization: (id) => set((state) => ({ organizations: state.organizations.filter(o => o.id !== id) })),
  },
}));

export default useMasterStore; 