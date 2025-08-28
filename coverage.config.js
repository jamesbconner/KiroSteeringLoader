/**
 * Coverage Configuration
 * 
 * Centralized configuration for coverage reporting, quality gates, and thresholds
 */

module.exports = {
  // Coverage thresholds (85% as specified in requirements)
  thresholds: {
    global: {
      lines: 85,
      functions: 85,
      branches: 85,
      statements: 85
    },
    // Per-file thresholds can be more strict for critical files
    perFile: {
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80
    }
  },

  // Quality gate configuration
  qualityGate: {
    // Fail build if any threshold is not met
    enforceThresholds: true,
    
    // Allow small degradation in development (percentage points)
    developmentTolerance: 2,
    
    // Strict mode for CI/production
    strictMode: process.env.CI === 'true' || process.env.NODE_ENV === 'production',
    
    // Watermarks for coverage reporting colors
    watermarks: {
      statements: [85, 95],
      functions: [85, 95],
      branches: [85, 95],
      lines: [85, 95]
    }
  },

  // Reporting configuration
  reporting: {
    // Output formats
    formats: ['text', 'html', 'json', 'lcov', 'text-summary'],
    
    // Report directory
    directory: './coverage',
    
    // Generate detailed reports
    detailed: true,
    
    // Include source maps
    sourceMaps: true,
    
    // Clean reports directory before generating
    clean: true
  },

  // Trend analysis configuration
  trends: {
    // Keep trend data for this many days
    retentionDays: 90,
    
    // Maximum number of trend entries to keep
    maxEntries: 100,
    
    // Regression detection threshold (percentage points)
    regressionThreshold: 2,
    
    // Significant change threshold (percentage points)
    significantChangeThreshold: 1
  },

  // Dashboard configuration
  dashboard: {
    // Enable interactive dashboard
    enabled: true,
    
    // Dashboard title
    title: 'Kiro Steering Loader - Coverage Dashboard',
    
    // Auto-refresh interval (seconds)
    refreshInterval: 30,
    
    // Show trend charts
    showTrends: true,
    
    // Chart configuration
    charts: {
      // Number of data points to show in trends
      maxDataPoints: 30,
      
      // Chart colors
      colors: {
        lines: '#3498db',
        functions: '#2ecc71',
        branches: '#f39c12',
        statements: '#9b59b6'
      }
    }
  },

  // File inclusion/exclusion patterns
  files: {
    // Include patterns
    include: [
      'src/**/*.ts',
      'src/**/*.js'
    ],
    
    // Exclude patterns
    exclude: [
      'node_modules/**',
      'out/**',
      'tests/**',
      '**/*.d.ts',
      '**/*.test.ts',
      '**/*.spec.ts',
      'coverage/**',
      '.vscode-test/**',
      'scripts/**',
      '**/*.config.js',
      '**/*.config.ts'
    ]
  },

  // CI/CD integration
  ci: {
    // Fail build on coverage regression
    failOnRegression: true,
    
    // Upload to external services
    uploadToCodecov: true,
    
    // Generate coverage badges
    generateBadges: true,
    
    // Post PR comments
    postPRComments: true,
    
    // Artifact retention (days)
    artifactRetention: 30
  },

  // Notification configuration
  notifications: {
    // Enable notifications
    enabled: process.env.CI === 'true',
    
    // Notification channels
    channels: {
      // Slack webhook (if configured)
      slack: process.env.SLACK_WEBHOOK_URL,
      
      // Email notifications (if configured)
      email: process.env.NOTIFICATION_EMAIL,
      
      // GitHub status checks
      github: true
    },
    
    // When to send notifications
    triggers: {
      // On coverage regression
      onRegression: true,
      
      // On quality gate failure
      onQualityGateFailure: true,
      
      // On significant improvement
      onImprovement: true,
      
      // Daily summary
      dailySummary: false
    }
  }
};