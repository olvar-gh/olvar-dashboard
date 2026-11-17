import { getEnv } from '@/env';
import type { FixtureScenario } from '../fixtures/generate';
import { getSupabase } from '../supabase';
import { createFixtureSource } from './fixtures';
import { createSupabaseSource } from './supabase';
import type { DataSource } from './index';

const SCENARIOS: FixtureScenario[] = ['normal', 'offline', 'uncalibrated', 'null-reads'];

/** `?fixture=<scenario>` on web lets visual tests pick a fixture state without a rebuild. */
function scenarioFromUrl(): FixtureScenario | undefined {
  const search = (globalThis as { location?: { search?: string } }).location?.search;
  const value = search ? new URLSearchParams(search).get('fixture') : null;
  return SCENARIOS.find((s) => s === value);
}

export function createDataSource(): DataSource {
  if (getEnv().dataSource === 'fixtures') {
    return createFixtureSource({ live: true, scenario: scenarioFromUrl() });
  }
  return createSupabaseSource(getSupabase());
}
