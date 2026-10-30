/**
 * Ortak şeffaf modal kabuğu — Android elevation / zIndex katmanı garantisi.
 * Backdrop opacity parent’a verilmez; kart ayrı sibling’dir.
 */

import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type Placement = 'center' | 'bottom' | 'top';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  animationType?: 'none' | 'fade' | 'slide';
  placement?: Placement;
  /** Backdrop’a basınca kapat */
  backdropClosable?: boolean;
  /** iOS: kapanış animasyonu bitince */
  onDismiss?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
  rootStyle?: StyleProp<ViewStyle>;
};

export function TamusoModal({
  visible,
  onClose,
  children,
  animationType = 'fade',
  placement = 'center',
  backdropClosable = true,
  onDismiss,
  contentStyle,
  rootStyle,
}: Props) {
  const bottom = placement === 'bottom';
  const top = placement === 'top';

  return (
    <Modal
      visible={visible}
      transparent
      animationType={animationType}
      statusBarTranslucent
      hardwareAccelerated
      onRequestClose={onClose}
      onDismiss={onDismiss}
    >
      <View
        style={[
          styles.root,
          bottom && styles.rootBottom,
          top && styles.rootTop,
          rootStyle,
        ]}
        pointerEvents="box-none"
      >
        <Pressable
          style={styles.backdrop}
          onPress={backdropClosable ? onClose : undefined}
          accessibilityRole="button"
          accessibilityLabel="Kapat"
        />
        <View
          style={[
            styles.content,
            bottom && styles.contentBottom,
            top && styles.contentTop,
            contentStyle,
          ]}
          pointerEvents="box-none"
        >
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rootBottom: {
    justifyContent: 'flex-end',
    alignItems: 'stretch',
  },
  rootTop: {
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.55)',
    zIndex: 1,
    elevation: 1,
  },
  content: {
    zIndex: 2,
    elevation: 24,
    width: '100%',
    maxWidth: 420,
    paddingHorizontal: 20,
  },
  contentBottom: {
    maxWidth: '100%',
    paddingHorizontal: 0,
  },
  contentTop: {
    maxWidth: '100%',
    paddingHorizontal: 12,
  },
});
