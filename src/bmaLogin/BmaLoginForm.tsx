import { useState } from 'react';
import {
  ActivityIndicator,
  Button,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchMwaToken, logIn, type GalaxyLogin } from './galaxy';

export type BmaSession = GalaxyLogin & {
  accessToken: string;
};

type BmaLoginFormProps = {
  galaxyURL: string;
  onLoggedIn: (session: BmaSession) => void;
};

/** The "auth as BMA user" screen: email and password of a member of the Galaxy brand. */
export function BmaLoginForm({ galaxyURL, onLoggedIn }: BmaLoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (isLoggingIn) {
      return;
    }
    setIsLoggingIn(true);
    setError(null);
    try {
      const login = await logIn(galaxyURL, email.trim(), password);
      const accessToken = await fetchMwaToken(
        galaxyURL,
        login.exerciser.uuid,
        login.cookie,
      );
      onLoggedIn({ ...login, accessToken });
    } catch (loginError) {
      setError(
        loginError instanceof Error ? loginError.message : 'The login failed.',
      );
      setIsLoggingIn(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.title}>Auth as BMA user</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="username"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        onSubmitEditing={submit}
      />
      <View style={styles.actions}>
        {isLoggingIn ? (
          <ActivityIndicator />
        ) : (
          <Button
            title="Log in"
            onPress={submit}
            disabled={email.trim() === '' || password === ''}
          />
        )}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    gap: 16,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8e8e93',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#000000',
  },
  actions: {
    minHeight: 40,
    justifyContent: 'center',
  },
  error: {
    color: '#c62828',
  },
});
