import { BusinessHoursSettings, BusinessHoursState } from '@/types/businessHours';

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
export const parseTimeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Invalid time format: ${time}`);
  }
  return hours * 60 + minutes;
};

/**
 * Check if current time is within business hours
 */
export const isWithinBusinessHours = (settings: BusinessHoursSettings): boolean => {
  if (!settings.enabled) return false;
  
  try {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    const workStartMinutes = parseTimeToMinutes(settings.workStart);
    const workEndMinutes = parseTimeToMinutes(settings.workEnd);
    
    return currentMinutes >= workStartMinutes && currentMinutes < workEndMinutes;
  } catch (error) {
    console.error('[businessHours] Error checking business hours:', error);
    return false;
  }
};

/**
 * Check if business hours just started (transition from outside to inside)
 */
export const didBusinessHoursStart = (
  settings: BusinessHoursSettings,
  previousState: boolean
): boolean => {
  const currentState = isWithinBusinessHours(settings);
  return currentState && !previousState;
};

/**
 * Check if business hours just ended (transition from inside to outside)
 */
export const didBusinessHoursEnd = (
  settings: BusinessHoursSettings,
  previousState: boolean
): boolean => {
  const currentState = isWithinBusinessHours(settings);
  return !currentState && previousState;
};

/**
 * Check if the business hours task should auto-restart
 */
export const shouldAutoRestartBusinessTask = (
  settings: BusinessHoursSettings | null
): boolean => {
  return settings?.enabled === true && isWithinBusinessHours(settings);
};

/**
 * Get the next business hours transition time
 */
export const getNextBusinessHoursTransition = (
  settings: BusinessHoursSettings
): { type: 'start' | 'end'; time: Date } | null => {
  if (!settings.enabled) return null;
  
  try {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    
    const workStartMinutes = parseTimeToMinutes(settings.workStart);
    const workEndMinutes = parseTimeToMinutes(settings.workEnd);
    
    const workStartTime = new Date(today.getTime() + workStartMinutes * 60000);
    const workEndTime = new Date(today.getTime() + workEndMinutes * 60000);
    
    const isCurrentlyWithin = isWithinBusinessHours(settings);
    
    if (isCurrentlyWithin) {
      // Currently within business hours, next transition is end
      return { type: 'end', time: workEndTime };
    } else {
      // Currently outside business hours
      if (now < workStartTime) {
        // Before work start today
        return { type: 'start', time: workStartTime };
      } else {
        // After work end today, next start is tomorrow
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStart = new Date(tomorrow.getTime() + workStartMinutes * 60000);
        return { type: 'start', time: tomorrowStart };
      }
    }
  } catch (error) {
    console.error('[businessHours] Error calculating next transition:', error);
    return null;
  }
};

/**
 * Format business hours for display
 */
export const formatBusinessHours = (settings: BusinessHoursSettings): string => {
  return `${settings.workStart} - ${settings.workEnd}`;
};

/**
 * Calculate total business hours per day in minutes
 */
export const getTotalBusinessHoursPerDay = (settings: BusinessHoursSettings): number => {
  try {
    const startMinutes = parseTimeToMinutes(settings.workStart);
    const endMinutes = parseTimeToMinutes(settings.workEnd);
    return Math.max(0, endMinutes - startMinutes);
  } catch (error) {
    console.error('[businessHours] Error calculating total hours:', error);
    return 0;
  }
};