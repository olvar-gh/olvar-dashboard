import type { ChatMessageRow, PlantStatus, Reading } from '@/data';

import { chipValue, contextRows, formatCountdown, optimisticVisible, questionFor, rateLimitText, sendErrorText, suggestions } from '../model';
import { ChatError } from '@/data';

const TZ = 'Asia/Seoul';

function reading(patch: Partial<Reading> = {}): Reading {
  return {
    recorded_at: '2026-11-17T05:29:00Z',
    temperature_c: 23.4,
    humidity_pct: 58,
    lux: 1240,
    soil_raw: 2100,
    soil_pct: 64,
    ...patch,
  } as Reading;
}

const status = { soil_calibrated: true, soil_label: 'Just right', light_label: 'Just right', temperature_label: 'Just right', humidity_label: 'Just right' } as PlantStatus;

function row(id: number, role: 'user' | 'plant', content: string, replyTo: number | null = null): ChatMessageRow {
  return { id, role, content, reply_to: replyTo, plant_id: 'p', created_at: '2026-11-17T05:00:00Z', error: null, based_on_reading_at: null, model: null, tokens_in: null, tokens_out: null };
}

describe('chat model', () => {
  it('quotes the current temperature in a suggestion', () => {
    expect(suggestions(23.6)).toContain('Is 24 °C too warm for me?');
    expect(suggestions(null)).toContain('Is it too warm for me?');
  });

  it('formats the rate-limit countdown', () => {
    expect(formatCountdown(155)).toBe('2:35');
    expect(formatCountdown(0.2)).toBe('0:01');
    expect(rateLimitText(9)).toBe('Sparks needs a breather. You can ask again in 0:09.');
  });

  it('describes send failures by kind', () => {
    expect(sendErrorText(new ChatError('failed', 'x'))).toMatch(/Couldn’t reach Sparks/);
    expect(sendErrorText(new ChatError('invalid_message', 'x'))).toBe('Messages can be 1 to 1,000 characters.');
  });

  it('shows the latest reading with the server labels', () => {
    const rows = contextRows(reading(), status, TZ);
    expect(rows.map((r) => [r.name, r.value, r.note])).toEqual([
      ['Soil moisture', '64%', 'Just right'],
      ['Light', '1,240 lux', 'Just right'],
      ['Temperature', '23.4 °C', 'Just right'],
      ['Humidity', '58%', 'Just right'],
    ]);
    expect(rows.map((r) => chipValue(r, reading()))).toEqual(['64%', '1,240 lx', '23.4°', '58%']);
  });

  it('marks a null value as a failed read with its time', () => {
    const rows = contextRows(reading({ lux: null }), status, TZ);
    expect(rows[1]).toMatchObject({ value: '—', note: 'Read failed at 14:29', failed: true });
    expect(chipValue(rows[1], reading({ lux: null }))).toBe('—');
  });

  it('keeps uncalibrated soil apart from a failed soil read', () => {
    const uncalibrated = { ...status, soil_calibrated: false } as PlantStatus;
    expect(contextRows(reading({ soil_pct: null }), uncalibrated, TZ)[0]).toMatchObject({ note: 'Not calibrated', failed: false });
    expect(contextRows(reading({ soil_pct: null, soil_raw: null }), uncalibrated, TZ)[0]).toMatchObject({ note: 'Read failed at 14:29', failed: true });
  });

  it('drops the optimistic bubble once the stored user row arrives', () => {
    const before = [row(1, 'user', 'Hi'), row(2, 'plant', 'Hello', 1)];
    expect(optimisticVisible(before, 'Hi', 2)).toBe(true);
    expect(optimisticVisible([...before, row(3, 'user', 'Hi')], 'Hi', 2)).toBe(false);
  });

  it('finds the question a fallback reply answers', () => {
    const all = [row(1, 'user', 'Need water?'), row(2, 'plant', 'Sorry', 1)];
    expect(questionFor(all, all[1])).toBe('Need water?');
  });
});
