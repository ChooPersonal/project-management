import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  avatar: text("avatar"),
  color: text("color").notNull().default("blue"),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  role: text("role").notNull().default("user"), // user, admin
  isApproved: boolean("is_approved").notNull().default(false),
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at"),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  client: text("client"), // Client name field
  description: jsonb("description").notNull(), // Rich text content
  status: text("status").notNull().default("planning"), // planning, in-progress, completed, urgent, review
  priority: text("priority").notNull().default("medium"), // low, medium, high, urgent
  startDate: timestamp("start_date"),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  teamMembers: integer("team_members").array().default([]),
  attachments: jsonb("attachments").default([]), // Array of file objects
  shareToken: text("share_token").unique(),
  shareExpiry: timestamp("share_expiry"),
  isPubliclyShared: boolean("is_publicly_shared").default(false),
});

export const projectDescriptions = pgTable("project_descriptions", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => users.id)
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  workspaceName: text("workspace_name").notNull().default("Project Manager"),
  companyLogo: text("company_logo"), // URL to uploaded logo
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  resetToken: true,
  resetTokenExpiry: true,
  approvedBy: true,
  approvedAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.union([z.date(), z.string().transform(str => str ? new Date(str) : null)]).nullable().optional(),
  dueDate: z.union([z.date(), z.string().transform(str => str ? new Date(str) : null)]).nullable().optional(),
});

export const updateProjectSchema = insertProjectSchema.partial();

export const insertProjectDescriptionSchema = createInsertSchema(projectDescriptions).omit({
  id: true,
  projectId: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
});

export const updateProjectDescriptionSchema = insertProjectDescriptionSchema.partial();

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type UpdateProject = z.infer<typeof updateProjectSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProjectDescription = z.infer<typeof insertProjectDescriptionSchema>;
export type UpdateProjectDescription = z.infer<typeof updateProjectDescriptionSchema>;
export type ProjectDescription = typeof projectDescriptions.$inferSelect;

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateSettingsSchema = insertSettingsSchema.partial();

export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type UpdateSettings = z.infer<typeof updateSettingsSchema>;
export type Settings = typeof settings.$inferSelect;

// Rich text content type
export type RichTextContent = {
  type: string;
  content?: RichTextContent[];
  text?: string;
  marks?: Array<{ type: string; attrs?: any }>;
  attrs?: any;
};

// File attachment type
export type FileAttachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedAt: string;
};
