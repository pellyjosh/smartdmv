import { getCurrentTenantDb } from './src/lib/tenant-db-resolver';

async function seedTaxRatesData() {
  try {
    const tenantDb = await getCurrentTenantDb();
    
    console.log('Seeding tax rates sample data...');
    
    // Get all practices that don't have tax rates yet
    const practicesWithoutTaxRates = await tenantDb.execute(`
      SELECT p.id, p.name 
      FROM practices p 
      LEFT JOIN tax_rates tr ON p.id = tr.practice_id 
      WHERE tr.id IS NULL
    `);
    
    for (const practice of practicesWithoutTaxRates.rows) {
      const practiceId = practice[0];
      const practiceName = practice[1];
      
      // Create a default general sales tax
      await tenantDb.execute(`
        INSERT INTO tax_rates (practice_id, name, rate, type, is_default, active)
        VALUES (?, 'General Sales Tax', '8.25', 'percentage', 'yes', 'yes')
      `, [practiceId]);
      
      console.log(`Created default tax rate for practice: ${practiceName} (ID: ${practiceId})`);
    }
    
    console.log('Tax rates seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding tax rates:', error);
    process.exit(1);
  }
}

seedTaxRatesData();
