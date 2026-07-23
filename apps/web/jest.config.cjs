module.exports = {
  displayName: "@logue/web",
  rootDir: __dirname,
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "<rootDir>/../../tsconfig.jest.base.json" }],
  },
  testMatch: ["<rootDir>/src/**/*.test.tsx"],
};
