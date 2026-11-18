import { useEffect, useMemo, useState } from 'react';
import { NativeModules } from 'react-native';
import { subscribe } from '@ionic/portals-react-native';
import { MwaHome } from '../MwaHome';
import { createMwas } from '../mwas';
import { BmaLoginForm, type BmaSession } from './BmaLoginForm';
import type { BmaLoginConfig } from './config';
import { fetchMwaToken, GalaxyHttpError } from './galaxy';

type BmaLoginProps = {
  config: BmaLoginConfig;
};

/** Shows the login, then the MWA buttons with Workouts and NFC running as the logged-in member. */
export function BmaLogin({ config }: BmaLoginProps) {
  const [session, setSession] = useState<BmaSession | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const exerciserUuid = session?.exerciser.uuid;
  const galaxyCookie = session?.cookie;

  useEffect(() => {
    if (exerciserUuid === undefined || galaxyCookie === undefined) {
      return;
    }
    let isActive = true;
    // An MWA asks for a new token after a 401, as in the BMA apps.
    const subscription = subscribe('subscription', message => {
      if (message.data?.type !== 'authToken') {
        return;
      }
      fetchMwaToken(config.galaxyURL, exerciserUuid, galaxyCookie).then(
        token => {
          if (!isActive) {
            return;
          }
          // The SDK's publish would send { message: token }; the MWAs read a plain string.
          NativeModules.PortalsStringPublisher.publish('authToken', token);
          setSession(current => current && { ...current, accessToken: token });
        },
        (error: unknown) => {
          if (!isActive) {
            return;
          }
          if (error instanceof GalaxyHttpError && error.rejectsSession) {
            setNotice('The Galaxy session has ended. Log in again.');
            setSession(null);
          } else {
            console.warn(
              'Could not renew the MWA token:',
              error instanceof Error ? error.message : error,
            );
          }
        },
      );
    });

    return () => {
      isActive = false;
      subscription.remove();
    };
  }, [config.galaxyURL, exerciserUuid, galaxyCookie]);

  const mwas = useMemo(
    () =>
      session &&
      createMwas({
        channel: config.liveUpdateChannel,
        // No emailJWT key (it turns on the consent guard) and no mwaProtocolVersion (this host drops trackEvent).
        initialContext: {
          clientId: 'egym',
          authToken: session.accessToken,
          url: config.mwaApiURL,
          gymLocation: session.exerciser.homeClubUuid,
          email: session.exerciser.email,
          language: 'en-US',
          preferences: {},
          linking: { status: 'linked', egymEmail: session.exerciser.email },
        },
      }),
    [config.liveUpdateChannel, config.mwaApiURL, session],
  );

  if (mwas) {
    return <MwaHome mwas={mwas} />;
  }
  return (
    <BmaLoginForm
      galaxyURL={config.galaxyURL}
      notice={notice}
      onLoggedIn={setSession}
    />
  );
}
