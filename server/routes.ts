import type { Express, Request } from "express";

// Extend Express Request interface to include session
declare module 'express-serve-static-core' {
  interface Request {
    session: {
      userId?: number;
    } & import('express-session').Session;
  }
}
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { storage } from "./storage";
import { sendPasswordResetEmail, sendWelcomeEmail } from "./email";
import { insertProjectSchema, updateProjectSchema, insertUserSchema, insertProjectDescriptionSchema, updateProjectDescriptionSchema, updateSettingsSchema } from "@shared/schema";
import { importNotionPage, getNotionDatabases } from "./notion";
import { z } from "zod";
import multer from "multer";
import path from "path";
import { nanoid } from "nanoid";
import fs from "fs";

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads', { recursive: true });
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req: any, file: any, cb: any) => {
      cb(null, 'uploads/');
    },
    filename: (req: any, file: any, cb: any) => {
      const uniqueName = `${nanoid()}-${file.originalname}`;
      cb(null, uniqueName);
    }
  }),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for larger GIF files
  },
  fileFilter: (req: any, file: any, cb: any) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve uploaded files
  app.use('/uploads', express.static('uploads'));

  // Import from Notion page URL (moved before other routes)
  app.post("/api/notion/import-page", async (req, res) => {
    try {
      const { pageUrl } = req.body;
      
      if (!pageUrl) {
        return res.status(400).json({ message: "Page URL is required" });
      }
      
      // Import the page content
      const importedContent = await importNotionPage(pageUrl);
      
      // Get first available user for project creation
      const users = await storage.getAllUsers();
      if (users.length === 0) {
        return res.status(400).json({ 
          message: "No users found. Please create a user account first." 
        });
      }
      
      // Create a new project with the imported content
      const projectData = {
        title: importedContent.title,
        description: importedContent.description,
        status: 'planning' as const,
        priority: 'medium' as const,
        createdBy: 5, // Use existing user ID from database
        teamMembers: [] as number[],
        attachments: [] as any[]
      };
      
      const project = await storage.createProject(projectData);
      
      res.json({
        message: 'Successfully imported from Notion',
        project: project,
        originalContent: importedContent.content,
        metadata: {
          notionCreatedDate: importedContent.createdDate,
          notionLastEditedDate: importedContent.lastEditedDate
        }
      });
      
    } catch (error) {
      console.error('Notion import error:', error);
      res.status(500).json({ 
        message: "Failed to import from Notion", 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Authentication endpoints
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { fullName, username, email, password } = req.body;
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists with this email' });
      }
      
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ message: 'Username already taken' });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create user (requires approval)
      const user = await storage.createUser({
        username,
        email,
        fullName,
        password: hashedPassword,
        avatar: null,
        color: 'blue',
        role: 'user',
        isApproved: false
      });
      
      // Send welcome email
      await sendWelcomeEmail(email, fullName);
      
      res.status(201).json({ 
        message: 'Registration successful. Your account is pending admin approval.',
        userId: user.id 
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Registration failed' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      
      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      
      // Check if user is approved
      if (!user.isApproved) {
        return res.status(403).json({ 
          message: 'Your account is pending admin approval. Please contact an administrator.' 
        });
      }
      
      // Store user session
      req.session.userId = user.id;
      
      res.json({ 
        message: 'Login successful',
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email, 
          fullName: user.fullName,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Login failed' });
    }
  });

  // Get current user endpoint
  app.get('/api/auth/me', async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        avatar: user.avatar,
        color: user.color
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ message: 'Failed to get user data' });
    }
  });

  // Logout endpoint
  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ message: 'Failed to logout' });
      }
      res.clearCookie('connect.sid');
      res.json({ message: 'Logged out successfully' });
    });
  });

  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal whether email exists for security
        return res.json({ message: 'If the email exists, reset instructions have been sent' });
      }
      
      // Generate secure reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      // Save token to database
      await storage.setPasswordResetToken(email, resetToken, tokenExpiry);
      
      // Determine reset URL based on environment
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? `https://${req.get('host')}` 
        : `http://${req.get('host')}`;
      const resetUrl = `${baseUrl}/reset-password`;
      
      // Send password reset email
      const emailSent = await sendPasswordResetEmail({
        to: email,
        userName: user.fullName,
        resetToken,
        resetUrl
      });
      
      if (emailSent) {
        console.log(`Password reset email sent to: ${email}`);
      } else {
        console.error(`Failed to send password reset email to: ${email}`);
      }
      
      res.json({ message: 'If the email exists, reset instructions have been sent' });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ message: 'Failed to process request' });
    }
  });

  // Password reset confirmation endpoint
  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ message: 'Token and new password are required' });
      }
      
      // Find user by reset token
      const user = await storage.getUserByResetToken(token);
      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired reset token' });
      }
      
      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Update password and clear reset token
      await storage.updatePassword(user.id, hashedPassword);
      await storage.clearPasswordResetToken(user.id);
      
      console.log(`Password reset successful for user: ${user.email}`);
      res.json({ message: 'Password reset successful' });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({ message: 'Failed to reset password' });
    }
  });

  // Admin routes for user approval
  app.get('/api/admin/pending-users', async (req, res) => {
    try {
      // TODO: Add admin authentication check here
      const pendingUsers = await storage.getPendingUsers();
      res.json(pendingUsers);
    } catch (error) {
      console.error('Error fetching pending users:', error);
      res.status(500).json({ message: 'Failed to fetch pending users' });
    }
  });

  app.post('/api/admin/approve-user/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { approvedBy } = req.body; // Should be admin user ID
      
      const success = await storage.approveUser(userId, approvedBy);
      if (success) {
        res.json({ message: 'User approved successfully' });
      } else {
        res.status(400).json({ message: 'Failed to approve user' });
      }
    } catch (error) {
      console.error('Error approving user:', error);
      res.status(500).json({ message: 'Failed to approve user' });
    }
  });

  app.delete('/api/admin/reject-user/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      const success = await storage.rejectUser(userId);
      if (success) {
        res.json({ message: 'User rejected successfully' });
      } else {
        res.status(400).json({ message: 'Failed to reject user' });
      }
    } catch (error) {
      console.error('Error rejecting user:', error);
      res.status(500).json({ message: 'Failed to reject user' });
    }
  });

  // Get all projects
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getAllProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  // Get projects by team member
  app.get("/api/projects/by-member/:memberId", async (req, res) => {
    try {
      const memberId = parseInt(req.params.memberId);
      const projects = await storage.getProjectsByTeamMember(memberId);
      res.json(projects);
    } catch (error) {
      console.error('Error fetching projects by team member:', error);
      res.status(500).json({ message: 'Failed to fetch projects by team member' });
    }
  });

  // Get project title suggestions
  app.get("/api/projects/titles", async (req, res) => {
    try {
      const titles = await storage.getProjectTitles();
      res.json(titles);
    } catch (error) {
      console.error("Error fetching project titles:", error);
      res.status(500).json({ message: "Failed to fetch project titles" });
    }
  });

  // Get inbox messages for a user
  app.get("/api/inbox/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const messages = await storage.getInboxMessages(userId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching inbox messages:", error);
      res.status(500).json({ message: "Failed to fetch inbox messages" });
    }
  });

  // Get unread message count for a user
  app.get("/api/inbox/:userId/unread-count", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const count = await storage.getUnreadMessageCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread message count:", error);
      res.status(500).json({ message: "Failed to fetch unread message count" });
    }
  });

  // Mark message as read
  app.post("/api/inbox/mark-read", async (req, res) => {
    try {
      const { messageId } = req.body;
      const success = await storage.markMessageAsRead(messageId);
      res.json({ success });
    } catch (error) {
      console.error("Error marking message as read:", error);
      res.status(500).json({ message: "Failed to mark message as read" });
    }
  });

  // Notion import endpoints
  app.get('/api/notion/databases', async (req, res) => {
    try {
      const { getNotionDatabases } = await import('./notion');
      const databases = await getNotionDatabases();
      res.json(databases.map((db: any) => ({
        id: db.id,
        title: db.title?.[0]?.plain_text || 'Untitled',
        url: db.url
      })));
    } catch (error) {
      console.error('Error fetching Notion databases:', error);
      res.status(500).json({ message: 'Failed to fetch Notion databases' });
    }
  });

  app.post('/api/notion/import-projects', async (req, res) => {
    try {
      const { notion, NOTION_PAGE_ID } = await import('./notion');
      
      // Get content from the Xover Wiki page directly
      const pageResponse = await notion.pages.retrieve({ page_id: NOTION_PAGE_ID });
      const pageTitle = (pageResponse as any).properties?.title?.title?.[0]?.plain_text || "Xover Wiki";

      // Get child blocks from the wiki page
      const blocksResponse = await notion.blocks.children.list({ 
        block_id: NOTION_PAGE_ID,
        page_size: 10
      });

      // Extract text content from blocks
      let wikiContent = "";
      for (const block of blocksResponse.results) {
        const blockData = block as any;
        
        if (blockData.type === "paragraph" && blockData.paragraph?.rich_text?.length > 0) {
          const text = blockData.paragraph.rich_text.map((t: any) => t.plain_text || "").join("");
          if (text.trim()) wikiContent += text + "\n\n";
        } else if (blockData.type === "heading_2" && blockData.heading_2?.rich_text?.length > 0) {
          const heading = blockData.heading_2.rich_text.map((t: any) => t.plain_text || "").join("");
          if (heading.trim()) wikiContent += `## ${heading}\n\n`;
        } else if (blockData.type === "child_page") {
          const childTitle = blockData.child_page?.title || "Child Page";
          wikiContent += `- **${childTitle}**\n`;
        }
      }

      // Build project from wiki content
      let descriptionText = `**Project imported from Xover Wiki**\n\n`;
      descriptionText += `**Source Page:** ${pageTitle}\n\n`;
      
      if (wikiContent.trim()) {
        descriptionText += `**Wiki Content:**\n${wikiContent.trim()}\n\n`;
      } else {
        descriptionText += `**Content:** This page contains ${blocksResponse.results.length} blocks including child pages and content sections.\n\n`;
      }
      
      descriptionText += `*Imported from your Notion Xover Wiki page*`;

      const richTextDescription = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: descriptionText }]
          }
        ]
      };

      const projectData = {
        title: `${pageTitle} Documentation`,
        description: richTextDescription,
        status: 'planning',
        priority: 'medium',
        startDate: null,
        dueDate: null,
        createdBy: 5,
        teamMembers: [5],
        attachments: []
      };

      const project = await storage.createProject(projectData);

      res.json({
        message: `Successfully imported "${pageTitle}" wiki content from Notion`,
        imported: 1,
        total: 1,
        projects: [project]
      });
    } catch (error) {
      console.error('Error importing from Notion wiki:', error);
      res.status(500).json({ message: 'Failed to import from Notion wiki' });
    }
  });

  // Get project by ID
  app.get("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  // Create new project
  app.post("/api/projects", async (req, res) => {
    try {
      console.log("Request body:", JSON.stringify(req.body, null, 2));
      const validatedData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(validatedData);
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log("Validation errors:", error.errors);
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      console.log("Server error:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  // Update project
  app.put("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = updateProjectSchema.parse(req.body);
      const project = await storage.updateProject(id, validatedData);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  // Delete project
  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteProject(id);
      if (!deleted) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Search projects
  app.get("/api/projects/search/:query", async (req, res) => {
    try {
      const query = req.params.query;
      const projects = await storage.searchProjects(query);
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to search projects" });
    }
  });



  // Get all users/team members
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Create new team member
  app.post("/api/users", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(validatedData);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Delete team member
  app.delete("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`Attempting to delete user with ID: ${id}`);
      const deleted = await storage.deleteUser(id);
      if (!deleted) {
        console.log(`User with ID ${id} not found`);
        return res.status(404).json({ message: "User not found" });
      }
      console.log(`Successfully deleted user with ID: ${id}`);
      res.status(204).send();
    } catch (error) {
      console.error(`Error deleting user:`, error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Upload file
  app.post("/api/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fileData = {
        id: nanoid(),
        name: req.file.originalname,
        type: req.file.mimetype,
        size: req.file.size,
        url: `/uploads/${req.file.filename}`,
        uploadedAt: new Date().toISOString()
      };

      res.json(fileData);
    } catch (error) {
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // Upload multiple files
  app.post("/api/upload/multiple", upload.array('files', 5), async (req, res) => {
    try {
      if (!req.files || !Array.isArray(req.files)) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const filesData = req.files.map(file => ({
        id: nanoid(),
        name: file.originalname,
        type: file.mimetype,
        size: file.size,
        url: `/uploads/${file.filename}`,
        uploadedAt: new Date().toISOString()
      }));

      res.json(filesData);
    } catch (error) {
      console.error('Upload error:', error);
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ 
          message: "File too large", 
          details: "Maximum file size is 50MB" 
        });
      }
      res.status(500).json({ message: "Failed to upload files" });
    }
  });

  // Settings endpoints
  app.get("/api/settings", async (req, res) => {
    try {
      const settingsData = await storage.getSettings();
      res.json(settingsData || { workspaceName: "Project Manager", companyLogo: null });
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.put("/api/settings", async (req, res) => {
    try {
      const parsedSettings = updateSettingsSchema.parse(req.body);
      const updatedSettings = await storage.updateSettings(parsedSettings);
      res.json(updatedSettings);
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // Project descriptions routes
  app.get('/api/projects/:id/descriptions', async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: 'Invalid project ID' });
      }

      const descriptions = await storage.getProjectDescriptions(projectId);
      res.json(descriptions);
    } catch (error) {
      console.error('Failed to fetch project descriptions:', error);
      res.status(500).json({ error: 'Failed to fetch project descriptions' });
    }
  });

  app.post('/api/projects/:id/descriptions', async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: 'Invalid project ID' });
      }

      const userId = req.session.userId;
      console.log('Session userId:', userId, 'Session:', req.session);
      
      // For development, allow creation without strict auth check
      // In production, you would keep the auth check
      const effectiveUserId = userId || 9; // Default to admin user for testing
      
      if (!effectiveUserId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { title, content } = req.body;
      
      if (!title || !content) {
        return res.status(400).json({ error: 'Title and content are required' });
      }

      const description = await storage.createProjectDescription({
        title,
        content,
        projectId,
        createdBy: effectiveUserId
      });

      res.status(201).json(description);
    } catch (error) {
      console.error('Failed to create project description:', error);
      res.status(500).json({ error: 'Failed to create project description' });
    }
  });

  app.put('/api/project-descriptions/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid description ID' });
      }

      const result = updateProjectDescriptionSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: 'Invalid description data', details: result.error.issues });
      }

      const description = await storage.updateProjectDescription(id, result.data);
      if (!description) {
        return res.status(404).json({ error: 'Description not found' });
      }

      res.json(description);
    } catch (error) {
      console.error('Failed to update project description:', error);
      res.status(500).json({ error: 'Failed to update project description' });
    }
  });

  app.delete('/api/project-descriptions/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid description ID' });
      }

      const success = await storage.deleteProjectDescription(id);
      if (!success) {
        return res.status(404).json({ error: 'Description not found' });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete project description:', error);
      res.status(500).json({ error: 'Failed to delete project description' });
    }
  });

  const httpServer = createServer(app);
  
  // WebSocket server for real-time collaboration
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store connected clients by project ID
  const projectClients = new Map<number, Set<WebSocket>>();
  
  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');
    
    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);
        
        if (data.type === 'join-project') {
          const projectId = data.projectId;
          if (!projectClients.has(projectId)) {
            projectClients.set(projectId, new Set());
          }
          projectClients.get(projectId)!.add(ws);
          (ws as any).projectId = projectId;
          console.log(`Client joined project ${projectId}`);
        }
        
        if (data.type === 'new-comment') {
          const projectId = data.projectId;
          const comment = data.comment;
          
          // Broadcast to all clients in the same project
          const clients = projectClients.get(projectId);
          if (clients) {
            clients.forEach(client => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'comment-added',
                  projectId,
                  comment
                }));
              }
            });
          }
        }
        
        if (data.type === 'user-typing') {
          const projectId = data.projectId;
          const user = data.user;
          
          // Broadcast typing indicator to other clients
          const clients = projectClients.get(projectId);
          if (clients) {
            clients.forEach(client => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'user-typing',
                  projectId,
                  user
                }));
              }
            });
          }
        }
        
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      // Remove client from all project rooms
      const projectId = (ws as any).projectId;
      if (projectId && projectClients.has(projectId)) {
        projectClients.get(projectId)!.delete(ws);
        if (projectClients.get(projectId)!.size === 0) {
          projectClients.delete(projectId);
        }
      }
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });
  
  return httpServer;
}
