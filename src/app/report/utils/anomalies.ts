import type { Event } from '@/types';
import { buildAnomalies, type AnomalyItem } from '@/utils/anomalies';

export const buildReportAnomalies = (events: Event[], now: number = Date.now()): AnomalyItem[] =>
  buildAnomalies(events, { limit: 5, now });
