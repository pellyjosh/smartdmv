/**
 * Clean up invalid IndexedDB stores
 * Run this in browser console to remove stores with NaN or undefined in their names
 * 
 * Usage:
 * 1. Open browser DevTools console
 * 2. Paste this entire script and press Enter
 * 3. It will automatically find and clean up invalid stores
 */

(async function cleanupInvalidStores() {
  console.log('🔍 Scanning for invalid IndexedDB stores...');
  
  try {
    // Get all databases
    const databases = await indexedDB.databases();
    console.log(`Found ${databases.length} databases`);
    
    let totalCleaned = 0;
    
    for (const dbInfo of databases) {
      if (!dbInfo.name?.startsWith('SmartDMV_Tenant_')) continue;
      
      console.log(`\n📂 Checking database: ${dbInfo.name}`);
      
      // Open database
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open(dbInfo.name);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      const invalidStores = [];
      const storeNames = Array.from(db.objectStoreNames);
      
      // Find invalid stores
      for (const storeName of storeNames) {
        if (storeName.includes('_NaN_') || 
            storeName.includes('_undefined_') ||
            storeName.includes('practice_NaN') ||
            storeName.includes('practice_undefined')) {
          invalidStores.push(storeName);
        }
      }
      
      db.close();
      
      if (invalidStores.length === 0) {
        console.log('✅ No invalid stores found');
        continue;
      }
      
      console.log(`⚠️  Found ${invalidStores.length} invalid stores:`, invalidStores);
      
      // Delete and recreate database to remove invalid stores
      console.log('🗑️  Deleting database to clean up...');
      await new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(dbInfo.name);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        request.onblocked = () => {
          console.warn('⚠️  Delete blocked. Close all other tabs using this database.');
          reject(new Error('Delete blocked'));
        };
      });
      
      console.log('✅ Database cleaned up successfully');
      totalCleaned += invalidStores.length;
    }
    
    if (totalCleaned > 0) {
      console.log(`\n✅ Cleanup complete! Removed ${totalCleaned} invalid stores.`);
      console.log('🔄 Refresh the page to reinitialize databases with correct stores.');
    } else {
      console.log('\n✅ All databases are clean! No invalid stores found.');
    }
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    console.log('💡 Try closing other tabs and running this script again.');
  }
})();
