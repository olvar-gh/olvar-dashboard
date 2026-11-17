import type {
  ChatCursor,
  ChatMessageRow,
  DailyRow,
  Device,
  Gateway,
  HourlyRow,
  OfflinePeriodRow,
  PlantPatch,
  PlantStatus,
  PlantWithProfile,
  Reading,
  ReadingColumn,
  Session,
  Thresholds,
} from '../types';

export type LiveHandlers = {
  /** A `readings` INSERT for the device. Only a signal: the row is re-read through `readings_v`. */
  onReading: () => void;
  onDevice: (row: Device) => void;
  onChatMessage: (row: ChatMessageRow) => void;
  /** The channel (re)subscribed after a drop; everything may be stale. */
  onReconnect: () => void;
};

export type LiveTarget = { deviceId: string; plantId: string };

export interface AuthApi {
  getSession(): Promise<Session | null>;
  onChange(listener: (session: Session | null) => void): () => void;
  signIn(email: string, password: string): Promise<Session>;
  signOut(): Promise<void>;
  updateName(name: string): Promise<Session>;
  /** Re-authenticates with the current password before setting the new one. */
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
}

export interface DataSource {
  readonly kind: 'supabase' | 'fixtures';
  readonly auth: AuthApi;

  /** The owner's single plant with its profile, or null when setup has not run. */
  getPlant(): Promise<PlantWithProfile | null>;
  updatePlant(plantId: string, patch: PlantPatch): Promise<PlantWithProfile>;
  /** Server `effective_thresholds()`, or null when it is not available to this role. */
  getEffectiveThresholds(plantId: string): Promise<Thresholds | null>;

  getStatus(plantId: string): Promise<PlantStatus | null>;
  getDevice(plantId: string): Promise<Device | null>;
  updateCalibration(deviceId: string, dryRaw: number, wetRaw: number): Promise<Device>;
  /** The most recently seen gateway. */
  getGateway(): Promise<Gateway | null>;

  /** Newest first, at most `limit` rows. */
  getLatestReadings(deviceId: string, limit: number): Promise<Reading[]>;
  /** Every reading in `[from, to]`, oldest first, paginated past the row limit. */
  getReadings(deviceId: string, from: Date, to: Date): Promise<Reading[]>;
  /** Hourly rollups with `bucket` in `[from, to)`, oldest first. */
  getHourly(deviceId: string, from: Date, to: Date): Promise<HourlyRow[]>;
  /** Daily rollups for local dates `fromDate..toDate` inclusive, oldest first. */
  getDaily(deviceId: string, fromDate: string, toDate: string): Promise<DailyRow[]>;
  /** `device_offline_periods()`; the window must be at most 7 days. */
  getOfflinePeriods(deviceId: string, from: Date, to: Date): Promise<OfflinePeriodRow[]>;
  /** First reading in `[from, to)` whose `column` equals `value`. */
  findReadingWithValue(deviceId: string, from: Date, to: Date, column: ReadingColumn, value: number): Promise<Reading | null>;
  /** Reading in `[from, to)` with the highest (`desc`) or lowest (`asc`) non-null `column`, earliest on ties. */
  findExtremeReading(deviceId: string, from: Date, to: Date, column: ReadingColumn, direction: 'asc' | 'desc'): Promise<Reading | null>;

  /** Up to `limit` messages older than `before` (or the newest), newest first. */
  getChatPage(plantId: string, limit: number, before?: ChatCursor): Promise<ChatMessageRow[]>;
  /** The first user message in `[from, to)`. */
  getFirstUserMessage(plantId: string, from: Date, to: Date): Promise<ChatMessageRow | null>;
  /** Calls the `chat` Edge Function and returns the stored reply row. Throws `ChatError`. */
  sendChat(plantId: string, message: string): Promise<ChatMessageRow>;

  subscribe(target: LiveTarget, handlers: LiveHandlers): () => void;
}

export type ChatErrorKind = 'rate_limited' | 'invalid_message' | 'unauthorized' | 'not_found' | 'failed';

export class ChatError extends Error {
  constructor(
    readonly kind: ChatErrorKind,
    message: string,
    /** Seconds until another message is admitted (429 only). */
    readonly retryAfterS?: number,
  ) {
    super(message);
    this.name = 'ChatError';
  }
}

/** A server error surfaced to the UI, keeping the Postgres/PostgREST code (e.g. 22023, 23514). */
export class DataError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'DataError';
  }
}
