module.exports = {
    preset: "ts-jest",
    testEnvironment: 'jest-environment-jsdom',
    globals: {
        'ts-jest': {
            tsconfig: 'tsconfig.test.json'
        }
    }
};