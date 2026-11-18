export type BmaLoginConfig = {
  galaxyURL: string;
  mwaApiURL: string;
  liveUpdateChannel: string;
};

const keys = ['galaxyURL', 'mwaApiURL', 'liveUpdateChannel'] as const;

const readConfigFile = (): unknown => {
  try {
    // Metro treats a require inside try as optional: it bundles the git-ignored file when it exists.
    return require('../../bma-login.json');
  } catch {
    return null;
  }
};

/** The optional "auth as BMA user" for EGYM testing, on only when bma-login.json exists (README). */
export const loadBmaLoginConfig = (
  file: unknown = readConfigFile(),
): BmaLoginConfig | null => {
  if (file == null) {
    return null;
  }
  const values = file as Partial<Record<(typeof keys)[number], unknown>>;
  for (const key of keys) {
    const value = values[key];
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(
        `bma-login.json has no value for ${key}. Fill it in, or delete the file.`,
      );
    }
  }
  const config = values as BmaLoginConfig;
  return {
    galaxyURL: config.galaxyURL.trim().replace(/\/+$/, ''),
    mwaApiURL: config.mwaApiURL.trim(),
    liveUpdateChannel: config.liveUpdateChannel.trim(),
  };
};
