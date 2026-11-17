import { Link, type Href } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

export type NavLinkProps = {
  href: Href;
  label: string;
  selected?: boolean;
  style: StyleProp<ViewStyle>;
  /** Layout of the link in its parent (flex share, width): the <a> itself cannot be styled. */
  containerStyle?: StyleProp<ViewStyle>;
  hoverStyle?: StyleProp<ViewStyle>;
  testID?: string;
  children: ReactNode;
};

/**
 * A web link (an <a>, so it opens in a new tab and shows the URL) styled as a nav item. Link with
 * asChild drops the child's style on web, so the item is styled on an inner view.
 */
export function NavLink({
  href,
  label,
  selected = false,
  style,
  containerStyle,
  hoverStyle,
  testID,
  children,
}: NavLinkProps) {
  const [hovered, setHovered] = useState(false);
  const link = (
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
  return containerStyle ? <View style={containerStyle}>{link}</View> : link;
}
