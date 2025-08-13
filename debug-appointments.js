// Debug script to check appointments table in PostgreSQL
const { config } = require('dotenv');
config();

const { neon } = require('@neondatabase/serverless');

async function checkAppointments() {
  try {
    const sql = neon(process.env.POSTGRES_URL);
    
    console.log('🔍 Checking appointments table structure...');
    
    // Get table structure
    const structure = await sql`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'appointments' 
      ORDER BY ordinal_position;
    `;
    
    console.log('\n📋 Appointments table structure:');
    console.table(structure);
    
    // Get sample data
    console.log('\n📊 Sample appointments data:');
    const appointments = await sql`
      SELECT id, title, date, status, pet_id, client_id, practitioner_id, practice_id
      FROM appointments 
      LIMIT 10;
    `;
    
    console.table(appointments);
    
    // Check pets for reference
    console.log('\n🐕 Available pets:');
    const pets = await sql`
      SELECT id, name, species 
      FROM pets 
      LIMIT 10;
    `;
    
    console.table(pets);
    
    // Check appointments for specific pets
    console.log('\n🔗 Appointments with pet details:');
    const appointmentsWithPets = await sql`
      SELECT 
        a.id as appointment_id,
        a.title,
        a.date,
        a.status,
        a.pet_id,
        p.name as pet_name,
        p.species
      FROM appointments a
      LEFT JOIN pets p ON a.pet_id = p.id
      LIMIT 10;
    `;
    
    console.table(appointmentsWithPets);
    
  } catch (error) {
    console.error('❌ Error checking appointments:', error);
  }
}

checkAppointments();
