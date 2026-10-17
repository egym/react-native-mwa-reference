import { syncOne, type SyncResult } from '@ionic/portals-react-native';

const SYNC_TIMEOUT_MS = 30_000;
const REGISTRATION_WAIT_MS = 3_000;
const RETRY_DELAY_MS = 200;

// A screen that opens while the sync of an earlier screen still runs for the same MWA waits for that sync.
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

/** Syncs the live update for at most 30 seconds; true when a new build became the active one. */
const syncWithTimeout = (appId: string) =>
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

/** How often the active build of the MWA changed while the app runs. */
export const buildChangeCount = (appId: string | undefined) =>
  appId ? buildChanges.get(appId) ?? 0 : 0;

/** Syncs the live update of the MWA, or waits for the sync that already runs for it. Never rejects. */
export const syncLiveUpdate = (appId: string) => {
  const runningSync = runningSyncs.get(appId);
  if (runningSync) {
    return runningSync;
  }
  const sync = syncWithTimeout(appId).then(hasNewBuild => {
    runningSyncs.delete(appId);
    if (hasNewBuild) {
      buildChanges.set(appId, buildChangeCount(appId) + 1);
    }
  });
  runningSyncs.set(appId, sync);
  return sync;
};
