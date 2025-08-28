/**
 * Test Failure Handling Configuration
 * 
 * This configuration defines how test failures should be handled
 * across different environments and test types.
 */

export const failureHandlingConfig = {
  // Global failure handling settings
  global: {
    // Stop on first failure in CI
    stopOnFirstFailure: process.env.CI === 'true',
    
    // Maximum number of retries for flaky tests
    maxRetries: process.env.CI === 'true' ? 2 : 0,
    
    // Timeout for individual tests (in milliseconds)
    testTimeout: 30000,
    
    // Timeout for test suites (in milliseconds)
    suiteTimeout: 300000,
    
    // Whether to generate detailed failure reports
    generateDetailedReports: true,
    
    // Whether to send notifications on failure
    sendNotifications: process.env.CI === 'true'
  },

  // Environment-specific settings
  environments: {
    development: {
      stopOnFirstFailure: false,
      maxRetries: 0,
      sendNotifications: false,
      verboseOutput: true
    },
    
    ci: {
      stopOnFirstFailure: true,
      maxRetries: 2,
      sendNotifications: true,
      verboseOutput: false,
      failFast: true
    },
    
    production: {
      stopOnFirstFailure: true,
      maxRetries: 3,
      sendNotifications: true,
      verboseOutput: false,
      failFast: true,
      criticalTestsOnly: true
    }
  },

  // Test type specific settings
  testTypes: {
    unit: {
      maxRetries: 1,
      timeout: 10000,
      failureThreshold: 0, // No failures allowed
      coverageThreshold: 85
    },
    
    integration: {
      maxRetries: 2,
      timeout: 30000,
      failureThreshold: 0,
      coverageThreshold: 80
    },
    
    e2e: {
      maxRetries: 3,
      timeout: 60000,
      failureThreshold: 1, // Allow 1 failure for flaky tests
      coverageThreshold: 70
    },
    
    performance: {
      maxRetries: 2,
      timeout: 120000,
      failureThreshold: 0,
      performanceThresholds: {
        activationTime: 2000, // 2 seconds
        memoryUsage: 100, // 100MB
        largeDatasetPerformance: 5000 // 5 seconds
      }
    },
    
    memory: {
      maxRetries: 1,
      timeout: 60000,
      failureThreshold: 0,
      memoryLeakThreshold: 10 // 10MB increase
    }
  },

  // Notification settings
  notifications: {
    // GitHub settings
    github: {
      enabled: true,
      createIssues: process.env.GITHUB_CREATE_ISSUES === 'true',
      updatePRComments: true,
      assignees: process.env.GITHUB_ISSUE_ASSIGNEES?.split(',') || [],
      labels: ['bug', 'test-failure', 'ci']
    },
    
    // Slack settings
    slack: {
      enabled: !!process.env.SLACK_WEBHOOK_URL,
      webhookUrl: process.env.SLACK_WEBHOOK_URL,
      channel: process.env.SLACK_CHANNEL || '#ci-alerts',
      mentionUsers: process.env.SLACK_MENTION_USERS?.split(',') || []
    },
    
    // Email settings
    email: {
      enabled: !!process.env.TEST_FAILURE_EMAIL_RECIPIENTS,
      recipients: process.env.TEST_FAILURE_EMAIL_RECIPIENTS?.split(',') || [],
      smtpConfig: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      }
    }
  },

  // Reporting settings
  reporting: {
    // Output formats
    formats: ['json', 'html', 'markdown', 'junit'],
    
    // Report storage
    outputDir: 'coverage',
    
    // Report retention (in days)
    retentionDays: 30,
    
    // Include stack traces in reports
    includeStackTraces: true,
    
    // Include test artifacts (screenshots, logs, etc.)
    includeArtifacts: true,
    
    // Generate trend reports
    generateTrends: true
  },

  // Recovery settings
  recovery: {
    // Automatic retry settings
    autoRetry: {
      enabled: true,
      maxAttempts: 3,
      backoffStrategy: 'exponential', // 'linear', 'exponential', 'fixed'
      initialDelay: 1000, // milliseconds
      maxDelay: 10000 // milliseconds
    },
    
    // Test isolation settings
    isolation: {
      resetBetweenTests: true,
      cleanupTempFiles: true,
      resetMocks: true,
      clearCache: true
    },
    
    // Fallback strategies
    fallbacks: {
      // Use alternative test data on failure
      useAlternativeTestData: true,
      
      // Skip non-critical tests on repeated failures
      skipNonCriticalTests: false,
      
      // Use mock services when real services fail
      useMockServices: true
    }
  },

  // Debugging settings
  debugging: {
    // Enable debug mode for failed tests
    debugFailedTests: process.env.DEBUG_FAILED_TESTS === 'true',
    
    // Capture screenshots on E2E test failures
    captureScreenshots: true,
    
    // Save test artifacts on failure
    saveArtifacts: true,
    
    // Enable verbose logging for failed tests
    verboseLogging: true,
    
    // Keep test environment alive for debugging
    keepAliveOnFailure: process.env.KEEP_ALIVE_ON_FAILURE === 'true'
  },

  // Quality gates
  qualityGates: {
    // Coverage gates
    coverage: {
      lines: 85,
      functions: 85,
      branches: 80,
      statements: 85
    },
    
    // Performance gates
    performance: {
      activationTime: 2000,
      memoryUsage: 100,
      testExecutionTime: 300000 // 5 minutes
    },
    
    // Reliability gates
    reliability: {
      maxFlakiness: 5, // percentage
      maxFailureRate: 1, // percentage
      minSuccessRate: 99 // percentage
    }
  }
};

/**
 * Get configuration for current environment
 */
export function getEnvironmentConfig() {
  const env = process.env.NODE_ENV || 'development';
  const isCI = process.env.CI === 'true';
  
  let envConfig = failureHandlingConfig.environments.development;
  
  if (isCI) {
    envConfig = failureHandlingConfig.environments.ci;
  } else if (env === 'production') {
    envConfig = failureHandlingConfig.environments.production;
  }
  
  return {
    ...failureHandlingConfig.global,
    ...envConfig
  };
}

/**
 * Get configuration for specific test type
 */
export function getTestTypeConfig(testType) {
  return {
    ...getEnvironmentConfig(),
    ...failureHandlingConfig.testTypes[testType]
  };
}

/**
 * Check if notifications should be sent
 */
export function shouldSendNotifications() {
  const config = getEnvironmentConfig();
  return config.sendNotifications && failureHandlingConfig.notifications;
}

/**
 * Get notification configuration
 */
export function getNotificationConfig() {
  return failureHandlingConfig.notifications;
}

/**
 * Get reporting configuration
 */
export function getReportingConfig() {
  return failureHandlingConfig.reporting;
}

export default failureHandlingConfig;