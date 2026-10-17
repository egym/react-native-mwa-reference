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
  syncOne,
  type Portal,
  type SyncResult,
} from '@ionic/portals-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type MwaScreenProps = {
  portal: Portal;
  onClose: () => void;
};

const SYNC_TIMEOUT_MS = 30_000;
const REGISTRATION_WAIT_MS = 3_000;
const RETRY_DELAY_MS = 200;

const wait = (ms: number) =>
  new Promise<void>(resolve => {
    setTimeout(() => resolve(), ms);
  });

// The native view registers the live update a moment after its first layout, so a failed sync is retried briefly.
const syncOneWhenRegistered = async (appId: string): Promise<SyncResult> => {
  const giveUpAt = Date.now() + REGISTRATION_WAIT_MS;
  for (;;) {
    try {
      return await syncOne(appId);
    } catch (error) {
      if (Date.now() >= giveUpAt) {
        throw error;
      }
      await wait(RETRY_DELAY_MS);
    }
  }
};

/** Syncs the live update for at most 30 seconds; true when a new build became the active one. */
const syncLiveUpdate = (appId: string) =>
  new Promise<boolean>(resolve => {
    const timer = setTimeout(() => resolve(false), SYNC_TIMEOUT_MS);
    syncOneWhenRegistered(appId).then(
      result => {
        clearTimeout(timer);
        resolve(result.activeApplicationPathChanged);
      },
      () => {
        clearTimeout(timer);
        resolve(false);
      },
    );
  });

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

  // The SDK reads the build only when it creates the native view, so sync after its first layout and create it again.
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
    syncLiveUpdate(appId).then(hasNewBuild => {
      if (!isMounted.current) {
        return;
      }
      if (hasNewBuild) {
        setPortalKey(key => key + 1);
      }
      setIsLoading(false);
    });
  }, [portal]);

  return (
    <SafeAreaView style={styles.screen}>
      <PortalLayer
        key={portalKey}
        portal={portal}
        onLayout={syncAfterFirstLayout}
      />
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
