export default {
    preset: "ts-jest",
    testEnvironment: 'jest-environment-jsdom',
    globals: {
        'ts-jest': {
            tsconfig: 'tsconfig.test.json'
        }
    }
};