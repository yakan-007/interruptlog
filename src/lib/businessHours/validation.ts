import { BusinessHoursSettings } from '@/types/businessHours';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult<T = any> {
  isValid: boolean;
  errors: ValidationError[];
  data?: T;
}

/**
 * Validate time format (HH:MM)
 */
export const isValidTimeFormat = (time: string): boolean => {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
};

/**
 * Validate that end time is after start time
 */
export const isValidTimeRange = (startTime: string, endTime: string): boolean => {
  if (!isValidTimeFormat(startTime) || !isValidTimeFormat(endTime)) {
    return false;
  }
  
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  return endMinutes > startMinutes;
};

/**
 * Validate business hours settings
 */
export const validateBusinessHoursSettings = (
  settings: Partial<BusinessHoursSettings>
): ValidationResult<BusinessHoursSettings> => {
  const errors: ValidationError[] = [];
  
  // Validate work start time
  if (!settings.workStart) {
    errors.push({
      field: 'workStart',
      message: '開始時刻は必須です'
    });
  } else if (!isValidTimeFormat(settings.workStart)) {
    errors.push({
      field: 'workStart',
      message: '開始時刻は HH:MM 形式で入力してください'
    });
  }
  
  // Validate work end time
  if (!settings.workEnd) {
    errors.push({
      field: 'workEnd',
      message: '終了時刻は必須です'
    });
  } else if (!isValidTimeFormat(settings.workEnd)) {
    errors.push({
      field: 'workEnd',
      message: '終了時刻は HH:MM 形式で入力してください'
    });
  }
  
  // Validate time range
  if (settings.workStart && settings.workEnd && 
      isValidTimeFormat(settings.workStart) && isValidTimeFormat(settings.workEnd)) {
    if (!isValidTimeRange(settings.workStart, settings.workEnd)) {
      errors.push({
        field: 'timeRange',
        message: '終了時刻は開始時刻より後に設定してください'
      });
    }
  }
  
  // Validate default task name
  if (!settings.defaultTaskName || settings.defaultTaskName.trim() === '') {
    errors.push({
      field: 'defaultTaskName',
      message: 'デフォルトタスク名は必須です'
    });
  } else if (settings.defaultTaskName.trim().length > 50) {
    errors.push({
      field: 'defaultTaskName',
      message: 'デフォルトタスク名は50文字以内で入力してください'
    });
  }
  
  const isValid = errors.length === 0;
  
  return {
    isValid,
    errors,
    data: isValid ? settings as BusinessHoursSettings : undefined
  };
};

/**
 * Validate individual time input
 */
export const validateTimeInput = (time: string): ValidationResult<string> => {
  const errors: ValidationError[] = [];
  
  if (!time) {
    errors.push({
      field: 'time',
      message: '時刻を入力してください'
    });
  } else if (!isValidTimeFormat(time)) {
    errors.push({
      field: 'time',
      message: '時刻は HH:MM 形式で入力してください'
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? time : undefined
  };
};

/**
 * Get user-friendly error message for business hours validation
 */
export const getBusinessHoursErrorMessage = (errors: ValidationError[]): string => {
  if (errors.length === 0) return '';
  
  // Return the first error message
  return errors[0].message;
};