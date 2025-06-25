// Business Hours Mode Types

export interface BusinessHoursSettings {
  enabled: boolean;
  workStart: string; // HH:MM format
  workEnd: string;   // HH:MM format
  defaultTaskName: string; // Default: "その他の業務"
  autoStopOutsideHours: boolean; // Stop "Other Work" outside business hours
  // Phase 2 以降で拡張予定
  // breaks: ScheduledBreak[];
  // weekSchedule: WeekSchedule;
  // holidays: string[];
}

export interface BusinessHoursState {
  isWithinBusinessHours: boolean;
  isBusinessTaskRunning: boolean;
  lastCheckTime: number;
}

// Phase 2 で追加予定
// export interface ScheduledBreak {
//   id: string;
//   name: string;
//   startTime: string; // HH:MM
//   endTime: string;   // HH:MM
//   autoStart: boolean;
//   autoEnd: boolean;
// }