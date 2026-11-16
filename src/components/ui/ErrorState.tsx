import { type StyleProp, type ViewStyle } from 'react-native';

import { Button } from './Button';
import { Card } from './Card';
import { Notice } from './Notice';

export type ErrorStateProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retrying?: boolean;
  minHeight?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** Card with a warn Notice and Retry (PLAN §5.5). */
export function ErrorState({
  title,
  message = 'Couldn’t load this. Check your connection and try again.',
  onRetry,
  retrying = false,
  minHeight,
  style,
  testID,
}: ErrorStateProps) {
  return (
    <Card title={title} minHeight={minHeight} style={style} testID={testID}>
      <Notice
        tone="warn"
        action={onRetry ? <Button variant="secondary" label="Retry" onPress={onRetry} loading={retrying} /> : undefined}
      >
        {message}
      </Notice>
    </Card>
  );
}
