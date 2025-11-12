// Test script to verify offline appointment creation
// Run this in the browser console when offline

async function testOfflineAppointmentCreation() {
  console.log('🧪 Testing offline appointment creation...');

  try {
    // Check if we're offline
    const isOnline = navigator.onLine;
    console.log('📶 Network status:', isOnline ? 'Online' : 'Offline');

    // Try to create an appointment using the hook
    const testAppointment = {
      title: 'Test Offline Appointment',
      type: 'virtual',
      date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      durationMinutes: '30',
      petId: '1',
      practitionerId: '1',
      practiceId: '1',
      notes: 'Test appointment created offline',
      status: 'pending'
    };

    console.log('📝 Test appointment data:', testAppointment);

    // Import the appointments hook (this might not work in a simple script)
    // For now, let's test the storage manager directly
    const { storageManager } = await import('./src/lib/offline/managers/storage-manager.js');

    console.log('💾 Testing storage manager save...');
    const saved = await storageManager.saveEntity('appointments', testAppointment, 'pending');
    console.log('✅ Appointment saved to IndexedDB:', saved);

    // Try to retrieve it
    const retrieved = await storageManager.getEntity('appointments', saved.id);
    console.log('📖 Retrieved appointment:', retrieved);

    return { success: true, saved, retrieved };

  } catch (error) {
    console.error('❌ Test failed:', error);
    return { success: false, error: error.message };
  }
}

// Run the test
testOfflineAppointmentCreation().then(result => {
  console.log('🧪 Test result:', result);
});
