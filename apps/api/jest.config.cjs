module.exports = {
  displayName: "@logue/api",
  rootDir: __dirname,
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.jest.json" }],
    "\\.sql$": "<rootDir>/jest.sql-transform.cjs",
  },
  testMatch: ["<rootDir>/src/**/*.test.ts"],
};
