module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  moduleFileExtensions: ['js', 'jsx'],
  moduleNameMapper: {
    '\\.(css|less|scss)$': 'identity-obj-proxy',
  },
  collectCoverageFrom: ['src/**/*.{js,jsx}', '!src/main.jsx', '!src/vite-env.d.ts'],
  globals: {
    'import.meta': {
      env: {
        VITE_ENCRYPTION_KEY: 'test-key',
        VITE_FIREBASE_API_KEY: 'test-api-key',
        VITE_FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
        VITE_FIREBASE_DATABASE_URL: 'https://test.firebaseio.com',
        VITE_FIREBASE_PROJECT_ID: 'test-project',
        VITE_FIREBASE_STORAGE_BUCKET: 'test.appspot.com',
        VITE_FIREBASE_MESSAGING_SENDER_ID: '123456',
        VITE_FIREBASE_APP_ID: 'test-app-id',
        PROD: false,
        DEV: true,
        MODE: 'test',
      },
    },
  },
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
}

