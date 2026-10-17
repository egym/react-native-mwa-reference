import React from 'react';
import { Button, NativeModules, Text, TextInput } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import {
  PortalView,
  subscribe,
  type Message,
} from '@ionic/portals-react-native';
import App from '../App';

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

jest.mock('@ionic/portals-react-native', () => ({
  PortalView: 'PortalView',
  subscribe: jest.fn(),
  syncOne: jest.fn(),
}));

jest.mock('../src/bmaLogin/config', () => ({
  loadBmaLoginConfig: () => ({
    galaxyURL: 'https://galaxy.test',
    mwaApiURL: 'https://mwa-api.test',
    liveUpdateChannel: 'test-channel',
  }),
}));

type Listener = (message: Message) => void;

const subscribeMock = jest.mocked(subscribe);
const fetchMock = jest.fn();
const publishString = jest.fn();
let listeners: Listener[] = [];

const loginUrl = 'https://galaxy.test/np/exerciser/login';
const tokenUrl =
  'https://galaxy.test/np/micro-web-app/v1.0/exercisers/exerciser-1/tokens/FLS';

const response = (
  status: number,
  body: unknown = {},
  headers: Record<string, string> = {},
) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
  json: async () => body,
});

const loginResponse = response(
  200,
  { uuid: 'exerciser-1', homeClubUuid: 'gym-1', email: 'member@example.com' },
  {
    'set-cookie':
      'JSESSIONID=session-1; Path=/; HttpOnly, AWSALB=lb-1; Expires=Thu, 22 Oct 2026 10:00:00 GMT; Path=/',
  },
);

const tokenRequest = {
  method: 'GET',
  credentials: 'omit',
  headers: { Cookie: 'JSESSIONID=session-1; AWSALB=lb-1' },
};

const renderApp = async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<App />);
  });
  return renderer!.root;
};

const buttonTitles = (root: ReactTestRenderer.ReactTestInstance) =>
  root.findAllByType(Button).map(button => button.props.title);

const pressButton = async (
  root: ReactTestRenderer.ReactTestInstance,
  title: string,
) => {
  const button = root
    .findAllByType(Button)
    .find(candidate => candidate.props.title === title);
  await ReactTestRenderer.act(async () => {
    button!.props.onPress();
  });
};

const typeInto = async (
  root: ReactTestRenderer.ReactTestInstance,
  placeholder: string,
  text: string,
) => {
  const input = root
    .findAllByType(TextInput)
    .find(candidate => candidate.props.placeholder === placeholder);
  await ReactTestRenderer.act(() => input!.props.onChangeText(text));
};

const logIn = async (root: ReactTestRenderer.ReactTestInstance) => {
  await typeInto(root, 'Email', 'member@example.com');
  await typeInto(root, 'Password', 'p@ss&word');
  await pressButton(root, 'Log in');
};

const publishToSubscription = async (data: unknown) => {
  await ReactTestRenderer.act(async () => {
    listeners.forEach(listener =>
      listener({ subscriptionRef: 1, topic: 'subscription', data }),
    );
  });
};

const texts = (root: ReactTestRenderer.ReactTestInstance) =>
  root.findAllByType(Text).map(text => text.props.children);

beforeEach(() => {
  jest.clearAllMocks();
  listeners = [];
  subscribeMock.mockImplementation((topic, onMessage) => {
    expect(topic).toBe('subscription');
    listeners.push(onMessage);
    return {
      remove: () => {
        listeners = listeners.filter(listener => listener !== onMessage);
      },
    } as unknown as ReturnType<typeof subscribe>;
  });
  globalThis.fetch = fetchMock;
  NativeModules.PortalsStringPublisher = { publish: publishString };
});

test('the login shows instead of the MWA buttons', async () => {
  const root = await renderApp();

  expect(texts(root)).toContain('Auth as BMA user');
  expect(buttonTitles(root)).toEqual(['Log in']);
  expect(fetchMock).not.toHaveBeenCalled();
});

test('the login calls Galaxy and then asks for the MWA token', async () => {
  fetchMock
    .mockResolvedValueOnce(loginResponse)
    .mockResolvedValueOnce(response(200, { accessToken: 'token-1' }));
  const root = await renderApp();

  await logIn(root);

  expect(fetchMock).toHaveBeenNthCalledWith(1, loginUrl, {
    method: 'POST',
    credentials: 'omit',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      'X-NP-API-Version': '1.5',
      'X-NP-User-Agent': expect.stringMatching(
        /^clientType=MOBILE_DEVICE; devicePlatform=IOS; deviceUid=[0-9A-F-]{36}; applicationName=RevGen;/,
      ),
    },
    body: 'username=member%40example.com&password=p%40ss%26word',
  });
  expect(fetchMock).toHaveBeenNthCalledWith(2, tokenUrl, tokenRequest);
  expect(buttonTitles(root)).toEqual(['Workouts MWA', 'Bioage MWA', 'NFC MWA']);
});

