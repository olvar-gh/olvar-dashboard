import type { OfflinePeriodRow } from '@/domain/timeline-events';
import type { Database, Json } from './database.types';

type PublicTables = Database['public']['Tables'];
type PublicViews = Database['public']['Views'];

export type { Json, OfflinePeriodRow };

export type Plant = PublicTables['plants']['Row'];
export type PlantProfile = PublicTables['plant_profiles']['Row'];
export type Device = PublicTables['devices']['Row'];
export type Gateway = PublicTables['gateways']['Row'];
export type Reading = PublicViews['readings_v']['Row'];
export type HourlyRow = PublicViews['readings_hourly_v']['Row'];
export type DailyRow = PublicViews['readings_daily_v']['Row'];
export type PlantStatus = PublicViews['plant_status_v']['Row'];
export type ChatMessageRow = PublicTables['chat_messages']['Row'];

export type PlantWithProfile = Plant & {
  profile: Pick<PlantProfile, 'id' | 'common_name' | 'scientific_name' | 'thresholds'>;
};

export type PlantPatch = Partial<Pick<Plant, 'nickname' | 'location' | 'timezone' | 'threshold_overrides'>>;

/** Raw columns that can be searched for a daily extremum. */
export type ReadingColumn = 'temperature_c' | 'humidity_pct' | 'lux' | 'soil_raw';

export type ThresholdKey = 'critical_low' | 'low' | 'ok_low' | 'ok_high' | 'high' | 'critical_high';
export type ThresholdMetric = 'temperature_c' | 'humidity_pct' | 'lux' | 'soil_pct';
export type Thresholds = Partial<Record<ThresholdMetric, Partial<Record<ThresholdKey, number>>>>;

export type Session = {
  userId: string;
  email: string;
  /** Display name from Auth user metadata. */
  name: string | null;
};

/** Cursor for keyset paging of the conversation, oldest message already loaded. */
export type ChatCursor = { created_at: string; id: number };
