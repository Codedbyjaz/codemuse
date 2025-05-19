import { db } from './db';
import { agents, locks } from '@shared/schema';

export async function seedDatabase() {
  console.log('Checking if seed data is needed...');
  
  // Check if agents table is empty
  const existingAgents = await db.select().from(agents);
  
  if (existingAgents.length === 0) {
    console.log('Seeding agents data...');
    
    // Insert initial agents
    await db.insert(agents).values([
      {
        agentId: "GPT-4",
        name: "GPT-4",
        type: "editor",
        status: "active",
        metadata: { canEdit: ["*.js"], maxChanges: 10 }
      },
      {
        agentId: "Claude",
        name: "Claude",
        type: "reviewer",
        status: "active",
        metadata: { canEdit: [], canComment: true }
      },
      {
        agentId: "Replit",
        name: "Replit AI",
        type: "editor",
        status: "inactive",
        metadata: { canEdit: ["*.py"], maxChanges: 15 }
      }
    ]);
    
    console.log('Agent seed data created successfully');
  } else {
    console.log(`Skipping agent seed data, found ${existingAgents.length} existing agents`);
  }
  
  // Check if locks table is empty
  const existingLocks = await db.select().from(locks);
  
  if (existingLocks.length === 0) {
    console.log('Seeding locks data...');
    
    // Insert initial locks
    await db.insert(locks).values([
      {
        filePath: "config/settings.json",
        pattern: null
      },
      {
        filePath: "main.py",
        pattern: "def delete_user\\("
      },
      {
        filePath: "routes.js",
        pattern: "app\\.delete\\("
      }
    ]);
    
    console.log('Locks seed data created successfully');
  } else {
    console.log(`Skipping locks seed data, found ${existingLocks.length} existing locks`);
  }
}