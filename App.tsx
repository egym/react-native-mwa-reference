import { useCallback, useState } from 'react';
import { Button, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { MwaScreen } from './src/MwaScreen';
import { mwas, type Mwa } from './src/mwas';

function App() {
  const [openMwa, setOpenMwa] = useState<Mwa | null>(null);
  const closeMwa = useCallback(() => setOpenMwa(null), []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      {openMwa ? (
        <MwaScreen portal={openMwa.portal} onClose={closeMwa} />
      ) : (
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
      )}
    </SafeAreaProvider>
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

export default App;
