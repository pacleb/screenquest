import type { Config } from 'jest';

const config: Config = {
  coverageReporters: ['text', 'text-summary', 'lcov', 'cobertura'],
  coverageDirectory: 'coverage/unit',
  projects: [
    {
      displayName: 'unit',
      rootDir: 'src',
      testRegex: '.*\\.spec\\.ts$',
      transform: { '^.+\\.ts$': 'ts-jest' },
      moduleFileExtensions: ['js', 'json', 'ts'],
      testEnvironment: 'node',
      collectCoverageFrom: ['**/*.service.ts', '**/constants/*.ts'],
    },
    {
      displayName: 'e2e',
      rootDir: 'test',
      testRegex: '.*\\.e2e-spec\\.ts$',
      transform: { '^.+\\.(t|j)s$': 'ts-jest' },
      transformIgnorePatterns: ['node_modules/(?!(uuid)/)'],
      moduleFileExtensions: ['js', 'json', 'ts'],
      testEnvironment: 'node',
      coverageDirectory: '../coverage/e2e',
    },
  ],
};

export default config;
