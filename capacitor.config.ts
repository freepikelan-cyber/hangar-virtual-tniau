import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'id.tniau.hangarvirtual',
  appName: 'Hangar Virtual TNI AU 3D',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#07152c',
    allowMixedContent: false,
  },
};

export default config;
