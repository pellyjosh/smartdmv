// Test script to manually trigger sync engine
// Run this in the browser console to test sync functionality

async function testSyncEngine() {
  console.log('🧪 Testing sync engine...');

  try {
    // Import the sync functions
    const { performSync } = await import('./src/lib/offline/sync/sync-engine.ts');

    console.log('📡 Calling performSync()...');
    const result = await performSync();

    console.log('✅ Sync result:', result);

    if (result && result.success) {
      console.log('🎉 Sync successful!');
      console.log(`📊 Synced: ${result.synced}, Failed: ${result.failed}, Conflicts: ${result.conflicts}`);
    } else {
      console.log('❌ Sync failed or returned null');
    }

    return result;

  } catch (error) {
    console.error('❌ Sync test failed:', error);
    return { success: false, error: error.message };
  }
}

// Run the test
testSyncEngine().then(result => {
  console.log('🧪 Sync test completed:', result);
});

// Also export for manual calling
window.testSyncEngine = testSyncEngine;
