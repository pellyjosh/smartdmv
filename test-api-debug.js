console.log('Testing API endpoints...');

// Test the user assignments API endpoint
async function testUserAssignments() {
  try {
    console.log('Testing /api/user-assignments...');
    const response = await fetch('/api/user-assignments?practiceId=1');
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    const data = await response.json();
    console.log('User assignments data:', data);
  } catch (error) {
    console.error('Error testing user assignments:', error);
  }
}

// Test the permission overrides API endpoint
async function testPermissionOverrides() {
  try {
    console.log('Testing /api/permission-overrides...');
    const response = await fetch('/api/permission-overrides?practiceId=1');
    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('Permission overrides data:', data);
  } catch (error) {
    console.error('Error testing permission overrides:', error);
  }
}

// Test the roles API endpoint  
async function testRoles() {
  try {
    console.log('Testing /api/roles...');
    const response = await fetch('/api/roles?practiceId=1');
    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('Roles data:', data);
  } catch (error) {
    console.error('Error testing roles:', error);
  }
}

// Run tests
if (typeof window !== 'undefined') {
  // Client-side testing
  testUserAssignments();
  testPermissionOverrides();  
  testRoles();
} else {
  console.log('This script should be run in the browser console');
}
