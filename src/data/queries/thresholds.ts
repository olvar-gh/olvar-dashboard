import { useQuery } from '@tanstack/react-query';

import { useDataSource } from '../context';
import { keys } from '../keys';
import { mergeThresholds } from '../thresholds';
import { usePlant } from './plant';

export { mergeThresholds, targetBand } from '../thresholds';

/** Effective threshold numbers for target bands and care targets (never used to judge a value). */
export function useThresholds() {
  const source = useDataSource();
  const plant = usePlant().data;
  return useQuery({
    queryKey: keys.thresholds(
      plant?.id ?? '',
      JSON.stringify([plant?.profile_id, plant?.profile.thresholds, plant?.threshold_overrides]),
    ),
    enabled: !!plant,
    queryFn: async () =>
      (await source.getEffectiveThresholds(plant!.id)) ??
      mergeThresholds(plant!.profile.thresholds, plant!.threshold_overrides),
  });
}
