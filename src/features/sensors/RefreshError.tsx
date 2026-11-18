import { Button, Notice } from '@/components/ui';

/** Inline note over the cached Sensors screen when a background refresh fails. */
export function RefreshError({ onRetry }: { onRetry: () => void }) {
  return (
    <Notice
      tone="warn"
      testID="sensors-refresh-error"
      action={<Button variant="secondary" size="small" label="Retry" onPress={onRetry} />}
    >
      Couldn’t refresh. Showing the last readings we have.
    </Notice>
  );
}
