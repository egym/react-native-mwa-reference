import React from 'react';
import { Button } from 'react-native';
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
}));

// Without bma-login.json the app runs as before, whatever file a developer has locally.
jest.mock('../src/bmaLogin/config', () => ({
  loadBmaLoginConfig: () => null,
}));

const subscribeMock = jest.mocked(subscribe);
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
});

test('the home screen shows one button per MWA', async () => {
  const root = await renderApp();

  expect(buttonTitles(root)).toEqual(['Workouts MWA', 'Bioage MWA', 'NFC MWA']);
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
      syncOnAdd: true,
    });
    expect(portal.initialContext.startingRoute).toBe(`/${app}/home`);
    expect(buttonTitles(root)).toEqual([]);
  },
);

test('dismiss closes the MWA and ends the subscription', async () => {
  const root = await renderApp();
  await openMwa(root, 'NFC MWA');

  await publishToSubscription({ type: 'dismiss' });

  expect(root.findAllByType(PortalView)).toHaveLength(0);
  expect(buttonTitles(root)).toHaveLength(3);
  expect(removeSubscription).toHaveBeenCalledTimes(1);
});

test('other messages keep the MWA open', async () => {
  const root = await renderApp();
  await openMwa(root, 'Workouts MWA');

  await publishToSubscription({ type: 'authToken' });

  expect(root.findAllByType(PortalView)).toHaveLength(1);
  expect(removeSubscription).not.toHaveBeenCalled();
});
