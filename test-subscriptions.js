import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { practiceAddons, addons } from './src/db/schema.ts';

// Create database connection
const sqlite = new Database('./drizzle/main.db');
const db = drizzle(sqlite);

async function checkSubscriptions() {
  try {
    console.log('=== Checking all practice addons ===');
    
    // Get all practice addons with addon details
    const allSubscriptions = await db.query.practiceAddons.findMany({
      with: {
        addon: {
          columns: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });
    
    console.log(`Found ${allSubscriptions.length} total subscriptions:`);
    allSubscriptions.forEach((sub, index) => {
      console.log(`${index + 1}. Practice ID: ${sub.practiceId}, Addon: ${sub.addon?.name} (${sub.addon?.slug}), Active: ${sub.isActive}, Payment: ${sub.paymentStatus}`);
    });
    
    console.log('\n=== Checking active subscriptions for practice ID 1 ===');
    const practice1Subscriptions = allSubscriptions.filter(sub => 
      sub.practiceId === 1 && sub.isActive === true
    );
    
    console.log(`Found ${practice1Subscriptions.length} active subscriptions for practice 1:`);
    practice1Subscriptions.forEach((sub, index) => {
      console.log(`${index + 1}. Addon: ${sub.addon?.name} (ID: ${sub.addonId}, Slug: ${sub.addon?.slug})`);
    });
    
  } catch (error) {
    console.error('Error checking subscriptions:', error);
  } finally {
    sqlite.close();
  }
}

checkSubscriptions();
