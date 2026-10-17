import type { Portal } from '@ionic/portals-react-native';
import { egymMwaPortalPlugins } from '@egym/capacitor-mwa-navigation/react-native';

export type Mwa = {
  title: string;
  portal: Portal;
};

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
  plugins: egymMwaPortalPlugins,
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
