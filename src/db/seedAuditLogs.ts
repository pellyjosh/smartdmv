// Script to seed audit logs for testing
import { db } from '@/db';
import { auditLogs } from '@/db/schema';

const sampleAuditLogs = [
  {
    action: 'CREATE',
    recordType: 'PERMISSION_OVERRIDE',
    recordId: '1',
    description: 'Created permission override for user access',
    userId: '1',
    practiceId: '1',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    metadata: { module: 'permissions', level: 'admin' },
    changes: { before: null, after: { canAccess: true } }
  },
  {
    action: 'UPDATE',
    recordType: 'USER_ROLE_ASSIGNMENT',
    recordId: '2',
    description: 'Updated user role assignment',
    userId: '2',
    practiceId: '1',
    ipAddress: '192.168.1.101',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    metadata: { module: 'users', role: 'veterinarian' },
    changes: { before: { role: 'technician' }, after: { role: 'veterinarian' } }
  },
  {
    action: 'CREATE',
    recordType: 'SOAP_NOTE',
    recordId: '3',
    description: 'Created SOAP note for patient',
    userId: '3',
    practiceId: '1',
    ipAddress: '192.168.1.102',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1)',
    metadata: { patientId: '123', templateId: '456' },
    changes: { before: null, after: { noteId: '3', content: 'Patient examination completed' } }
  },
  {
    action: 'VIEW',
    recordType: 'LAB_RESULT',
    recordId: '4',
    description: 'Viewed lab results',
    userId: '1',
    practiceId: '1',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    metadata: { labId: '789', testType: 'blood_work' }
  },
  {
    action: 'DELETE',
    recordType: 'PERMISSION',
    recordId: '5',
    description: 'Deleted permission',
    userId: '2',
    practiceId: '1',
    ipAddress: '192.168.1.101',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    metadata: { permissionType: 'read_only' },
    changes: { before: { canRead: true }, after: null }
  }
];

export async function seedAuditLogs() {
  try {
    console.log('Seeding audit logs...');
    
    // Insert sample audit logs
    for (const logData of sampleAuditLogs) {
      await db.insert(auditLogs).values(logData);
    }
    
    console.log('✅ Audit logs seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding audit logs:', error);
  }
}

// Run the seeding if this file is executed directly
if (require.main === module) {
  seedAuditLogs().then(() => process.exit(0));
}
