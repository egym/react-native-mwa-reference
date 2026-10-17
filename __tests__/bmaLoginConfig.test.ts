import { loadBmaLoginConfig } from '../src/bmaLogin/config';

test('no file means no login', () => {
  expect(loadBmaLoginConfig(null)).toBeNull();
});

test('the file gives the hosts and the channel', () => {
  expect(
    loadBmaLoginConfig({
      galaxyURL: ' https://galaxy.test/ ',
      mwaApiURL: 'https://mwa-api.test',
      liveUpdateChannel: 'test-channel',
    }),
  ).toEqual({
    galaxyURL: 'https://galaxy.test',
    mwaApiURL: 'https://mwa-api.test',
    liveUpdateChannel: 'test-channel',
  });
});

test('a file with an empty key stops the app with the key name', () => {
  expect(() =>
    loadBmaLoginConfig({
      galaxyURL: 'https://galaxy.test',
      mwaApiURL: ' ',
      liveUpdateChannel: 'test-channel',
    }),
  ).toThrow(
    'bma-login.json has no value for mwaApiURL. Fill it in, or delete the file.',
  );
});
