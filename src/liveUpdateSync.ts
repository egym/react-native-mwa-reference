import { syncOne, type SyncResult } from '@ionic/portals-react-native';

const SYNC_TIMEOUT_MS = 30_000;
const REGISTRATION_WAIT_MS = 3_000;
const RETRY_DELAY_MS = 200;

// One native sync per MWA at a time, tracked until it ends, also after the screens that waited for it gave up.
const runningSyncs = new Map<string, Promise<void>>();
const buildChanges = new Map<string, number>();

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

/** How often the active build of the MWA changed while the app runs. */
export const buildChangeCount = (appId: string | undefined) =>
  appId ? buildChanges.get(appId) ?? 0 : 0;

/** Starts the native sync of the MWA, or returns the one that runs. It settles when the native sync ends. */
const nativeSync = (appId: string) => {
  const runningSync = runningSyncs.get(appId);
  if (runningSync) {
    return runningSync;
  }
  const sync = syncOneWhenRegistered(appId)
    .then(
      result => {
        if (result.activeApplicationPathChanged) {
          buildChanges.set(appId, buildChangeCount(appId) + 1);
        }
      },
      () => undefined,
    )
    .finally(() => runningSyncs.delete(appId));
  runningSyncs.set(appId, sync);
  return sync;
};

/** Waits at most 30 seconds for the sync of the MWA, starting it when none runs. Never rejects. */
export const syncLiveUpdate = (appId: string) =>
  new Promise<void>(resolve => {
    const timer = setTimeout(resolve, SYNC_TIMEOUT_MS);
    nativeSync(appId).then(() => {
      clearTimeout(timer);
      resolve();
    });
  });
