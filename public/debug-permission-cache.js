/**
 * Debug Permission Cache
 * Run this in browser console to diagnose permission caching issues
 * 
 * Usage:
 * 1. Open browser DevTools console
 * 2. Paste this entire script and press Enter
 * 3. It will check IndexedDB for permission cache
 */

(async function debugPermissionCache() {
  console.log('🔍 ========== PERMISSION CACHE DEBUG ==========');
  
  try {
    // Get all databases
    const databases = await indexedDB.databases();
    console.log(`\n📂 Found ${databases.length} databases:`, databases.map(d => d.name));
    
    // Find tenant databases
    const tenantDbs = databases.filter(db => db.name?.startsWith('SmartDMV_Tenant_'));
    
    if (tenantDbs.length === 0) {
      console.error('❌ No tenant databases found!');
      return;
    }
    
    console.log(`\n✅ Found ${tenantDbs.length} tenant database(s):`, tenantDbs.map(d => d.name));
    
    // Check each tenant database
    for (const dbInfo of tenantDbs) {
      console.log(`\n\n📊 ========== CHECKING: ${dbInfo.name} ==========`);
      
      // Open database
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open(dbInfo.name);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      console.log(`✅ Database opened - Version: ${db.version}`);
      console.log(`📋 Object stores (${db.objectStoreNames.length}):`, Array.from(db.objectStoreNames));
      
      // Check if permissions store exists
      if (!db.objectStoreNames.contains('permissions')) {
        console.error(`❌ 'permissions' store MISSING in ${dbInfo.name}!`);
        db.close();
        continue;
      }
      
      console.log(`✅ 'permissions' store EXISTS`);
      
      // Read permissions data
      const transaction = db.transaction(['permissions'], 'readonly');
      const store = transaction.objectStore('permissions');
      
      // Get store info
      console.log(`\n📊 Store details:`);
      console.log(`  - Key path: ${store.keyPath}`);
      console.log(`  - Auto increment: ${store.autoIncrement}`);
      console.log(`  - Index names:`, Array.from(store.indexNames));
      
      // Check indexes
      console.log(`\n🔍 Checking indexes:`);
      Array.from(store.indexNames).forEach(indexName => {
        const index = store.index(indexName);
        console.log(`  - ${indexName}: keyPath='${index.keyPath}', unique=${index.unique}`);
      });
      
      // Get all permission records
      const allRecords = await new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      console.log(`\n📦 Permission records found: ${allRecords.length}`);
      
      if (allRecords.length === 0) {
        console.warn(`⚠️  NO PERMISSION RECORDS CACHED!`);
        console.log(`\n💡 This means:`);
        console.log(`   1. User permissions were never cached during login`);
        console.log(`   2. Or they were cleared/expired`);
        console.log(`   3. Check browser console for [useOfflineInit] logs during login`);
      } else {
        console.log(`\n✅ Permission records:`);
        allRecords.forEach((record, index) => {
          console.log(`\n  Record ${index + 1}:`);
          console.log(`    - ID: ${record.id}`);
          console.log(`    - User ID: ${record.userId} (type: ${typeof record.userId})`);
          console.log(`    - Tenant ID: ${record.tenantId}`);
          console.log(`    - Practice ID: ${record.practiceId}`);
          console.log(`    - Roles (${record.roles?.length || 0}):`, record.roles?.map(r => r.name) || []);
          console.log(`    - Role Assignments: ${record.roleAssignments?.length || 0}`);
          console.log(`    - All Permissions: ${record.allPermissions?.length || 0}`);
          console.log(`    - Effective Permissions:`, Object.keys(record.effectivePermissions || {}));
          console.log(`    - Cached At: ${new Date(record.cachedAt).toLocaleString()}`);
          console.log(`    - Expires At: ${new Date(record.expiresAt).toLocaleString()}`);
          console.log(`    - Is Expired: ${record.expiresAt < Date.now()}`);
          
          // Show sample permissions
          if (record.roles && record.roles.length > 0) {
            console.log(`\n    📋 Role Details:`);
            record.roles.forEach(role => {
              console.log(`      - ${role.name} (${role.displayName || 'N/A'})`);
              console.log(`        Permissions: ${role.permissions?.length || 0}`);
              if (role.permissions && role.permissions.length > 0) {
                const samplePerms = role.permissions.slice(0, 5);
                console.log(`        Sample:`, samplePerms.map(p => `${p.resource}:${p.action}`));
              }
            });
          }
        });
      }
      
      db.close();
    }
    
    console.log(`\n\n✅ ========== DEBUG COMPLETE ==========\n`);
    console.log(`📝 Summary:`);
    console.log(`   - Tenant databases: ${tenantDbs.length}`);
    console.log(`   - Run this script after login to see if permissions are cached`);
    console.log(`   - Look for [useOfflineInit] logs in console during login`);
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
})();
