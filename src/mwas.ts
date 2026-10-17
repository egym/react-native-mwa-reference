import { Platform } from 'react-native';
import type { CapacitorPlugin, Portal } from '@ionic/portals-react-native';

export type Mwa = {
  title: string;
  portal: Portal;
};

const preferencesPlugin: CapacitorPlugin = {
  androidClassPath: 'com.capacitorjs.plugins.preferences.PreferencesPlugin',
  iosClassName: 'PreferencesPlugin',
};

const sqlitePlugin: CapacitorPlugin = {
  androidClassPath:
    'com.getcapacitor.community.database.sqlite.CapacitorSQLitePlugin',
  iosClassName: 'CapacitorSQLitePlugin',
};

const nfcPassWalletPlugin: CapacitorPlugin = {
  androidClassPath:
    'com.egym.capacitor.nfcpasswallet.CapacitorNFCPassWalletPlugin',
  iosClassName: 'CapacitorNFCPassWalletPlugin',
};

// The same plugins as the native reference apps: SQLite only on Android.
const plugins = Platform.select({
  android: [preferencesPlugin, sqlitePlugin, nfcPassWalletPlugin],
  default: [preferencesPlugin, nfcPassWalletPlugin],
});

const sampleContext = {
  email: 'email@example.com',
  firstName: 'Oleksandr',
  lastName: 'Usyk',
  dateOfBirth: '1990-01-01',
  gymLocation: 'DE01',
  language: 'de-DE',
  measurementSystem: 'METRIC',
  gender: 'MALE',
  // memberId: '<JWT>', // unique member id signed in a JWT
  cardNumber: '000123123123', // 12 digit number with leading zeros
};

/** A logged-in member: Workouts and NFC open with this context on this channel. */
export type LoggedInMember = {
  initialContext: Record<string, unknown>;
  channel: string;
};

const createPortal = (
  app: string,
  appId: string,
  member?: LoggedInMember,
): Portal => ({
  name: `egym-${app}`,
  startDir: `egym-${app}`,
  plugins,
  initialContext: {
    startingRoute: `/${app}/home`,
    ...(member?.initialContext ?? sampleContext),
  },
  liveUpdate: {
    appId,
    channel: member?.channel ?? 'reference',
    syncOnAdd: true,
  },
});

// Bioage always runs with the sample context.
export const createMwas = (member?: LoggedInMember): Mwa[] => [
  {
    title: 'Workouts MWA',
    portal: createPortal('workouts', '851e0894', member),
  },
  { title: 'Bioage MWA', portal: createPortal('bioage', '068a3720') },
  { title: 'NFC MWA', portal: createPortal('nfc', 'dcbe378a', member) },
];

export const mwas = createMwas();
