// Quick test to create a past scheduled appointment that should trigger auto-update
async function testAutoUpdate() {
  try {
    // Create a test appointment in the past with 'scheduled' status
    const testDate = new Date();
    testDate.setHours(testDate.getHours() - 1); // 1 hour ago

    const response = await fetch('/api/appointments/client', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        title: 'Test Auto-Update Appointment',
        date: testDate.toISOString(),
        petId: 1, // Using existing pet ID
        type: 'in-person',
        description: 'Test appointment for auto-update functionality'
      })
    });

    if (response.ok) {
      const appointment = await response.json();
      console.log('✅ Test appointment created:', appointment);
      
      // Now manually set it to 'scheduled' status to trigger auto-update
      const updateResponse = await fetch(`/api/appointments/client?id=${appointment.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          status: 'scheduled'
        })
      });

      if (updateResponse.ok) {
        console.log('✅ Test appointment set to scheduled status');
        console.log('🔄 Now refresh the page to see auto-update in action!');
      }
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run in browser console: testAutoUpdate()
console.log('🧪 Auto-update test function ready. Run: testAutoUpdate()');
