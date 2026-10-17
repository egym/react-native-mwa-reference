import React from 'react';
import { Button } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import {
  PortalView,
  subscribe,
  syncOne,
  type Message,
  type SyncResult,
} from '@ionic/portals-react-native';
import { egymMwaPortalPlugins } from '@egym/capacitor-mwa-navigation/react-native';
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

// Without bma-login.json the app runs as before, whatever file a developer has locally.
jest.mock('../src/bmaLogin/config', () => ({
  loadBmaLoginConfig: () => null,
}));

const subscribeMock = jest.mocked(subscribe);
const syncOneMock = jest.mocked(syncOne);
const removeSubscription = jest.fn();

const renderApp = async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<App />);
  });
  return renderer!.root;
};

const buttonTitles = (root: ReactTestRenderer.ReactTestInstance) =>
  root.findAllByType(Button).map(button => button.props.title);

const openMwa = async (
  root: ReactTestRenderer.ReactTestInstance,
  title: string,
) => {
  const button = root
    .findAllByType(Button)
    .find(candidate => candidate.props.title === title);
  await ReactTestRenderer.act(() => button!.props.onPress());
};

const syncResult = (activeApplicationPathChanged: boolean) =>
  ({ activeApplicationPathChanged } as SyncResult);

// The screen syncs after the first layout of the Portal view.
const layOutPortal = async (root: ReactTestRenderer.ReactTestInstance) => {
  await ReactTestRenderer.act(async () => {
    root.findByType(PortalView).props.onLayout();
  });
};

const publishToSubscription = async (data: unknown) => {
  const [topic, onMessage] = subscribeMock.mock.calls[0];
  expect(topic).toBe('subscription');
  const message: Message = { subscriptionRef: 1, topic, data };
  await ReactTestRenderer.act(() => onMessage(message));
};

beforeEach(() => {
  jest.clearAllMocks();
  subscribeMock.mockReturnValue({
    remove: removeSubscription,
  } as unknown as ReturnType<typeof subscribe>);
  syncOneMock.mockResolvedValue(syncResult(true));
});

test('the home screen shows one button per MWA and the debug plugin test', async () => {
  const root = await renderApp();

  expect(buttonTitles(root)).toEqual([
    'Workouts MWA',
    'Bioage MWA',
    'NFC MWA',
    'Plugin test',
  ]);
  expect(root.findAllByType(PortalView)).toHaveLength(0);
});

test.each([
  ['Workouts MWA', 'workouts', '851e0894'],
  ['Bioage MWA', 'bioage', '068a3720'],
  ['NFC MWA', 'nfc', 'dcbe378a'],
])(
  '%s opens full screen from the reference channel',
  async (title, app, appId) => {
    const root = await renderApp();

    await openMwa(root, title);

    const { portal } = root.findByType(PortalView).props;
    expect(portal.liveUpdate).toEqual({
      appId,
      channel: 'reference',
      syncOnAdd: false,
    });
    expect(portal.initialContext.startingRoute).toBe(`/${app}/home`);
    expect(portal.plugins).toBe(egymMwaPortalPlugins);
    expect(buttonTitles(root)).toEqual(['Close']);

    await layOutPortal(root);

    expect(syncOneMock).toHaveBeenCalledWith(appId);
    expect(buttonTitles(root)).toEqual([]);
  },
);

test('the loading view stays until the live update sync ends', async () => {
  let finishSync: (result: SyncResult) => void = () => {};
  syncOneMock.mockReturnValue(
    new Promise(resolve => {
      finishSync = resolve;
    }),
  );
  const root = await renderApp();
  await openMwa(root, 'Workouts MWA');
  await layOutPortal(root);
  const firstPortalView = root.findByType(PortalView);

  expect(buttonTitles(root)).toEqual(['Close']);

  await ReactTestRenderer.act(async () => finishSync(syncResult(true)));

  expect(buttonTitles(root)).toEqual([]);
  expect(root.findByType(PortalView)).not.toBe(firstPortalView);
  expect(syncOneMock).toHaveBeenCalledTimes(1);
});

test('without a new build the Portal view stays as it is', async () => {
  syncOneMock.mockResolvedValue(syncResult(false));
  const root = await renderApp();
  await openMwa(root, 'Workouts MWA');
  const firstPortalView = root.findByType(PortalView);
  const firstPortalProp = firstPortalView.props.portal;

  await layOutPortal(root);

  expect(buttonTitles(root)).toEqual([]);
  expect(root.findByType(PortalView)).toBe(firstPortalView);
  // A new portal object would make the iOS SDK build the native Portal again.
  expect(root.findByType(PortalView).props.portal).toBe(firstPortalProp);
});

test('a sync that keeps failing shows the build on the device', async () => {
  jest.useFakeTimers();
  try {
    syncOneMock.mockRejectedValue(new Error('offline'));
    const root = await renderApp();
    await openMwa(root, 'NFC MWA');
    await layOutPortal(root);

    expect(buttonTitles(root)).toEqual(['Close']);

    await ReactTestRenderer.act(() => jest.advanceTimersByTimeAsync(3_200));

    expect(buttonTitles(root)).toEqual([]);
    expect(root.findAllByType(PortalView)).toHaveLength(1);
  } finally {
    jest.useRealTimers();
  }
});

test('the sync is retried until the native view registered the live update', async () => {
  jest.useFakeTimers();
  try {
    syncOneMock
      .mockRejectedValueOnce(new Error('not registered'))
      .mockResolvedValueOnce(syncResult(true));
    const root = await renderApp();
    await openMwa(root, 'Workouts MWA');
    const firstPortalView = root.findByType(PortalView);
    await layOutPortal(root);

    await ReactTestRenderer.act(() => jest.advanceTimersByTimeAsync(200));

    expect(syncOneMock).toHaveBeenCalledTimes(2);
    expect(buttonTitles(root)).toEqual([]);
    expect(root.findByType(PortalView)).not.toBe(firstPortalView);
  } finally {
    jest.useRealTimers();
  }
});

test('Close on the loading view closes the MWA', async () => {
  syncOneMock.mockReturnValue(new Promise(() => {}));
  const root = await renderApp();
  const homeTitles = buttonTitles(root);
  await openMwa(root, 'Bioage MWA');

  await openMwa(root, 'Close');

  expect(root.findAllByType(PortalView)).toHaveLength(0);
  expect(buttonTitles(root)).toEqual(homeTitles);
});

test('dismiss closes the MWA and ends the subscription', async () => {
  const root = await renderApp();
  await openMwa(root, 'NFC MWA');

  await publishToSubscription({ type: 'dismiss' });

  expect(root.findAllByType(PortalView)).toHaveLength(0);
  expect(buttonTitles(root)).toHaveLength(4);
  expect(removeSubscription).toHaveBeenCalledTimes(1);
});

test('the plugin test page gets the Workouts context and the NFC channel', async () => {
  const root = await renderApp();

  await openMwa(root, 'Plugin test');

  const { portal } = root.findByType(PortalView).props;
  expect(portal.startDir).toBe('plugin-test');
  expect(portal.plugins).toBe(egymMwaPortalPlugins);
  expect(portal.liveUpdate).toBeUndefined();
  expect(portal.initialContext).toMatchObject({
    startingRoute: '/workouts/home',
    email: 'email@example.com',
    nfcChannel: 'reference',
  });
});

test('other messages keep the MWA open', async () => {
  const root = await renderApp();
  await openMwa(root, 'Workouts MWA');

  await publishToSubscription({ type: 'authToken' });

  expect(root.findAllByType(PortalView)).toHaveLength(1);
  expect(removeSubscription).not.toHaveBeenCalled();
});
