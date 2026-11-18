import { Button, Notice } from '@/components/ui';

/** Inline note over cached Sensors content when a background refresh fails. */
export function RefreshError({
  onRetry,
  message = 'Couldn’t refresh. Showing the last readings we have.',
  testID = 'sensors-refresh-error',
}: {
  onRetry: () => void;
  message?: string;
  testID?: string;
}) {
  return (
    <Notice
      tone="warn"
      testID={testID}
      action={<Button variant="secondary" size="small" label="Retry" onPress={onRetry} />}
    >
      {message}
    </Notice>
  );
}
