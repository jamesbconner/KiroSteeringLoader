/**
 * Coverage Quality Gate Configuration
 * 
 * This configuration defines the coverage thresholds and quality gate rules
 * for the Kiro Steering Loader extension.
 */

export interface CoverageThresholds {
  lines: number;
  functions: number;
  branches: number;
  statements: number;
}

export interface QualityGateConfig {
  /** Coverage thresholds for quality gate */
  thresholds: CoverageThresholds;
  
  /** Whether to fail the build if coverage is below threshold */
  failOnLowCoverage: boolean;
  
  /** Whether to generate trend reports */
  enableTrendTracking: boolean;
  
  /** Maximum number of trend entries to keep */
  maxTrendEntries: number;
  
  /** Files to exclude from coverage calculation */
  excludePatterns: string[];
  
  /** Files to include in coverage calculation */
  includePatterns: string[];
  
  /** Whether to publish coverage reports to external services */
  publishReports: boolean;
  
  /** Coverage report formats to generate */
  reportFormats: ('json' | 'html' | 'markdown' | 'lcov')[];
}

/**
 * Default quality gate configuration
 */
export const defaultQualityGateConfig: QualityGateConfig = {
  thresholds: {
    lines: 85,
    functions: 85,
    branches: 85,
    statements: 85
  },
  failOnLowCoverage: true,
  enableTrendTracking: true,
  maxTrendEntries: 50,
  excludePatterns: [
    'node_modules/**',
    'out/**',
    'tests/**',
    '**/*.d.ts',
    '**/*.test.ts',
    '**/*.spec.ts',
    'coverage/**',
    '.vscode-test/**'
  ],
  includePatterns: [
    'src/**/*.ts'
  ],
  publishReports: true,
  reportFormats: ['json', 'html', 'markdown', 'lcov']
};

/**
 * Environment-specific configurations
 */
export const environmentConfigs = {
  development: {
    ...defaultQualityGateConfig,
    thresholds: {
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80
    },
    failOnLowCoverage: false
  },
  
  ci: {
    ...defaultQualityGateConfig,
    failOnLowCoverage: true,
    publishReports: true
  },
  
  production: {
    ...defaultQualityGateConfig,
    thresholds: {
      lines: 90,
      functions: 90,
      branches: 85,
      statements: 90
    },
    failOnLowCoverage: true
  }
};

/**
 * Get quality gate configuration for current environment
 */
export function getQualityGateConfig(): QualityGateConfig {
  const env = process.env.NODE_ENV || 'development';
  const isCI = process.env.CI === 'true';
  
  if (isCI) {
    return environmentConfigs.ci;
  }
  
  return environmentConfigs[env] || defaultQualityGateConfig;
}