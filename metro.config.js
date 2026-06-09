const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Firebase ships ESM + CJS + Node + React Native builds per package.
// Metro may load different builds for different callers, creating split
// registries and causing "Component auth has not been registered yet".
// Pin every Firebase internal to a single concrete file.

const FIREBASE_OVERRIDES = {
  // Component registry — must be ONE CJS instance across every caller
  '@firebase/component': path.resolve(
    __dirname,
    'node_modules/@firebase/component/dist/index.cjs.js',
  ),
  // App — CJS only, same reason
  '@firebase/app': path.resolve(
    __dirname,
    'node_modules/@firebase/app/dist/index.cjs.js',
  ),
  // Auth — must be the React Native build so registerAuth("ReactNative") runs
  '@firebase/auth': path.resolve(
    __dirname,
    'node_modules/firebase/node_modules/@firebase/auth/dist/rn/index.js',
  ),
  // Util + Logger — CJS to stay consistent
  '@firebase/util': path.resolve(
    __dirname,
    'node_modules/@firebase/util/dist/index.cjs.js',
  ),
  '@firebase/logger': path.resolve(
    __dirname,
    'node_modules/@firebase/logger/dist/index.cjs.js',
  ),
};

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (FIREBASE_OVERRIDES[moduleName]) {
    return { filePath: FIREBASE_OVERRIDES[moduleName], type: 'sourceFile' };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
