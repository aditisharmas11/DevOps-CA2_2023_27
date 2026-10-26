import { pgTable, text, serial, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// User Schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const usersRelations = relations(users, ({ many }) => ({
  assessments: many(assessments),
  chatMessages: many(chatMessages),
}));

// Assessment Data Schema
export const assessments = pgTable("assessments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  answers: jsonb("answers").notNull(),
  results: jsonb("results"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAssessmentSchema = createInsertSchema(assessments).pick({
  userId: true,
  answers: true,
  results: true,
});

export type InsertAssessment = z.infer<typeof insertAssessmentSchema>;
export type Assessment = typeof assessments.$inferSelect;

export const assessmentsRelations = relations(assessments, ({ one }) => ({
  user: one(users, {
    fields: [assessments.userId],
    references: [users.id],
  }),
}));

// Chat Message Schema
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).pick({
  userId: true,
  role: true,
  content: true,
});

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  user: one(users, {
    fields: [chatMessages.userId],
    references: [users.id],
  }),
}));

// Resource Schema
export const resources = pgTable("resources", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(), // 'article', 'video', 'guide'
  icon: text("icon").notNull(), // 'book', 'video', 'file-text'
  duration: text("duration").notNull(), // e.g. '5 min read'
  tags: jsonb("tags").notNull().$type<string[]>(),
  url: text("url").notNull(),
});

export const insertResourceSchema = createInsertSchema(resources);

export type InsertResource = z.infer<typeof insertResourceSchema>;
export type Resource = typeof resources.$inferSelect;

// Assessment Questions Definition
export type QuestionOption = {
  text: string;
  value: number;
};

export type Question = {
  id: number;
  text: string;
  category: 'mood' | 'anxiety' | 'social';
  options: QuestionOption[];
};

