import { Button, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EgymMwa } from '@egym/capacitor-mwa-navigation/react-native';
import type { Mwa } from './mwas';

type MwaHomeProps = {
  mwas: Mwa[];
};

// The package shows the MWA full screen, loads its live update first and closes it on dismiss or back.
const openMwa = ({ title, appId, channel, startingRoute, initialContext }: Mwa) => {
  EgymMwa.open({ appId, channel, startingRoute, initialContext }).then(
    ({ closedBy }) => console.log(`${title} closed by ${closedBy}`),
    (error: unknown) =>
      console.warn(
        `${title} did not open:`,
        (error as { code?: string }).code ?? error,
      ),
  );
};

export function MwaHome({ mwas }: MwaHomeProps) {
  return (
    <SafeAreaView style={styles.home}>
      <Text style={styles.title}>EGYM MWA reference</Text>
      <View style={styles.buttons}>
        {mwas.map(mwa => (
          <Button
            key={mwa.appId}
            title={mwa.title}
            onPress={() => openMwa(mwa)}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  home: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  buttons: {
    marginTop: 24,
    gap: 16,
  },
});
