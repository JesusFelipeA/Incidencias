import * as Keychain from 'react-native-keychain';
import { almacenSesion } from '../src/lib/almacenSesion';

jest.mock('react-native-keychain', () => ({
  getGenericPassword: jest.fn(),
  setGenericPassword: jest.fn(),
  resetGenericPassword: jest.fn(),
}));

const llavero = Keychain as jest.Mocked<typeof Keychain>;

test('guarda y lee la sesión del llavero seguro', async () => {
  await almacenSesion.setItem('auth', 'token');
  expect(llavero.setGenericPassword).toHaveBeenCalledWith('sesion', 'token', {
    service: 'incidencias.auth',
  });
  llavero.getGenericPassword.mockResolvedValue({
    password: 'token',
  } as Keychain.UserCredentials);
  await expect(almacenSesion.getItem('auth')).resolves.toBe('token');
});

test('devuelve null si no hay sesión o el llavero falla', async () => {
  llavero.getGenericPassword.mockResolvedValueOnce(false);
  await expect(almacenSesion.getItem('auth')).resolves.toBeNull();
  llavero.getGenericPassword.mockRejectedValueOnce(new Error('fallo'));
  await expect(almacenSesion.getItem('auth')).resolves.toBeNull();
});
