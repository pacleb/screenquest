import type { Config } from 'jest';

const config: Config = {
  projects: [
    {
      displayName: 'unit',
      rootDir: 'src',
      testRegex: '.*\\.spec\\.ts$',
      transform: { '^.+\\.ts$': 'ts-jest' },
      moduleFileExtensions: ['js', 'json', 'ts'],
      testEnvironment: 'node',
      collectCoverageFrom: ['**/*.service.ts', '**/constants/*.ts'],
      coverageDirectory: '../coverage/unit',
    },
    {
      displayName: 'e2e',
      rootDir: 'test',
      testRegex: '.*\\.e2e-spec\\.ts$',
      transform: { '^.+\\.ts$': 'ts-jest' },
      moduleFileExtensions: ['js', 'json', 'ts'],
      testEnvironment: 'node',
      coverageDirectory: '../coverage/e2e',
    },
  ],
};

export default config;
