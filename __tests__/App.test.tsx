import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaProvider: View, SafeAreaView: View };
});
jest.mock('react-native-image-picker', () => ({}));
jest.mock('react-native-keychain', () => ({}));
jest.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
    },
  },
}));

test('sin sesión muestra el acceso', async () => {
  let arbol!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    arbol = ReactTestRenderer.create(<App />);
  });
  expect(JSON.stringify(arbol.toJSON())).toContain('Iniciar sesión');
});
