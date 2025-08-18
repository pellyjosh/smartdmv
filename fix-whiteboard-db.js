#!/usr/bin/env node

/**
 * Script to manually add the missing position column to whiteboard_items table
 * This bypasses the Drizzle CLI issues with Neon connectivity
 */

import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();

async function fixWhiteboardSchema() {
  const sql = neon(process.env.POSTGRES_URL);
  
  try {
    console.log('🔌 Connecting to Neon database...');
    
    // Check if position column exists
    const columnCheck = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'whiteboard_items' 
      AND column_name = 'position'
    `;
    
    if (columnCheck.length > 0) {
      console.log('✅ Position column already exists in whiteboard_items table');
      return;
    }
    
    console.log('➕ Adding position column to whiteboard_items table...');
    
    // Add the position column
    await sql`
      ALTER TABLE whiteboard_items 
      ADD COLUMN position INTEGER DEFAULT 0
    `;
    
    console.log('✅ Position column added successfully!');
    
    // Update existing records with position values
    console.log('🔄 Updating existing records with position values...');
    
    await sql`
      UPDATE whiteboard_items 
      SET position = id 
      WHERE position = 0
    `;
    
    console.log('✅ Existing records updated with position values');
    console.log('🎉 Whiteboard schema fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing whiteboard schema:', error);
    process.exit(1);
  }
}

fixWhiteboardSchema().catch(console.error);
