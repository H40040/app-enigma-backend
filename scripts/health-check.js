#!/usr/bin/env node

/**
 * Health Check Script for Production Monitoring
 * Verifies database connectivity, API endpoints, and system resources
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const http = require('http');
const https = require('https');
const fs = require('fs');
const os = require('os');

const prisma = new PrismaClient();

class HealthChecker {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      checks: {}
    };
  }

  async checkDatabase() {
    try {
      await prisma.$queryRaw`SELECT 1`;
      this.results.checks.database = {
        status: 'healthy',
        message: 'Database connection successful'
      };
    } catch (error) {
      this.results.checks.database = {
        status: 'unhealthy',
        message: `Database connection failed: ${error.message}`
      };
      this.results.status = 'unhealthy';
    }
  }

  async checkAPI() {
    return new Promise((resolve) => {
      const port = process.env.PORT || 4006;
      const protocol = process.env.NODE_ENV === 'production' ? https : http;
      const hostname = process.env.NODE_ENV === 'production' ? 'localhost' : 'localhost';
      
      const req = protocol.request({
        hostname,
        port,
        path: '/api/health',
        method: 'GET',
        timeout: 5000
      }, (res) => {
        if (res.statusCode === 200) {
          this.results.checks.api = {
            status: 'healthy',
            message: 'API endpoint responding'
          };
        } else {
          this.results.checks.api = {
            status: 'unhealthy',
            message: `API returned status ${res.statusCode}`
          };
          this.results.status = 'unhealthy';
        }
        resolve();
      });

      req.on('error', (error) => {
        this.results.checks.api = {
          status: 'unhealthy',
          message: `API request failed: ${error.message}`
        };
        this.results.status = 'unhealthy';
        resolve();
      });

      req.on('timeout', () => {
        this.results.checks.api = {
          status: 'unhealthy',
          message: 'API request timed out'
        };
        this.results.status = 'unhealthy';
        req.destroy();
        resolve();
      });

      req.end();
    });
  }

  checkSystemResources() {
    const memoryUsage = process.memoryUsage();
    const systemMemory = os.totalmem();
    const freeMemory = os.freemem();
    const cpuUsage = os.loadavg();
    
    const memoryUsagePercent = ((memoryUsage.heapUsed / systemMemory) * 100).toFixed(2);
    const systemMemoryUsagePercent = (((systemMemory - freeMemory) / systemMemory) * 100).toFixed(2);
    
    this.results.checks.memory = {
      status: memoryUsagePercent < 80 ? 'healthy' : 'warning',
      heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      systemUsage: `${systemMemoryUsagePercent}%`,
      processUsage: `${memoryUsagePercent}%`
    };
    
    this.results.checks.cpu = {
      status: cpuUsage[0] < 2 ? 'healthy' : 'warning',
      loadAverage: cpuUsage,
      cores: os.cpus().length
    };
    
    if (memoryUsagePercent > 90 || cpuUsage[0] > 4) {
      this.results.status = 'unhealthy';
    }
  }

  checkDiskSpace() {
    try {
      const stats = fs.statSync('.');
      this.results.checks.disk = {
        status: 'healthy',
        message: 'Disk accessible'
      };
    } catch (error) {
      this.results.checks.disk = {
        status: 'unhealthy',
        message: `Disk check failed: ${error.message}`
      };
      this.results.status = 'unhealthy';
    }
  }

  checkEnvironmentVariables() {
    const requiredEnvVars = [
      'JWT_SECRET',
      'REFRESH_TOKEN_SECRET',
      'DATABASE_URL',
      'COOKIE_SECRET'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length === 0) {
      this.results.checks.environment = {
        status: 'healthy',
        message: 'All required environment variables are set'
      };
    } else {
      this.results.checks.environment = {
        status: 'unhealthy',
        message: `Missing environment variables: ${missingVars.join(', ')}`
      };
      this.results.status = 'unhealthy';
    }
  }

  async runAllChecks() {
    console.log('🏥 Running health checks...');
    
    await this.checkDatabase();
    await this.checkAPI();
    this.checkSystemResources();
    this.checkDiskSpace();
    this.checkEnvironmentVariables();
    
    return this.results;
  }

  async cleanup() {
    await prisma.$disconnect();
  }
}

// Main execution
async function main() {
  const healthChecker = new HealthChecker();
  
  try {
    const results = await healthChecker.runAllChecks();
    
    // Output results
    console.log('\n📊 Health Check Results:');
    console.log('========================');
    console.log(`Overall Status: ${results.status.toUpperCase()}`);
    console.log(`Timestamp: ${results.timestamp}`);
    console.log('\nDetailed Checks:');
    
    Object.entries(results.checks).forEach(([check, result]) => {
      const statusIcon = result.status === 'healthy' ? '✅' : 
                        result.status === 'warning' ? '⚠️' : '❌';
      console.log(`${statusIcon} ${check}: ${result.status}`);
      if (result.message) {
        console.log(`   ${result.message}`);
      }
      if (result.heapUsed) {
        console.log(`   Heap: ${result.heapUsed} / ${result.heapTotal}`);
        console.log(`   System Memory: ${result.systemUsage}`);
      }
      if (result.loadAverage) {
        console.log(`   Load Average: ${result.loadAverage.map(l => l.toFixed(2)).join(', ')}`);
        console.log(`   CPU Cores: ${result.cores}`);
      }
    });
    
    // Exit with appropriate code
    process.exit(results.status === 'healthy' ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    process.exit(1);
  } finally {
    await healthChecker.cleanup();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Health check interrupted');
  await prisma.$disconnect();
  process.exit(1);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Health check terminated');
  await prisma.$disconnect();
  process.exit(1);
});

if (require.main === module) {
  main();
}

module.exports = HealthChecker;