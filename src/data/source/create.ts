import { getEnv } from '@/env';
import type { FixtureScenario } from '../fixtures/generate';
import { getSupabase } from '../supabase';
import { createFixtureSource } from './fixtures';
import { createSupabaseSource } from './supabase';
import type { DataSource } from './index';

const SCENARIOS: FixtureScenario[] = ['normal', 'offline', 'uncalibrated', 'null-reads'];

function urlParam(name: string): string | null {
  const search = (globalThis as { location?: { search?: string } }).location?.search;
  return search ? new URLSearchParams(search).get(name) : null;
}

/** `?fixture=<scenario>` on web lets visual tests pick a fixture state without a rebuild. */
function scenarioFromUrl(): FixtureScenario | undefined {
  const value = urlParam('fixture');
  return SCENARIOS.find((s) => s === value);
}

export function createDataSource(): DataSource {
  if (getEnv().dataSource === 'fixtures') {
    // `?session=signed-out` starts the fixtures at the sign-in screen (sign in with the fixture owner).
    return createFixtureSource({ live: true, scenario: scenarioFromUrl(), signedIn: urlParam('session') !== 'signed-out' });
  }
  return createSupabaseSource(getSupabase());
}
