/**
 * Test script to verify appointment auto-update logic and filtering
 */

// Test data
const mockAppointments = [
  {
    id: '1',
    date: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    status: 'pending',
    pet: ['1', 'Max'],
    practitionerId: '1'
  },
  {
    id: '2', 
    date: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    status: 'scheduled',
    pet: ['2', 'Luna'],
    practitionerId: '1'
  },
  {
    id: '3',
    date: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day ahead
    status: 'pending',
    pet: ['3', 'Rocky'],
    practitionerId: '1'
  },
  {
    id: '4',
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
    status: 'cancelled',
    pet: ['4', 'Bella'],
    practitionerId: '1'
  },
  {
    id: '5',
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    status: 'completed',
    pet: ['5', 'Charlie'],
    practitionerId: '1'
  }
];

// Test auto-update logic
function needsAutoUpdate(appointment) {
  const appointmentDate = new Date(appointment.date);
  const currentTime = new Date();
  const isPastDate = appointmentDate < currentTime;
  return (
    (appointment.status === 'pending' && isPastDate) ||
    (appointment.status === 'scheduled' && isPastDate)
  );
}

function getExpectedUpdate(appointment) {
  const appointmentDate = new Date(appointment.date);
  const currentTime = new Date();
  const isPastDate = appointmentDate < currentTime;
  
  if (appointment.status === 'pending' && isPastDate) {
    return 'cancelled';
  } else if (appointment.status === 'scheduled' && isPastDate) {
    return 'no_show';
  }
  return null;
}

// Test filtering logic
function filterUpcoming(appointments) {
  return appointments.filter(apt => {
    const appointmentDate = new Date(apt.date);
    const currentTime = new Date();
    return (apt.status === 'scheduled' || apt.status === 'pending') && appointmentDate > currentTime;
  });
}

function filterPending(appointments) {
  return appointments.filter(apt => 
    apt.status === 'pending' && new Date(apt.date) < new Date()
  );
}

function filterCancelled(appointments) {
  return appointments.filter(apt => apt.status === 'cancelled');
}

function filterPast(appointments) {
  return appointments.filter(apt => {
    const appointmentDate = new Date(apt.date);
    const currentDate = new Date();
    return appointmentDate < currentDate && 
           apt.status !== 'pending' && 
           apt.status !== 'cancelled';
  });
}

// Run tests
console.log('🧪 Testing Appointment Auto-Update Logic');
console.log('='.repeat(50));

mockAppointments.forEach(appointment => {
  const needsUpdate = needsAutoUpdate(appointment);
  const expectedNewStatus = getExpectedUpdate(appointment);
  
  console.log(`\nAppointment ${appointment.id} (${appointment.pet[1]}):`);
  console.log(`  Current Status: ${appointment.status}`);
  console.log(`  Date: ${appointment.date.toLocaleString()}`);
  console.log(`  Needs Update: ${needsUpdate}`);
  if (expectedNewStatus) {
    console.log(`  Expected New Status: ${expectedNewStatus}`);
  }
});

console.log('\n\n🧪 Testing Appointment Filtering Logic');
console.log('='.repeat(50));

const upcoming = filterUpcoming(mockAppointments);
const pending = filterPending(mockAppointments);
const cancelled = filterCancelled(mockAppointments);
const past = filterPast(mockAppointments);

console.log(`\nUpcoming Appointments (${upcoming.length}):`);
upcoming.forEach(apt => console.log(`  - ${apt.pet[1]} (${apt.status}) - ${apt.date.toLocaleDateString()}`));

console.log(`\nPending Approval (${pending.length}):`);
pending.forEach(apt => console.log(`  - ${apt.pet[1]} (${apt.status}) - ${apt.date.toLocaleDateString()}`));

console.log(`\nCancelled Appointments (${cancelled.length}):`);
cancelled.forEach(apt => console.log(`  - ${apt.pet[1]} (${apt.status}) - ${apt.date.toLocaleDateString()}`));

console.log(`\nPast Appointments (${past.length}):`);
past.forEach(apt => console.log(`  - ${apt.pet[1]} (${apt.status}) - ${apt.date.toLocaleDateString()}`));

console.log('\n✅ Test completed!');
