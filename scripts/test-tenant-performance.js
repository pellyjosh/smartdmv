#!/usr/bin/env node

// Performance test script for tenant validation optimization
const { performance } = require('perf_hooks');

async function testTenantResolution(subdomain, iterations = 10) {
  const baseUrl = 'http://localhost:9002';
  const times = [];
  
  console.log(`\n🧪 Testing tenant resolution for: ${subdomain}`);
  console.log(`📊 Running ${iterations} iterations...\n`);
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    
    try {
      const response = await fetch(`${baseUrl}/api/tenant/resolve-optimized`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: subdomain,
          type: 'domain'
        })
      });
      
      await response.json();
      const end = performance.now();
      const duration = end - start;
      times.push(duration);
      
      const cacheHit = response.headers.get('x-tenant-cache-hit') === 'true';
      const emoji = cacheHit ? '⚡' : '🔍';
      console.log(`${emoji} Iteration ${i + 1}: ${duration.toFixed(2)}ms ${cacheHit ? '(cached)' : '(db query)'}`);
      
    } catch (error) {
      console.error(`❌ Iteration ${i + 1} failed:`, error.message);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Calculate statistics
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  const p95 = times.sort((a, b) => a - b)[Math.ceil(times.length * 0.95) - 1];
  
  console.log('\n📈 Performance Summary:');
  console.log(`   Average: ${avg.toFixed(2)}ms`);
  console.log(`   Minimum: ${min.toFixed(2)}ms`);
  console.log(`   Maximum: ${max.toFixed(2)}ms`);
  console.log(`   95th percentile: ${p95.toFixed(2)}ms`);
  
  return { avg, min, max, p95, times };
}

async function compareTenantAPIs(subdomain) {
  console.log('\n🔬 Comparing OLD vs NEW tenant resolution APIs\n');
  
  // Test old API
  console.log('Testing OLD API (/api/tenant/resolve):');
  const oldResults = await testTenantResolution(subdomain, 5, '/api/tenant/resolve');
  
  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test new API
  console.log('\nTesting NEW API (/api/tenant/resolve-optimized):');
  const newResults = await testTenantResolution(subdomain, 5, '/api/tenant/resolve-optimized');
  
  // Compare results
  console.log('\n🏆 Performance Comparison:');
  console.log(`Old API Average: ${oldResults.avg.toFixed(2)}ms`);
  console.log(`New API Average: ${newResults.avg.toFixed(2)}ms`);
  
  const improvement = ((oldResults.avg - newResults.avg) / oldResults.avg * 100);
  if (improvement > 0) {
    console.log(`🚀 Improvement: ${improvement.toFixed(1)}% faster!`);
  } else {
    console.log(`⚠️  Change: ${Math.abs(improvement).toFixed(1)}% slower`);
  }
}

// Usage examples
async function runTests() {
  console.log('🚀 Tenant Resolution Performance Test');
  console.log('====================================');
  
  const subdomain = process.argv[2] || 'smartvet';
  
  try {
    await testTenantResolution(subdomain, 10);
    
    // Test cache effectiveness
    console.log('\n🧲 Testing Cache Effectiveness:');
    console.log('Running 5 more requests to see cache hits...');
    await testTenantResolution(subdomain, 5);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run if called directly
if (require.main === module) {
  runTests();
}

module.exports = { testTenantResolution, compareTenantAPIs };
