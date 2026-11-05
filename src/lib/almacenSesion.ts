import * as Keychain from 'react-native-keychain';

const servicio = (clave: string) => `incidencias.${clave}`;

/** Guarda la sesión en Keychain (iOS) o Keystore (Android), no en texto plano. */
export const almacenSesion = {
  async getItem(clave: string): Promise<string | null> {
    try {
      const credencial = await Keychain.getGenericPassword({
        service: servicio(clave),
      });
      return credencial ? credencial.password : null;
    } catch {
      return null;
    }
  },
  async setItem(clave: string, valor: string): Promise<void> {
    await Keychain.setGenericPassword('sesion', valor, {
      service: servicio(clave),
    });
  },
  async removeItem(clave: string): Promise<void> {
    await Keychain.resetGenericPassword({ service: servicio(clave) });
  },
};
