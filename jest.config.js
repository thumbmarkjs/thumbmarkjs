export default {
    projects: [
        {
            displayName: "dom",
            preset: "ts-jest",
            testEnvironment: "jest-environment-jsdom",
            testPathIgnorePatterns: ["/node_modules/", "/e2e/", "src/thumbmark.test.ts"],
            globals: {
                "ts-jest": {
                    tsconfig: "tsconfig.test.json"
                }
            }
        },
        {
            displayName: "node",
            preset: "ts-jest",
            testEnvironment: "node",
            testMatch: ["<rootDir>/src/thumbmark.test.ts"],
            testPathIgnorePatterns: ["/node_modules/", "/e2e/"],
            globals: {
                "ts-jest": {
                    tsconfig: "tsconfig.test.json"
                }
            }
        }
    ]
};