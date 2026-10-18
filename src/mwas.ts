/** One MWA button: what the app passes to `EgymMwa.open`. */
export type Mwa = {
  title: string;
  appId: string;
  channel: string;
  startingRoute: string;
  initialContext: Record<string, unknown>;
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

const createMwa = (
  title: string,
  app: string,
  appId: string,
  member?: LoggedInMember,
): Mwa => ({
  title,
  appId,
  channel: member?.channel ?? 'reference',
  startingRoute: `/${app}/home`,
  initialContext: member?.initialContext ?? sampleContext,
});

// Bioage always runs with the sample context.
export const createMwas = (member?: LoggedInMember): Mwa[] => [
  createMwa('Workouts MWA', 'workouts', '851e0894', member),
  createMwa('Bioage MWA', 'bioage', '068a3720'),
  createMwa('NFC MWA', 'nfc', 'dcbe378a', member),
];

export const mwas = createMwas();
