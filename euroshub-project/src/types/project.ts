export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'superadmin' | 'admin' | 'hr' | 'employee' | 'client';
  avatar?: string;
}

export interface ProjectMember {
  _id: string;
  user: User;
  role: 'project_manager' | 'developer' | 'designer' | 'tester' | 'viewer' | 'client_viewer';
  joinedAt: string;
  addedBy: User;
}

export interface Project {
  _id: string;
  title: string;
  description?: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  startDate: string;
  endDate?: string;
  estimatedHours: number;
  actualHours: number;
  budget: {
    amount: number;
    currency: 'USD' | 'EUR' | 'GBP' | 'PKR';
  };
  client?: User;
  owner: User;
  members: ProjectMember[];
  tags: string[];
  isArchived: boolean;
  visibility: 'private' | 'team' | 'company';
  metadata: {
    totalTasks: number;
    completedTasks: number;
    totalBoards: number;
  };
  completionPercentage: number;
  isOverdue: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Board {
  _id: string;
  title: string;
  description?: string;
  project: string | Project;
  createdBy: User;
  isDefault: boolean;
  color: string;
  position: number;
  isArchived: boolean;
  settings: {
    allowComments: boolean;
    allowAttachments: boolean;
    autoArchive: boolean;
    cardLimit: number;
  };
  metadata: {
    totalLists: number;
    totalCards: number;
    completedCards: number;
  };
  completionPercentage: number;
  lists?: List[];
  createdAt: string;
  updatedAt: string;
}

export interface List {
  _id: string;
  title: string;
  description?: string;
  board: string | Board;
  project: string | Project;
  createdBy: User;
  position: number;
  color: string;
  listType: 'todo' | 'in_progress' | 'review' | 'done' | 'custom';
  isArchived: boolean;
  metadata: {
    cardCount: number;
    completedCards: number;
  };
  cards?: Card[];
  createdAt: string;
  updatedAt: string;
}

export interface Label {
  name: string;
  color: string;
}

export interface ChecklistItem {
  _id: string;
  text: string;
  completed: boolean;
  completedAt?: string;
  completedBy?: User;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  _id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  url: string;
  uploadedBy: User;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  _id: string;
  text: string;
  author: User;
  mentions: User[];
  isEdited: boolean;
  editedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimeEntry {
  _id: string;
  user: User;
  hours: number;
  description?: string;
  date: string;
}

export interface TimeTracking {
  estimated: number;
  spent: number;
  remaining?: number;
  entries: TimeEntry[];
}

export interface CustomField {
  name: string;
  value: any;
  type: 'text' | 'number' | 'date' | 'boolean' | 'select';
}

export interface Card {
  _id: string;
  title: string;
  description?: string;
  list: string | List;
  board: string | Board;
  project: string | Project;
  createdBy: User;
  assignedTo: User[];
  watchers: User[];
  position: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'review' | 'blocked' | 'completed';
  dueDate?: string;
  startDate?: string;
  completedAt?: string;
  completedBy?: User;
  labels: Label[];
  checklist: ChecklistItem[];
  attachments: Attachment[];
  comments: Comment[];
  timeTracking?: TimeTracking;
  customFields: CustomField[];
  isArchived: boolean;
  archivedAt?: string;
  archivedBy?: User;
  isOverdue: boolean;
  checklistCompletion: number;
  totalTimeSpent: number;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  _id: string;
  type: string;
  description: string;
  user: User;
  project?: Project;
  board?: Board;
  list?: List;
  card?: Card;
  metadata?: any;
  createdAt: string;
}

export interface CreateProjectData {
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  budget?: {
    amount: number;
    currency: 'USD' | 'EUR' | 'GBP' | 'PKR';
  };
  client?: string;
  tags?: string[];
  visibility: 'private' | 'team' | 'company';
  estimatedHours?: number;
}

export interface CreateBoardData {
  title: string;
  description?: string;
  color?: string;
  createDefaultLists?: boolean;
}

export interface CreateListData {
  title: string;
  description?: string;
  color?: string;
  listType?: 'todo' | 'in_progress' | 'review' | 'done' | 'custom';
}

export interface CreateCardData {
  title: string;
  description?: string;
  assignedTo?: string[];
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  labels?: Label[];
  checklist?: Omit<ChecklistItem, '_id' | 'createdAt' | 'updatedAt'>[];
}

export interface MoveCardData {
  targetListId: string;
  position?: number;
}

export interface AssignCardData {
  userIds: string[];
}

export interface AddCommentData {
  text: string;
  mentions?: string[];
}

export interface AddTimeEntryData {
  hours: number;
  description?: string;
}