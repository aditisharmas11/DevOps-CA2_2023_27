import {
  users, type User, type InsertUser,
  assessments, type Assessment, type InsertAssessment,
  chatMessages, type ChatMessage, type InsertChatMessage,
  resources, type Resource, type InsertResource
} from "../shared/schema.js";
import { db } from "./db";
import { eq } from "drizzle-orm";

// Storage interface remains the same
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(id: number, password: string): Promise<User | undefined>;

  // Assessment methods
  createAssessment(assessment: { answers: Record<string, number>, results?: any }): Promise<Assessment>;
  getAssessments(): Promise<Assessment[]>;

  // Chat methods
  createChatMessage(message: { role: string, content: string }): Promise<ChatMessage>;
  getChatMessages(): Promise<ChatMessage[]>;

  // Resource methods
  createResource(resource: {
    title: string,
    description: string,
    type: string,
    icon: string,
    duration: string,
    tags: string[],
    url: string
  }): Promise<Resource>;
  getResources(): Promise<Resource[]>;
  getResourceByTitle(title: string): Promise<Resource | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const results = await db.select().from(users).where(eq(users.id, id));
    return results.length > 0 ? results[0] : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const results = await db.select().from(users).where(eq(users.username, username));
    return results.length > 0 ? results[0] : undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUserPassword(id: number, password: string): Promise<User | undefined> {
    const results = await db
      .update(users)
      .set({ password })
      .where(eq(users.id, id))
      .returning();

    return results.length > 0 ? results[0] : undefined;
  }

  // Assessment methods
  async createAssessment(assessmentData: { answers: Record<string, number>, results?: any }): Promise<Assessment> {
    const insertData: InsertAssessment = {
      userId: null, // Anonymous assessment for now
      answers: assessmentData.answers,
      results: assessmentData.results || null
    };

    const result = await db.insert(assessments).values(insertData).returning();
    return result[0];
  }

  async getAssessments(): Promise<Assessment[]> {
    return await db.select().from(assessments);
  }

  // Chat methods
  async createChatMessage(messageData: { role: string, content: string }): Promise<ChatMessage> {
    const insertData: InsertChatMessage = {
      userId: null, // Anonymous message for now
      role: messageData.role,
      content: messageData.content
    };

    const result = await db.insert(chatMessages).values(insertData).returning();
    return result[0];
  }

  async getChatMessages(): Promise<ChatMessage[]> {
    return await db.select().from(chatMessages);
  }

  // Resource methods
  async createResource(resourceData: {
    title: string,
    description: string,
    type: string,
    icon: string,
    duration: string,
    tags: string[],
    url: string
  }): Promise<Resource> {

    const insertData: InsertResource = {
      title: resourceData.title,
      description: resourceData.description,
      type: resourceData.type,
      icon: resourceData.icon,
      duration: resourceData.duration,
      tags: resourceData.tags,
      url: resourceData.url
    };

    const result = await db.insert(resources).values(insertData as any).returning();
    return result[0];
  }

  async getResources(): Promise<Resource[]> {
    return await db.select().from(resources);
  }

  async getResourceByTitle(title: string): Promise<Resource | undefined> {
    const results = await db.select().from(resources).where(eq(resources.title, title));
    return results.length > 0 ? results[0] : undefined;
  }

} export const storage = new DatabaseStorage();