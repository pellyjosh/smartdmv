// fix-prescription-sequences.mjs
// Run this script to fix the auto-incrementing sequences for prescriptions

import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

config();

async function fixSequences() {
  const sql = neon(process.env.POSTGRES_URL);
  
  try {
    console.log('🔧 Fixing prescription sequences...');
    
    // Create sequences if they don't exist
    await sql`CREATE SEQUENCE IF NOT EXISTS prescriptions_id_seq;`;
    await sql`CREATE SEQUENCE IF NOT EXISTS prescription_history_id_seq;`;
    
    console.log('✅ Sequences created');
    
    // Set the sequences to start from the current max ID + 1
    await sql`SELECT setval('prescriptions_id_seq', COALESCE((SELECT MAX(id) FROM prescriptions), 0) + 1, false);`;
    await sql`SELECT setval('prescription_history_id_seq', COALESCE((SELECT MAX(id) FROM prescription_history), 0) + 1, false);`;
    
    console.log('✅ Sequence values set');
    
    // Alter the tables to use the sequences as default
    await sql`ALTER TABLE prescriptions ALTER COLUMN id SET DEFAULT nextval('prescriptions_id_seq');`;
    await sql`ALTER TABLE prescription_history ALTER COLUMN id SET DEFAULT nextval('prescription_history_id_seq');`;
    
    console.log('✅ Default values set');
    
    // Set the sequences to be owned by the columns
    await sql`ALTER SEQUENCE prescriptions_id_seq OWNED BY prescriptions.id;`;
    await sql`ALTER SEQUENCE prescription_history_id_seq OWNED BY prescription_history.id;`;
    
    console.log('✅ Sequence ownership set');
    console.log('🎉 Prescription sequences fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing sequences:', error);
  }
  
  process.exit(0);
}

fixSequences();
