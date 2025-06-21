import { users, projects, projectDescriptions, settings, type User, type InsertUser, type Project, type InsertProject, type UpdateProject, type ProjectDescription, type InsertProjectDescription, type UpdateProjectDescription, type Settings, type InsertSettings, type UpdateSettings } from "@shared/schema";
import { db } from "./db";
import { eq, ne, or, sql, desc } from "drizzle-orm";
import crypto from "crypto";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  deleteUser(id: number): Promise<boolean>;
  setPasswordResetToken(email: string, token: string, expiry: Date): Promise<boolean>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  clearPasswordResetToken(userId: number): Promise<boolean>;
  updatePassword(userId: number, hashedPassword: string): Promise<boolean>;
  getPendingUsers(): Promise<User[]>;
  approveUser(userId: number, approvedBy: number): Promise<boolean>;
  rejectUser(userId: number): Promise<boolean>;

  // Project methods
  getProject(id: number): Promise<Project | undefined>;
  getProjectByShareToken(token: string): Promise<Project | undefined>;
  getAllProjects(): Promise<Project[]>;
  getProjectsByUser(userId: number): Promise<Project[]>;
  getProjectsByTeamMember(memberId: number): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: UpdateProject): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;
  searchProjects(query: string): Promise<Project[]>;
  getProjectTitles(): Promise<string[]>;
  generateShareToken(projectId: number, expiryDays?: number): Promise<string>;
  revokeShareToken(projectId: number): Promise<boolean>;

  // Inbox methods
  getInboxMessages(userId: number): Promise<any[]>;
  getUnreadMessageCount(userId: number): Promise<number>;
  markMessageAsRead(messageId: string): Promise<boolean>;

  // Project description methods
  getProjectDescriptions(projectId: number): Promise<ProjectDescription[]>;
  createProjectDescription(description: InsertProjectDescription): Promise<ProjectDescription>;
  updateProjectDescription(id: number, description: UpdateProjectDescription): Promise<ProjectDescription | undefined>;
  deleteProjectDescription(id: number): Promise<boolean>;

  // Settings methods
  getSettings(): Promise<Settings | undefined>;
  updateSettings(settings: UpdateSettings): Promise<Settings>;
  createSettings(settings: InsertSettings): Promise<Settings>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async getAllProjects(): Promise<Project[]> {
    return await db.select().from(projects).orderBy(projects.createdAt);
  }

  async getProjectsByUser(userId: number): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.createdBy, userId));
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db
      .insert(projects)
      .values(insertProject)
      .returning();
    return project;
  }

  async updateProject(id: number, updateProject: UpdateProject): Promise<Project | undefined> {
    const [updated] = await db
      .update(projects)
      .set({ ...updateProject, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteProject(id: number): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id));
    return (result.rowCount || 0) > 0;
  }

  async searchProjects(query: string): Promise<Project[]> {
    // Simple text search - in production, you'd use full-text search
    const allProjects = await db.select().from(projects);
    const lowerQuery = query.toLowerCase();
    return allProjects.filter(project =>
      project.title.toLowerCase().includes(lowerQuery) ||
      JSON.stringify(project.description).toLowerCase().includes(lowerQuery)
    );
  }

  async deleteUser(id: number): Promise<boolean> {
    // First, remove user from all projects (both as creator and team member)
    const allProjects = await db.select().from(projects);
    
    for (const project of allProjects) {
      let needsUpdate = false;
      let updatedProject = { ...project };
      
      // Remove from team members array
      if (project.teamMembers && project.teamMembers.includes(id)) {
        updatedProject.teamMembers = project.teamMembers.filter(memberId => memberId !== id);
        needsUpdate = true;
      }
      
      // If user is the creator, transfer ownership to first remaining team member
      if (project.createdBy === id) {
        const remainingMembers = (updatedProject.teamMembers || []).filter(memberId => memberId !== id);
        // Find another user to transfer ownership to
        const otherUsers = await db.select().from(users).limit(1);
        updatedProject.createdBy = otherUsers.length > 0 ? otherUsers[0].id : 1;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await db.update(projects)
          .set({
            teamMembers: updatedProject.teamMembers,
            createdBy: updatedProject.createdBy,
          })
          .where(eq(projects.id, project.id));
      }
    }
    
    // Now delete the user
    const result = await db.delete(users).where(eq(users.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getProjectTitles(): Promise<string[]> {
    const allProjects = await db.select().from(projects);
    const titles = allProjects.map(p => p.title);
    const uniqueTitles: string[] = [];
    titles.forEach(title => {
      if (!uniqueTitles.includes(title)) {
        uniqueTitles.push(title);
      }
    });
    return uniqueTitles;
  }

  async getInboxMessages(userId: number): Promise<any[]> {
    // Get projects where user is a team member or creator
    const userProjects = await this.getProjectsByUser(userId);
    
    // Generate user-specific messages based on their projects
    const messages = [];
    for (const project of userProjects) {
      // Add sample messages for demonstration
      messages.push({
        id: `msg_${project.id}_1`,
        type: 'mention',
        projectId: project.id,
        projectTitle: project.title,
        content: `You were mentioned in ${project.title}`,
        sender: { id: project.createdBy, name: 'Team Member', avatar: null },
        timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        isRead: Math.random() > 0.5,
        context: `Discussion in ${project.title}`,
        recipientId: userId
      });
    }
    
    return messages.filter(msg => msg.recipientId === userId);
  }

  async getUnreadMessageCount(userId: number): Promise<number> {
    const messages = await this.getInboxMessages(userId);
    return messages.filter((msg: any) => !msg.isRead).length;
  }

  async markMessageAsRead(messageId: string): Promise<boolean> {
    // In a real implementation, this would update the message in the database
    return true;
  }

  async setPasswordResetToken(email: string, token: string, expiry: Date): Promise<boolean> {
    try {
      const result = await db.update(users)
        .set({
          resetToken: token,
          resetTokenExpiry: expiry,
        })
        .where(eq(users.email, email));
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('Error setting password reset token:', error);
      return false;
    }
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.resetToken, token));
      if (!user || !user.resetTokenExpiry) return undefined;
      
      // Check if token is expired
      if (new Date() > user.resetTokenExpiry) {
        // Clear expired token
        await this.clearPasswordResetToken(user.id);
        return undefined;
      }
      
      return user;
    } catch (error) {
      console.error('Error getting user by reset token:', error);
      return undefined;
    }
  }

  async clearPasswordResetToken(userId: number): Promise<boolean> {
    try {
      const result = await db.update(users)
        .set({
          resetToken: null,
          resetTokenExpiry: null,
        })
        .where(eq(users.id, userId));
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('Error clearing password reset token:', error);
      return false;
    }
  }

  async updatePassword(userId: number, hashedPassword: string): Promise<boolean> {
    try {
      const result = await db.update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, userId));
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('Error updating password:', error);
      return false;
    }
  }

  async getPendingUsers(): Promise<User[]> {
    try {
      const pendingUsers = await db.select().from(users).where(eq(users.isApproved, false));
      return pendingUsers;
    } catch (error) {
      console.error('Error getting pending users:', error);
      return [];
    }
  }

  async approveUser(userId: number, approvedBy: number): Promise<boolean> {
    try {
      const result = await db.update(users)
        .set({
          isApproved: true,
          approvedBy,
          approvedAt: new Date(),
        })
        .where(eq(users.id, userId));
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('Error approving user:', error);
      return false;
    }
  }

  async rejectUser(userId: number): Promise<boolean> {
    try {
      const result = await db.delete(users).where(eq(users.id, userId));
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('Error rejecting user:', error);
      return false;
    }
  }

  async getProjectsByTeamMember(memberId: number): Promise<Project[]> {
    try {
      // Get all projects and filter in JavaScript since complex SQL might have issues
      const allProjects = await db.select().from(projects);
      
      const memberProjects = allProjects.filter(project => 
        project.createdBy === memberId || 
        (project.teamMembers && project.teamMembers.includes(memberId))
      );
      
      return memberProjects as Project[];
    } catch (error) {
      console.error('Error getting projects by team member:', error);
      return [];
    }
  }
  async getProjectDescriptions(projectId: number): Promise<ProjectDescription[]> {
    const result = await db
      .select()
      .from(projectDescriptions)
      .where(eq(projectDescriptions.projectId, projectId))
      .orderBy(desc(projectDescriptions.createdAt));
    return result;
  }

  async createProjectDescription(insertDescription: InsertProjectDescription): Promise<ProjectDescription> {
    const [result] = await db
      .insert(projectDescriptions)
      .values(insertDescription)
      .returning();
    return result;
  }

  async updateProjectDescription(id: number, updateDescription: UpdateProjectDescription): Promise<ProjectDescription | undefined> {
    const [result] = await db
      .update(projectDescriptions)
      .set({ ...updateDescription, updatedAt: new Date() })
      .where(eq(projectDescriptions.id, id))
      .returning();
    return result;
  }

  async deleteProjectDescription(id: number): Promise<boolean> {
    const result = await db
      .delete(projectDescriptions)
      .where(eq(projectDescriptions.id, id));
    return result.rowCount > 0;
  }

  async getSettings(): Promise<Settings | undefined> {
    try {
      const result = await db.select().from(settings).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error getting settings:', error);
      return undefined;
    }
  }

  async updateSettings(updateSettings: UpdateSettings): Promise<Settings> {
    try {
      const existing = await this.getSettings();
      
      if (existing) {
        const result = await db
          .update(settings)
          .set({ ...updateSettings, updatedAt: new Date() })
          .where(eq(settings.id, existing.id))
          .returning();
        return result[0];
      } else {
        return await this.createSettings(updateSettings as InsertSettings);
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }

  async createSettings(insertSettings: InsertSettings): Promise<Settings> {
    try {
      const result = await db.insert(settings).values(insertSettings).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating settings:', error);
      throw error;
    }
  }

  async getProjectByShareToken(token: string): Promise<Project | undefined> {
    try {
      const result = await db
        .select()
        .from(projects)
        .where(eq(projects.shareToken, token))
        .limit(1);
      
      const project = result[0];
      if (!project) return undefined;
      
      // Check if token is expired
      if (project.shareExpiry) {
        const expiry = new Date(project.shareExpiry);
        if (expiry < new Date()) {
          // Token expired, revoke it
          await this.revokeShareToken(project.id);
          return undefined;
        }
      }
      
      return project;
    } catch (error) {
      console.error('Error getting project by share token:', error);
      return undefined;
    }
  }

  async generateShareToken(projectId: number, expiryDays: number = 30): Promise<string> {
    try {
      const token = crypto.randomBytes(32).toString('hex');
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + expiryDays);
      
      await db
        .update(projects)
        .set({
          shareToken: token,
          shareExpiry: expiry,
          isPubliclyShared: true,
          updatedAt: new Date()
        })
        .where(eq(projects.id, projectId));
      
      return token;
    } catch (error) {
      console.error('Error generating share token:', error);
      throw error;
    }
  }

  async revokeShareToken(projectId: number): Promise<boolean> {
    try {
      await db
        .update(projects)
        .set({
          shareToken: null,
          shareExpiry: null,
          isPubliclyShared: false,
          updatedAt: new Date()
        })
        .where(eq(projects.id, projectId));
      
      return true;
    } catch (error) {
      console.error('Error revoking share token:', error);
      return false;
    }
  }
}

export const storage = new DatabaseStorage();
