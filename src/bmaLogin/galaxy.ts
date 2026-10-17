import { Platform } from 'react-native';

export type Exerciser = {
  uuid: string;
  homeClubUuid: string;
  email: string;
};

export type GalaxyLogin = {
  exerciser: Exerciser;
  /** The session cookies of the login, sent by hand with each token call. */
  cookie: string;
};

export class GalaxyHttpError extends Error {
  constructor(readonly status: number) {
    super(`Galaxy answered with HTTP ${status}.`);
    this.name = 'GalaxyHttpError';
  }

  /** Galaxy no longer accepts the session, for example because it expired. */
  get rejectsSession(): boolean {
    return this.status === 401 || this.status === 403;
  }
}

const randomHex = (length: number) =>
  Array.from({ length }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join('');

// Galaxy's mobile login names the device; any id per app start will do.
const deviceUid = [8, 4, 4, 4, 12].map(randomHex).join('-').toUpperCase();

const userAgent = `clientType=MOBILE_DEVICE; devicePlatform=${
  Platform.OS === 'ios' ? 'IOS' : 'ANDROID'
}; deviceUid=${deviceUid}; applicationName=Team; applicationVersion=3.64; applicationVersionCode=501;`;

const send = async (url: string, init: RequestInit) => {
  // `omit` keeps the app's cookie store out of it: on Android each Capacitor Portal clears its session cookies.
  const response = await fetch(url, { ...init, credentials: 'omit' });
  if (!response.ok) {
    throw new GalaxyHttpError(response.status);
  }
  return response;
};

const readJson = async (
  response: Response,
): Promise<Record<string, unknown>> => {
  try {
    return await response.json();
  } catch {
    // Not chained: the parser's message can quote the body, which can hold a token.
    throw new Error('Galaxy did not answer with JSON.');
  }
};

const requireString = (json: Record<string, unknown>, key: string): string => {
  const value = json[key];
  if (typeof value !== 'string' || value === '') {
    throw new Error(`Galaxy answered without ${key}.`);
  }
  return value;
};

// The name=value pair of each cookie; the platform joins several Set-Cookie headers with commas.
const cookiesOf = (setCookie: string | null) =>
  Array.from(
    setCookie?.matchAll(/(?:^|,\s*)([^=;,\s]+=[^;,]*)/g) ?? [],
    match => match[1],
  ).join('; ');

/** Galaxy's mobile login, as the BMA apps do it. */
export const logIn = async (
  galaxyURL: string,
  email: string,
  password: string,
): Promise<GalaxyLogin> => {
  const response = await send(`${galaxyURL}/np/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      'X-NP-User-Agent': userAgent,
    },
    body: `username=${encodeURIComponent(email)}&password=${encodeURIComponent(
      password,
    )}&club_portal=true`,
  });
  const json = await readJson(response);
  return {
    exerciser: {
      uuid: requireString(json, 'uuid'),
      homeClubUuid: requireString(json, 'homeClubUuid'),
      email: typeof json.email === 'string' && json.email ? json.email : email,
    },
    cookie: cookiesOf(response.headers.get('set-cookie')),
  };
};

/** The exerciser's MWA token for Workouts and NFC, with the session of the login. */
export const fetchMwaToken = async (
  galaxyURL: string,
  exerciserUuid: string,
  cookie: string,
): Promise<string> => {
  const response = await send(
    `${galaxyURL}/np/micro-web-app/v1.0/exercisers/${encodeURIComponent(
      exerciserUuid,
    )}/tokens/FLS`,
    { method: 'GET', headers: { Cookie: cookie } },
  );
  return requireString(await readJson(response), 'accessToken');
};
