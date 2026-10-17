import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Button,
  StyleSheet,
  View,
} from 'react-native';
import {
  PortalView,
  subscribe,
  type Portal,
} from '@ionic/portals-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { buildChangeCount, syncLiveUpdate } from './liveUpdateSync';

type MwaScreenProps = {
  portal: Portal;
  onClose: () => void;
};

type PortalLayerProps = {
  portal: Portal;
  onLayout: () => void;
};

const PortalLayer = memo(function PortalLayerContent({
  portal,
  onLayout,
}: PortalLayerProps) {
  return (
    // PortalView writes to its portal prop, which development builds freeze, so pass a copy.
    <PortalView
      portal={{ ...portal }}
      style={styles.portal}
      onLayout={onLayout}
    />
  );
});

export const MwaScreen = memo(function MwaScreen({
  portal,
  onClose,
}: MwaScreenProps) {
  const [portalKey, setPortalKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const hasStartedSync = useRef(false);
  const isMounted = useRef(true);
  const buildChangesAtOpen = useRef(buildChangeCount(portal.liveUpdate?.appId));

  useEffect(() => {
    isMounted.current = true;
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
      isMounted.current = false;
      subscription.remove();
      backHandler.remove();
    };
  }, [onClose]);

  // The SDK reads the build only when it creates the native view, so sync after its first layout and create it again
  // when the build changed after this screen opened, also by the sync of an earlier screen.
  const syncAfterFirstLayout = useCallback(() => {
    if (hasStartedSync.current) {
      return;
    }
    hasStartedSync.current = true;
    const appId = portal.liveUpdate?.appId;
    if (!appId) {
      setIsLoading(false);
      return;
    }
    syncLiveUpdate(appId).then(() => {
      if (!isMounted.current) {
        return;
      }
      if (buildChangeCount(appId) !== buildChangesAtOpen.current) {
        setPortalKey(key => key + 1);
      }
      setIsLoading(false);
    });
  }, [portal]);

  return (
    <SafeAreaView style={styles.screen}>
      <View
        style={styles.portal}
        accessibilityElementsHidden={isLoading}
        importantForAccessibility={isLoading ? 'no-hide-descendants' : 'auto'}
      >
        <PortalLayer
          key={portalKey}
          portal={portal}
          onLayout={syncAfterFirstLayout}
        />
      </View>
      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator />
          <Button title="Close" onPress={onClose} />
        </View>
      ) : null}
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  portal: {
    flex: 1,
  },
  loading: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    backgroundColor: '#ffffff',
  },
});
