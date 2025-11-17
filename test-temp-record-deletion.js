// Test script to verify temp record deletion after sync
// Run this in the browser console to test the fix

async function testTempRecordDeletion() {
  console.log('🧪 Testing temp record deletion after sync...');

  try {
    // Import required modules
    const { saveEntity, getEntity, getAllEntities } = await import('./src/lib/offline/storage/entity-storage.js');
    const { performSync } = await import('./src/lib/offline/sync/sync-engine.ts');

    console.log('📝 Creating a test appointment with temp ID...');

    // Create a test appointment (this will get a temp ID)
    const testAppointment = {
      title: 'Test Temp Record Deletion',
      type: 'virtual',
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      durationMinutes: 30,
      petId: 1,
      clientId: 1,
      practitionerId: 1,
      practiceId: 1,
      notes: 'This should be deleted after sync',
      status: 'pending'
    };

    // Save to IndexedDB (will get temp ID)
    const saved = await saveEntity('appointments', testAppointment, 'pending');
    console.log('✅ Saved appointment:', saved);

    const tempId = saved.id;
    console.log('🆔 Temp ID:', tempId);

    // Verify it exists
    const retrieved = await getEntity('appointments', tempId);
    console.log('📖 Retrieved before sync:', retrieved);

    // Get all appointments to see current state
    const allBefore = await getAllEntities('appointments');
    console.log('📊 Appointments before sync:', allBefore.length);

    // Now simulate sync (this should delete the temp record)
    console.log('🔄 Performing sync...');
    const syncResult = await performSync();
    console.log('✅ Sync result:', syncResult);

    // Check if temp record was deleted
    const afterSync = await getEntity('appointments', tempId);
    console.log('📖 Retrieved temp record after sync (should be null):', afterSync);

    // Get all appointments after sync
    const allAfter = await getAllEntities('appointments');
    console.log('📊 Appointments after sync:', allAfter.length);

    // Check if the real record was pulled (should have the real ID from server)
    let realRecordFound = false;
    let realRecordId = null;
    if (syncResult.idMappings && syncResult.idMappings.length > 0) {
      const mapping = syncResult.idMappings.find(m => m.tempId === tempId);
      if (mapping) {
        realRecordId = mapping.realId;
        const realRecord = await getEntity('appointments', realRecordId);
        realRecordFound = !!realRecord;
        console.log('📖 Retrieved real record from server:', realRecord);
      }
    }

    const result = {
      tempId,
      realRecordId,
      existedBefore: !!retrieved,
      tempRecordDeleted: !afterSync,
      realRecordPulled: realRecordFound,
      syncSuccessful: syncResult.success,
      totalAppointmentsBefore: allBefore.length,
      totalAppointmentsAfter: allAfter.length,
      idMappings: syncResult.idMappings
    };

    console.log('🧪 Test result:', result);

    if (result.tempRecordDeleted && result.realRecordPulled) {
      console.log('🎉 SUCCESS: Temp record deleted AND real record pulled immediately!');
    } else if (result.tempRecordDeleted) {
      console.log('⚠️ PARTIAL SUCCESS: Temp record deleted, but real record not pulled yet');
    } else {
      console.log('❌ FAILURE: Temp record was not deleted after sync');
    }

    return result;

  } catch (error) {
    console.error('❌ Test failed:', error);
    return { success: false, error: error.message };
  }
}

// Run the test
testTempRecordDeletion().then(result => {
  console.log('🧪 Temp record deletion test completed:', result);
});

// Also export for manual calling
window.testTempRecordDeletion = testTempRecordDeletion;