export const assessmentQuestions: Question[] = [
  // Mood questions (6 questions)
  {
    id: 1,
    text: "Over the past 2 weeks, how often have you felt down, depressed, or hopeless?",
    category: 'mood',
    options: [
      { text: "Not at all", value: 0 },
      { text: "Several days", value: 1 },
      { text: "More than half the days", value: 2 },
      { text: "Nearly every day", value: 3 }
    ]
  },
  {
    id: 2,
    text: "Over the past 2 weeks, how often have you had little interest or pleasure in doing things?",
    category: 'mood',
    options: [
      { text: "Not at all", value: 0 },
      { text: "Several days", value: 1 },
      { text: "More than half the days", value: 2 },
      { text: "Nearly every day", value: 3 }
    ]
  },
  {
    id: 3,
    text: "Over the past 2 weeks, how often have you felt that you didn't have enough energy to get through the day?",
    category: 'mood',
    options: [
      { text: "Not at all", value: 0 },
      { text: "Several days", value: 1 },
      { text: "More than half the days", value: 2 },
      { text: "Nearly every day", value: 3 }
    ]
  },
  {
    id: 4,
    text: "Over the past 2 weeks, how often have you felt bad about yourself or felt that you are a failure?",
    category: 'mood',
    options: [
      { text: "Not at all", value: 0 },
      { text: "Several days", value: 1 },
      { text: "More than half the days", value: 2 },
      { text: "Nearly every day", value: 3 }
    ]
  },
  {
    id: 5,
    text: "Over the past 2 weeks, how often have you had trouble falling or staying asleep, or sleeping too much?",
    category: 'mood',
    options: [
      { text: "Not at all", value: 0 },
      { text: "Several days", value: 1 },
      { text: "More than half the days", value: 2 },
      { text: "Nearly every day", value: 3 }
    ]
  },
  {
    id: 6,
    text: "Over the past 2 weeks, how often have you felt optimistic about the future?",
    category: 'mood',
    options: [
      { text: "Nearly every day", value: 0 },
      { text: "More than half the days", value: 1 },
      { text: "Several days", value: 2 },
      { text: "Not at all", value: 3 }
    ]
  },
  
  // Anxiety questions (7 questions)
  {
    id: 7,
    text: "Over the past 2 weeks, how often have you felt nervous, anxious, or on edge?",
    category: 'anxiety',
    options: [
      { text: "Not at all", value: 0 },
      { text: "Several days", value: 1 },
      { text: "More than half the days", value: 2 },
      { text: "Nearly every day", value: 3 }
    ]
  },
  {
    id: 8,
    text: "Over the past 2 weeks, how often have you not been able to stop or control worrying?",
    category: 'anxiety',
    options: [
      { text: "Not at all", value: 0 },
      { text: "Several days", value: 1 },
      { text: "More than half the days", value: 2 },
      { text: "Nearly every day", value: 3 }
    ]
  },
  {
    id: 9,
    text: "Over the past 2 weeks, how often have you had trouble relaxing?",
    category: 'anxiety',
    options: [
      { text: "Not at all", value: 0 },
      { text: "Several days", value: 1 },
      { text: "More than half the days", value: 2 },
      { text: "Nearly every day", value: 3 }
    ]
  },
  {
    id: 10,
    text: "Over the past 2 weeks, how often have you worried too much about different things?",
    category: 'anxiety',
    options: [
      { text: "Not at all", value: 0 },
      { text: "Several days", value: 1 },
      { text: "More than half the days", value: 2 },
      { text: "Nearly every day", value: 3 }
    ]
  },
  {
    id: 11,
    text: "Over the past 2 weeks, how often have you been so restless that it was hard to sit still?",
    category: 'anxiety',
    options: [
      { text: "Not at all", value: 0 },
      { text: "Several days", value: 1 },
      { text: "More than half the days", value: 2 },
      { text: "Nearly every day", value: 3 }
    ]
  },
  {
    id: 12,
    text: "Over the past 2 weeks, how often have you felt afraid as if something awful might happen?",
    category: 'anxiety',
    options: [
      { text: "Not at all", value: 0 },
      { text: "Several days", value: 1 },
      { text: "More than half the days", value: 2 },
      { text: "Nearly every day", value: 3 }
    ]
  },
  {
    id: 13,
    text: "Over the past 2 weeks, how often have you felt relaxed and at ease?",
    category: 'anxiety',
    options: [
      { text: "Nearly every day", value: 0 },
      { text: "More than half the days", value: 1 },
      { text: "Several days", value: 2 },
      { text: "Not at all", value: 3 }
    ]
  },
  
  // Social questions (7 questions)
  {
    id: 14,
    text: "Over the past 2 weeks, how often have you felt confident and comfortable around other people?",
    category: 'social',
    options: [
      { text: "Nearly every day", value: 0 },
      { text: "More than half the days", value: 1 },
      { text: "Several days", value: 2 },
      { text: "Not at all", value: 3 }
    ]
  },
  {
    id: 15,
    text: "Over the past 2 weeks, how often have you felt supported by friends or family?",
    category: 'social',
    options: [
      { text: "Nearly every day", value: 0 },
      { text: "More than half the days", value: 1 },
      { text: "Several days", value: 2 },
      { text: "Not at all", value: 3 }
    ]
  },
  {
    id: 16,
    text: "Over the past 2 weeks, how often have you avoided social situations or interactions with others?",
    category: 'social',
    options: [
      { text: "Not at all", value: 0 },
      { text: "Several days", value: 1 },
      { text: "More than half the days", value: 2 },
      { text: "Nearly every day", value: 3 }
    ]
  },
  {
    id: 17,
    text: "Over the past 2 weeks, how often have you felt isolated or lonely?",
    category: 'social',
    options: [
      { text: "Not at all", value: 0 },
      { text: "Several days", value: 1 },
      { text: "More than half the days", value: 2 },
      { text: "Nearly every day", value: 3 }
    ]
  },
  {
    id: 18,
    text: "Over the past 2 weeks, how often have you enjoyed spending time with friends or family?",
    category: 'social',
    options: [
      { text: "Nearly every day", value: 0 },
      { text: "More than half the days", value: 1 },
      { text: "Several days", value: 2 },
      { text: "Not at all", value: 3 }
    ]
  },
  {
    id: 19,
    text: "Over the past 2 weeks, how often have you felt comfortable expressing your feelings to others?",
    category: 'social',
    options: [
      { text: "Nearly every day", value: 0 },
      { text: "More than half the days", value: 1 },
      { text: "Several days", value: 2 },
      { text: "Not at all", value: 3 }
    ]
  },
  {
    id: 20,
    text: "Over the past 2 weeks, how often have you felt that people around you understand and care about you?",
    category: 'social',
    options: [
      { text: "Nearly every day", value: 0 },
      { text: "More than half the days", value: 1 },
      { text: "Several days", value: 2 },
      { text: "Not at all", value: 3 }
    ]
  }
];

export type MentalHealthPrediction = {
  condition: string;
  probability: number;
  severity: 'none' | 'mild' | 'moderate' | 'severe';
  description: string;
};

export type AssessmentData = {
  answers: Record<string, number>;
  results?: {
    overallScore: number;
    moodScore: number;
    anxietyScore: number;
    socialScore: number;
    summary: string;
    predictions: Array<MentalHealthPrediction>;
    recommendations: Array<{
      title: string;
      description: string;
      icon: string;
    }>;
  };
};
