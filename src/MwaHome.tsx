import { useCallback, useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MwaScreen } from './MwaScreen';
import type { Mwa } from './mwas';

type MwaHomeProps = {
  mwas: Mwa[];
};

export function MwaHome({ mwas }: MwaHomeProps) {
  const [openMwa, setOpenMwa] = useState<Mwa | null>(null);
  const closeMwa = useCallback(() => setOpenMwa(null), []);

  if (openMwa) {
    return <MwaScreen portal={openMwa.portal} onClose={closeMwa} />;
  }

  return (
    <SafeAreaView style={styles.home}>
      <Text style={styles.title}>EGYM MWA reference</Text>
      <View style={styles.buttons}>
        {mwas.map(mwa => (
          <Button
            key={mwa.portal.name}
            title={mwa.title}
            onPress={() => setOpenMwa(mwa)}
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
