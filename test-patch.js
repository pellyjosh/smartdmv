// Quick test script for PATCH endpoint
const testPatch = async () => {
  const testData = {
    name: 'Updated Checklist Name',
    priority: 'high',
    status: 'in_progress',
    notes: 'Test notes from script',
    dueDate: new Date().toISOString(),
    assignedToId: 5,
    soapNoteId: null
  };

  console.log('Testing PATCH with data:', JSON.stringify(testData, null, 2));

  try {
    const response = await fetch('http://localhost:9002/api/assigned-checklists/1', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        // Add auth headers if needed
      },
      body: JSON.stringify(testData)
    });

    console.log('Response status:', response.status);
    const result = await response.json();
    console.log('Response body:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Test failed:', error);
  }
};

testPatch();
