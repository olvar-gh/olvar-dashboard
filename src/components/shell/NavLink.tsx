import { Link, type Href } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

export type NavLinkProps = {
  href: Href;
  label: string;
  selected?: boolean;
  style: StyleProp<ViewStyle>;
  hoverStyle?: StyleProp<ViewStyle>;
  testID?: string;
  children: ReactNode;
};

/**
 * A web link (an <a>, so it opens in a new tab and shows the URL) styled as a nav item. Link with
 * asChild drops the child's style on web, so the item is styled on an inner view.
 */
export function NavLink({ href, label, selected = false, style, hoverStyle, testID, children }: NavLinkProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={label}
        aria-current={selected ? 'page' : undefined}
        testID={testID}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
      >
        <View style={[style, hovered && !selected && hoverStyle]}>{children}</View>
      </Pressable>
    </Link>
  );
}
