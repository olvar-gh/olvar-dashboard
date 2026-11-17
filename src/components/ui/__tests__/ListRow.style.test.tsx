import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { ListRow } from '../ListRow';

it('applies the style prop to the iPhone list row', async () => {
  await render(<ListRow title="olvar-gateway" style={{ marginTop: 12, opacity: 0.5 }} testID="row" />);
  const row = screen.getByTestId('row');
  let node: typeof row | null = row;
  while (node && !StyleSheet.flatten(node.props.style)?.marginTop) node = node.parent as typeof row | null;
  expect(StyleSheet.flatten(node?.props.style)).toMatchObject({ marginTop: 12, opacity: 0.5 });
});
