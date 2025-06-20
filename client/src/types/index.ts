export interface Project {
  id: number;
  title: string;
  description: any; // Rich text content
  status: 'planning' | 'in-progress' | 'completed' | 'urgent' | 'review';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  startDate: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: number;
  teamMembers: number[];
  attachments: FileAttachment[];
}

export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  avatar: string | null;
  color: string;
}

export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedAt: string;
}

export interface CreateProjectData {
  title: string;
  description: any;
  status: string;
  priority: string;
  startDate: string | null;
  dueDate: string | null;
  createdBy: number;
  teamMembers: number[];
  attachments: FileAttachment[];
}
