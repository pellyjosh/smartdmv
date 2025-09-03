import { 
  hasUserPermission, 
  canSwitchPractices, 
  getUserAccessiblePractices,
  isUserSuperAdmin 
} from '@/lib/rbac/dynamic-roles';

async function testSuperAdminPermissions() {
  console.log('🧪 Testing SUPER_ADMIN permission system...');
  
  // Test with a hypothetical SUPER_ADMIN user ID
  const testUserId = '1'; // Adjust this to match an actual SUPER_ADMIN user in your system
  
  try {
    // Test 1: Check if user is super admin
    const isSuperAdmin = await isUserSuperAdmin(testUserId);
    console.log(`✅ Is Super Admin: ${isSuperAdmin}`);
    
    // Test 2: Check specific permissions
    const canManageUsers = await hasUserPermission(testUserId, 'users', 'MANAGE');
    console.log(`✅ Can manage users: ${canManageUsers}`);
    
    const canManageFinancials = await hasUserPermission(testUserId, 'financial_reports', 'READ');
    console.log(`✅ Can read financial reports: ${canManageFinancials}`);
    
    const canAccessTelemedicine = await hasUserPermission(testUserId, 'telemedicine', 'MANAGE');
    console.log(`✅ Can manage telemedicine: ${canAccessTelemedicine}`);
    
    // Test 3: Check practice switching
    const canSwitch = await canSwitchPractices(testUserId);
    console.log(`✅ Can switch practices: ${canSwitch}`);
    
    // Test 4: Get accessible practices
    const accessiblePractices = await getUserAccessiblePractices(testUserId);
    console.log(`✅ Accessible practices: ${JSON.stringify(accessiblePractices)}`);
    
    // Test 5: Check wildcard permissions
    const hasWildcardAccess = await hasUserPermission(testUserId, 'any_resource', 'any_action');
    console.log(`✅ Has wildcard access: ${hasWildcardAccess}`);
    
    console.log('🎉 All tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the tests
testSuperAdminPermissions()
  .then(() => {
    console.log('✅ SUPER_ADMIN permission tests completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ SUPER_ADMIN permission tests failed:', error);
    process.exit(1);
  });
