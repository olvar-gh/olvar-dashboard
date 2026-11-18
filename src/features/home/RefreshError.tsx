import { Button, Notice } from '@/components/ui';

/** Inline note over the cached Home when a background refresh fails. */
export function RefreshError({ onRetry, retrying }: { onRetry: () => void; retrying: boolean }) {
  return (
    <Notice
      tone="warn"
      testID="home-refresh-error"
      action={<Button variant="secondary" size="small" label="Retry" onPress={onRetry} loading={retrying} />}
    >
      Couldn’t refresh. Showing the last readings we have.
    </Notice>
  );
}
