import { useMemo, useState } from 'react';
import { MwaHome } from '../MwaHome';
import { createMwas } from '../mwas';
import { BmaLoginForm, type BmaSession } from './BmaLoginForm';
import type { BmaLoginConfig } from './config';

type BmaLoginProps = {
  config: BmaLoginConfig;
};

/** Shows the login, then the MWA buttons with Workouts and NFC running as the logged-in member. */
export function BmaLogin({ config }: BmaLoginProps) {
  const [session, setSession] = useState<BmaSession | null>(null);

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
  return <BmaLoginForm galaxyURL={config.galaxyURL} onLoggedIn={setSession} />;
}
