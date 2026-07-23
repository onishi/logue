module.exports = {
  displayName: "@logue/api",
  rootDir: __dirname,
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "<rootDir>/../../tsconfig.jest.base.json" }],
  },
  testMatch: ["<rootDir>/src/**/*.test.ts"],
};
