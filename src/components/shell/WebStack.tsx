import { Navigator } from 'expo-router';
import { Fragment } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

export type WebStackOptions = {
  /** `overlay` keeps the screen below it rendered, for modals such as calibration over Settings. */
  presentation?: 'page' | 'overlay';
};

/**
 * Stack for the desktop web shell. Expo Router's Stack lays every screen out with absoluteFill,
 * which pins pages to the viewport height; this one keeps the focused page in normal flow so the
 * document grows with its content and the browser scrolls it.
 */
export function WebStack({ overlays = [] }: { overlays?: string[] }) {
  return (
    <Navigator>
      {overlays.map((name) => (
        <Navigator.Screen key={name} name={name} options={{ presentation: 'overlay' } satisfies WebStackOptions} />
      ))}
      <WebStackContent />
    </Navigator>
  );
}

function WebStackContent() {
  const { state, descriptors } = Navigator.useContext();
  const presentation = (key: string) => (descriptors[key]?.options as WebStackOptions | undefined)?.presentation;

  let base = state.index;
  while (base > 0 && presentation(state.routes[base].key) === 'overlay') base--;
  const visible = state.routes.slice(base, state.index + 1);

  return (
    <>
      {visible.map((route, i) => (
        <Fragment key={route.key}>
          {i === 0 && presentation(route.key) !== 'overlay' ? (
            descriptors[route.key].render()
          ) : (
            <View style={styles.overlay}>{descriptors[route.key].render()}</View>
          )}
        </Fragment>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  // A fixed layer over the page, not part of the document height.
  overlay: { position: 'fixed' as ViewStyle['position'], top: 0, right: 0, bottom: 0, left: 0, zIndex: 10 },
});
