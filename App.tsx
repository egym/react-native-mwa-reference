import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MwaHome } from './src/MwaHome';
import { mwas } from './src/mwas';

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <MwaHome mwas={mwas} />
    </SafeAreaProvider>
  );
}

export default App;
