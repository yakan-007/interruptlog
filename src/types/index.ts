export type Event = {
  id: string; // uuid
  type: 'task' | 'interrupt' | 'break';
  label?: string; // optional free text
  start: number; // epoch ms
  end?: number; // epoch ms (undefined while running)
  meta?: Record<string, any>; // reserved
};

export type MyTask = {
  id: string; // uuid
  name: string;
  isCompleted: boolean;
  order: number; // for sorting
}; 