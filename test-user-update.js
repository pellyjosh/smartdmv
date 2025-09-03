#!/usr/bin/env node

// Test user update after fixing date handling
const testUserUpdate = async () => {
  try {
    console.log('Testing user update API...');
    
    // First, get all users to find one to update
    const listResponse = await fetch('http://localhost:3000/api/users', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!listResponse.ok) {
      throw new Error(`Failed to list users: ${listResponse.status} ${listResponse.statusText}`);
    }
    
    const users = await listResponse.json();
    console.log(`Found ${users.length} users`);
    
    if (users.length === 0) {
      console.log('No users found to test with');
      return;
    }
    
    const testUser = users[0];
    console.log(`Testing update on user: ${testUser.id} (${testUser.email})`);
    
    // Test updating the user's name
    const updateData = {
      name: `Updated Name ${Date.now()}`,
      phone: '555-0123'
    };
    
    const updateResponse = await fetch(`http://localhost:3000/api/users/${testUser.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });
    
    if (!updateResponse.ok) {
      const errorData = await updateResponse.text();
      throw new Error(`Failed to update user: ${updateResponse.status} ${updateResponse.statusText}\n${errorData}`);
    }
    
    const updatedUser = await updateResponse.json();
    console.log('User updated successfully:');
    console.log(`- Name: ${updatedUser.name}`);
    console.log(`- Phone: ${updatedUser.phone}`);
    console.log(`- Updated At: ${updatedUser.updatedAt}`);
    
  } catch (error) {
    console.error('Test failed:', error.message);
    process.exit(1);
  }
};

testUserUpdate();
