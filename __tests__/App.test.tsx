import React from 'react';
import { Button } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { EgymMwa } from '@egym/capacitor-mwa-navigation/react-native';
import App from '../App';

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

jest.mock('@egym/capacitor-mwa-navigation/react-native', () => ({
  EgymMwa: { open: jest.fn(), close: jest.fn().mockResolvedValue(false) },
}));

// The BMA login imports the SDK's subscribe, which needs a native module.
jest.mock('@ionic/portals-react-native', () => ({
  subscribe: jest.fn(),
}));

// Without bma-login.json the app runs as before, whatever file a developer has locally.
jest.mock('../src/bmaLogin/config', () => ({
  loadBmaLoginConfig: () => null,
}));

const openMock = jest.mocked(EgymMwa.open);

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
  await ReactTestRenderer.act(async () => button!.props.onPress());
};

beforeEach(() => {
  jest.clearAllMocks();
  openMock.mockResolvedValue({ closedBy: 'dismiss' });
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('the home screen shows one button per MWA', async () => {
  const root = await renderApp();

  expect(buttonTitles(root)).toEqual(['Workouts MWA', 'Bioage MWA', 'NFC MWA', 'Reference MWA']);
  expect(openMock).not.toHaveBeenCalled();
});

test.each([
  ['Workouts MWA', 'workouts', '851e0894'],
  ['Bioage MWA', 'bioage', '068a3720'],
  ['NFC MWA', 'nfc', 'dcbe378a'],
])(
  '%s opens through the package on the reference channel',
  async (title, app, appId) => {
    const root = await renderApp();

    await pressButton(root, title);

    expect(openMock).toHaveBeenCalledTimes(1);
    expect(openMock).toHaveBeenCalledWith({
      appId,
      channel: 'reference',
      startingRoute: `/${app}/home`,
      initialContext: expect.objectContaining({
        email: 'email@example.com',
        language: 'de-DE',
      }),
    });
  },
);

test('Reference MWA opens the web reference MWA through the package on the develop channel', async () => {
  const root = await renderApp();

  await pressButton(root, 'Reference MWA');

  expect(openMock).toHaveBeenCalledTimes(1);
  expect(openMock).toHaveBeenCalledWith({
    appId: '9d727e58',
    channel: 'develop',
    startingRoute: '/home',
    initialContext: expect.objectContaining({
      email: 'email@example.com',
      language: 'de-DE',
    }),
  });
});

test('the home screen stays while the package shows the MWA', async () => {
  openMock.mockReturnValue(new Promise(() => {}));
  const root = await renderApp();

  await pressButton(root, 'Workouts MWA');

  expect(buttonTitles(root)).toEqual(['Workouts MWA', 'Bioage MWA', 'NFC MWA', 'Reference MWA']);
});

test('the close reason is logged', async () => {
  const root = await renderApp();

  await pressButton(root, 'NFC MWA');

  expect(console.log).toHaveBeenCalledWith('NFC MWA closed by dismiss');
});

test('an open that the package refuses is logged with its code', async () => {
  openMock.mockRejectedValue(
    Object.assign(new Error('Another MWA opened by the app is loading or shown'), {
      code: 'BUSY',
    }),
  );
  const root = await renderApp();

  await pressButton(root, 'Workouts MWA');

  expect(console.warn).toHaveBeenCalledWith('Workouts MWA did not open:', 'BUSY');
  expect(buttonTitles(root)).toEqual(['Workouts MWA', 'Bioage MWA', 'NFC MWA', 'Reference MWA']);
});
