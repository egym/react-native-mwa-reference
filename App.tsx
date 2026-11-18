import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BmaLogin } from './src/bmaLogin/BmaLogin';
import { loadBmaLoginConfig } from './src/bmaLogin/config';
import { MwaHome } from './src/MwaHome';
import { mwas } from './src/mwas';

// Read at start, so a broken bma-login.json stops the app before the first render.
const bmaLoginConfig = loadBmaLoginConfig();

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      {bmaLoginConfig ? (
        <BmaLogin config={bmaLoginConfig} />
      ) : (
        <MwaHome mwas={mwas} />
      )}
    </SafeAreaProvider>
  );
}

export default App;
