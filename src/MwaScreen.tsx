import { useEffect, useMemo } from 'react';
import { BackHandler, Platform, StyleSheet } from 'react-native';
import {
  PortalView,
  subscribe,
  type Portal,
} from '@ionic/portals-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type MwaScreenProps = {
  portal: Portal;
  onClose: () => void;
};

export function MwaScreen({ portal, onClose }: MwaScreenProps) {
  // PortalView writes to its portal prop, which development builds freeze, so it gets a copy.
  const portalCopy = useMemo(() => ({ ...portal }), [portal]);

  useEffect(() => {
    // An MWA asks its host to close it with a `dismiss` message on the `subscription` topic.
    const subscription = subscribe('subscription', message => {
      if (message.data?.type === 'dismiss') {
        onClose();
      }
    });
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        onClose();
        return true;
      },
    );

    return () => {
      subscription.remove();
      backHandler.remove();
    };
  }, [onClose]);

  return (
    // On iOS the Portal runs edge to edge: with the package's Status Bar plugin the MWA pads the safe area itself.
    <SafeAreaView
      style={styles.screen}
      edges={Platform.OS === 'ios' ? [] : undefined}
    >
      <PortalView portal={portalCopy} style={styles.portal} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  portal: {
    flex: 1,
  },
});