test.each([
  ['Workouts MWA', 'workouts', '851e0894'],
  ['NFC MWA', 'nfc', 'dcbe378a'],
])(
  '%s opens as the member on the channel from the file',
  async (title, app, appId) => {
    fetchMock
      .mockResolvedValueOnce(loginResponse)
      .mockResolvedValueOnce(response(200, { accessToken: 'token-1' }));
    const root = await renderApp();
    await logIn(root);

    await pressButton(root, title);

    const { portal } = root.findByType(PortalView).props;
    expect(portal.initialContext).toEqual({
      startingRoute: `/${app}/home`,
      clientId: 'egym',
      authToken: 'token-1',
      url: 'https://mwa-api.test',
      gymLocation: 'gym-1',
      email: 'member@example.com',
      language: 'en-US',
      preferences: {},
      linking: { status: 'linked', egymEmail: 'member@example.com' },
    });
    expect(portal.liveUpdate).toEqual({
      appId,
      channel: 'test-channel',
      syncOnAdd: false,
    });
  },
);

test('Bioage keeps the sample context on the reference channel', async () => {
  fetchMock
    .mockResolvedValueOnce(loginResponse)
    .mockResolvedValueOnce(response(200, { accessToken: 'token-1' }));
  const root = await renderApp();
  await logIn(root);

  await pressButton(root, 'Bioage MWA');

  const { portal } = root.findByType(PortalView).props;
  expect(portal.initialContext.email).toBe('email@example.com');
  expect(portal.initialContext.authToken).toBeUndefined();
  expect(portal.liveUpdate.channel).toBe('reference');
});

test('a failed login shows the reason and keeps the form', async () => {
  fetchMock.mockResolvedValueOnce(response(401));
  const root = await renderApp();

  await logIn(root);

  expect(texts(root)).toContain('Galaxy answered with HTTP 401.');
  expect(buttonTitles(root)).toEqual(['Log in']);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('a token request from an MWA gets a new token from Galaxy', async () => {
  fetchMock
    .mockResolvedValueOnce(loginResponse)
    .mockResolvedValueOnce(response(200, { accessToken: 'token-1' }))
    .mockResolvedValueOnce(response(200, { accessToken: 'token-2' }));
  const root = await renderApp();
  await logIn(root);
  await pressButton(root, 'Workouts MWA');

  await publishToSubscription({ type: 'authToken', data: { instanceId: 1 } });

  expect(fetchMock).toHaveBeenNthCalledWith(3, tokenUrl, tokenRequest);
  expect(publishString).toHaveBeenCalledWith('authToken', 'token-2');
});

test('other messages ask Galaxy for nothing', async () => {
  fetchMock
    .mockResolvedValueOnce(loginResponse)
    .mockResolvedValueOnce(response(200, { accessToken: 'token-1' }));
  const root = await renderApp();
  await logIn(root);

  await publishToSubscription({ type: 'trackEvent' });

  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(publishString).not.toHaveBeenCalled();
});

test('a token renewal that Galaxy rejects goes back to the login', async () => {
  fetchMock
    .mockResolvedValueOnce(loginResponse)
    .mockResolvedValueOnce(response(200, { accessToken: 'token-1' }))
    .mockResolvedValueOnce(response(401));
  const root = await renderApp();
  await logIn(root);
  await pressButton(root, 'Workouts MWA');

  await publishToSubscription({ type: 'authToken' });

  expect(publishString).not.toHaveBeenCalled();
  expect(root.findAllByType(PortalView)).toHaveLength(0);
  expect(buttonTitles(root)).toEqual(['Log in']);
  expect(texts(root)).toContain('The Galaxy session has ended. Log in again.');
  expect(listeners).toHaveLength(0);
});

test('a renewed token keeps the open MWA and reaches the next open', async () => {
  fetchMock
    .mockResolvedValueOnce(loginResponse)
    .mockResolvedValueOnce(response(200, { accessToken: 'token-1' }))
    .mockResolvedValueOnce(response(200, { accessToken: 'token-2' }));
  const root = await renderApp();
  await logIn(root);
  await pressButton(root, 'Workouts MWA');
  const openPortal = root.findByType(PortalView).props.portal;

  await publishToSubscription({ type: 'authToken' });

  expect(root.findByType(PortalView).props.portal).toBe(openPortal);
  await publishToSubscription({ type: 'dismiss' });
  await pressButton(root, 'NFC MWA');
  expect(
    root.findByType(PortalView).props.portal.initialContext.authToken,
  ).toBe('token-2');
});
