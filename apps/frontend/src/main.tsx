import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import { ChakraProvider, createSystem, defaultConfig } from '@chakra-ui/react';
import App from './app';
import { configureAmplify } from './auth/amplify';
import './styles.css';

configureAmplify();

// Chakra's global CSS reset is off so it doesn't restyle pages that don't use Chakra yet.
const system = createSystem(defaultConfig, { preflight: false });

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

root.render(
  <StrictMode>
    <ChakraProvider value={system}>
      <App />
    </ChakraProvider>
  </StrictMode>,
);
