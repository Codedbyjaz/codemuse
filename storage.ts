import {
  agents, Agent, InsertAgent,
  changes, Change, InsertChange,
  locks, Lock, InsertLock,
  rateLimits, RateLimit, InsertRateLimit,
  fingerprints, Fingerprint, InsertFingerprint,
  users, User, InsertUser,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

// Modify the interface with any CRUD methods
// you might need
export interface IStorage {
  // Original user methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Agent methods
  getAgents(): Promise<Agent[]>;
  getAgent(id: number): Promise<Agent | undefined>;
  getAgentByAgentId(agentId: string): Promise<Agent | undefined>;
  createAgent(agent: InsertAgent): Promise<Agent>;
  updateAgent(id: number, agent: Partial<Agent>): Promise<Agent | undefined>;
  deleteAgent(id: number): Promise<boolean>;
  
  // Change methods
  getChanges(filters?: { agentId?: string, status?: string }): Promise<Change[]>;
  getChange(id: number): Promise<Change | undefined>;
  createChange(change: InsertChange): Promise<Change>;
  updateChange(id: number, change: Partial<Change>): Promise<Change | undefined>;
  deleteChange(id: number): Promise<boolean>;
  
  // Lock methods
  getLocks(): Promise<Lock[]>;
  getLock(id: number): Promise<Lock | undefined>;
  getLockByFilePath(filePath: string): Promise<Lock | undefined>;
  createLock(lock: InsertLock): Promise<Lock>;
  deleteLock(id: number): Promise<boolean>;
  
  // Rate limit methods
  getRateLimits(agentId: string): Promise<RateLimit[]>;
  createRateLimit(rateLimit: InsertRateLimit): Promise<RateLimit>;
  updateRateLimit(id: number, rateLimit: Partial<RateLimit>): Promise<RateLimit | undefined>;
  deleteRateLimit(id: number): Promise<boolean>;
  
  // Fingerprint methods
  getFingerprints(): Promise<Fingerprint[]>;
  getFingerprintByFilePath(filePath: string): Promise<Fingerprint | undefined>;
  createFingerprint(fingerprint: InsertFingerprint): Promise<Fingerprint>;
  updateFingerprint(id: number, fingerprint: Partial<Fingerprint>): Promise<Fingerprint | undefined>;
  deleteFingerprint(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Agent methods
  async getAgents(): Promise<Agent[]> {
    return await db.select().from(agents);
  }

  async getAgent(id: number): Promise<Agent | undefined> {
    const [agent] = await db.select().from(agents).where(eq(agents.id, id));
    return agent;
  }

  async getAgentByAgentId(agentId: string): Promise<Agent | undefined> {
    const [agent] = await db.select().from(agents).where(eq(agents.agentId, agentId));
    return agent;
  }

  async createAgent(insertAgent: InsertAgent): Promise<Agent> {
    const [agent] = await db.insert(agents).values(insertAgent).returning();
    return agent;
  }

  async updateAgent(id: number, agentUpdate: Partial<Agent>): Promise<Agent | undefined> {
    const [updatedAgent] = await db
      .update(agents)
      .set(agentUpdate)
      .where(eq(agents.id, id))
      .returning();
    return updatedAgent;
  }

  async deleteAgent(id: number): Promise<boolean> {
    const [deletedAgent] = await db
      .delete(agents)
      .where(eq(agents.id, id))
      .returning();
    return !!deletedAgent;
  }

  // Change methods
  async getChanges(filters?: { agentId?: string, status?: string }): Promise<Change[]> {
    if (filters) {
      if (filters.agentId && filters.status) {
        return await db.select()
          .from(changes)
          .where(and(
            eq(changes.agentId, filters.agentId),
            eq(changes.status, filters.status)
          ))
          .orderBy(desc(changes.createdAt));
      } else if (filters.agentId) {
        return await db.select()
          .from(changes)
          .where(eq(changes.agentId, filters.agentId))
          .orderBy(desc(changes.createdAt));
      } else if (filters.status) {
        return await db.select()
          .from(changes)
          .where(eq(changes.status, filters.status))
          .orderBy(desc(changes.createdAt));
      }
    }
    
    return await db.select()
      .from(changes)
      .orderBy(desc(changes.createdAt));
  }

  async getChange(id: number): Promise<Change | undefined> {
    const [change] = await db.select().from(changes).where(eq(changes.id, id));
    return change;
  }

  async createChange(insertChange: InsertChange): Promise<Change> {
    const now = new Date();
    const valueWithTimestamps = {
      ...insertChange,
      updatedAt: now,
    };
    const [change] = await db.insert(changes).values(valueWithTimestamps).returning();
    return change;
  }

  async updateChange(id: number, changeUpdate: Partial<Change>): Promise<Change | undefined> {
    const updatedValues = {
      ...changeUpdate,
      updatedAt: new Date(),
    };
    
    const [updatedChange] = await db
      .update(changes)
      .set(updatedValues)
      .where(eq(changes.id, id))
      .returning();
    return updatedChange;
  }

  async deleteChange(id: number): Promise<boolean> {
    const [deletedChange] = await db
      .delete(changes)
      .where(eq(changes.id, id))
      .returning();
    return !!deletedChange;
  }

  // Lock methods
  async getLocks(): Promise<Lock[]> {
    return await db.select().from(locks);
  }

  async getLock(id: number): Promise<Lock | undefined> {
    const [lock] = await db.select().from(locks).where(eq(locks.id, id));
    return lock;
  }

  async getLockByFilePath(filePath: string): Promise<Lock | undefined> {
    const [lock] = await db.select().from(locks).where(eq(locks.filePath, filePath));
    return lock;
  }

  async createLock(insertLock: InsertLock): Promise<Lock> {
    const [lock] = await db.insert(locks).values(insertLock).returning();
    return lock;
  }

  async deleteLock(id: number): Promise<boolean> {
    const [deletedLock] = await db
      .delete(locks)
      .where(eq(locks.id, id))
      .returning();
    return !!deletedLock;
  }

  // Rate limit methods
  async getRateLimits(agentId: string): Promise<RateLimit[]> {
    return await db.select().from(rateLimits).where(eq(rateLimits.agentId, agentId));
  }

  async createRateLimit(insertRateLimit: InsertRateLimit): Promise<RateLimit> {
    const [rateLimit] = await db.insert(rateLimits).values(insertRateLimit).returning();
    return rateLimit;
  }

  async updateRateLimit(id: number, rateLimitUpdate: Partial<RateLimit>): Promise<RateLimit | undefined> {
    const [updatedRateLimit] = await db
      .update(rateLimits)
      .set(rateLimitUpdate)
      .where(eq(rateLimits.id, id))
      .returning();
    return updatedRateLimit;
  }

  async deleteRateLimit(id: number): Promise<boolean> {
    const [deletedRateLimit] = await db
      .delete(rateLimits)
      .where(eq(rateLimits.id, id))
      .returning();
    return !!deletedRateLimit;
  }

  // Fingerprint methods
  async getFingerprints(): Promise<Fingerprint[]> {
    return await db.select().from(fingerprints);
  }

  async getFingerprintByFilePath(filePath: string): Promise<Fingerprint | undefined> {
    const [fingerprint] = await db.select().from(fingerprints).where(eq(fingerprints.filePath, filePath));
    return fingerprint;
  }

  async createFingerprint(insertFingerprint: InsertFingerprint): Promise<Fingerprint> {
    const [fingerprint] = await db.insert(fingerprints).values(insertFingerprint).returning();
    return fingerprint;
  }

  async updateFingerprint(id: number, fingerprintUpdate: Partial<Fingerprint>): Promise<Fingerprint | undefined> {
    const [updatedFingerprint] = await db
      .update(fingerprints)
      .set(fingerprintUpdate)
      .where(eq(fingerprints.id, id))
      .returning();
    return updatedFingerprint;
  }

  async deleteFingerprint(id: number): Promise<boolean> {
    const [deletedFingerprint] = await db
      .delete(fingerprints)
      .where(eq(fingerprints.id, id))
      .returning();
    return !!deletedFingerprint;
  }
}

// Initialize the database storage
export const storage = new DatabaseStorage();
