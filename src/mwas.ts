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

const createPortal = (app: string, appId: string): Portal => ({
  name: `egym-${app}`,
  startDir: `egym-${app}`,
  plugins,
  initialContext: {
    startingRoute: `/${app}/home`,
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
  },
  liveUpdate: { appId, channel: 'reference', syncOnAdd: true },
});

export const mwas: Mwa[] = [
  { title: 'Workouts MWA', portal: createPortal('workouts', '851e0894') },
  { title: 'Bioage MWA', portal: createPortal('bioage', '068a3720') },
  { title: 'NFC MWA', portal: createPortal('nfc', 'dcbe378a') },
];
