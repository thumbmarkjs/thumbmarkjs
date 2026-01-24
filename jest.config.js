export default {
    preset: "ts-jest",
    testEnvironment: 'jest-environment-jsdom',
    testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
    globals: {
        'ts-jest': {
            tsconfig: 'tsconfig.test.json'
        }
    }
};