// Shared Types for Boards Module

// User and Authentication Types
export type UserRole = 'superadmin' | 'admin' | 'client' | 'hr' | 'employee';

export interface User {
  id: string;
  _id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
}

// Board Member Types
export interface BoardMember {
  userId?: User;
  role: 'owner' | 'admin' | 'member' | 'viewer' | 'editor';
  joinedAt: Date;
}

// Board Types
export interface Board {
  _id: string;
  name: string;
  description?: string;
  background: string;
  visibility: 'private' | 'team' | 'public';
  createdBy?: User;
  members?: BoardMember[];
  lists?: ListData[];
  listsCount?: number;
  cardsCount?: number;
  isStarred?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// List Types
export interface ListData {
  _id: string;
  name: string;
  position: number;
  boardId: string;
  cards?: Card[];
  createdAt: Date;
  updatedAt: Date;
}

// Card Types
export interface Card {
  _id: string;
  title: string;
  description?: string;
  position: number;
  listId: string;
  boardId: string;
  assignedTo?: User[];
  dueDate?: Date;
  labels?: Label[];
  attachments?: Attachment[];
  checklist?: ChecklistItem[];
  createdBy?: User;
  createdAt: Date;
  updatedAt: Date;
}

// Supporting Types
export interface Label {
  _id: string;
  name: string;
  color: string;
}

export interface Attachment {
  _id: string;
  name: string;
  url: string;
  type: string;
  uploadedAt: Date;
  uploadedBy: User;
}

export interface ChecklistItem {
  _id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
}

// Form Data Types
export interface CreateBoardData {
  name: string;
  description?: string;
  background?: string;
}

export interface UpdateBoardData extends Partial<CreateBoardData> {
  visibility?: Board['visibility'];
}

export interface CreateListData {
  name: string;
  position: number;
}

export interface UpdateListData extends Partial<CreateListData> {
  color?: string;
}

export interface CreateCardData {
  title: string;
  description?: string;
  position: number;
}

export interface UpdateCardData extends Partial<CreateCardData> {
  assignedTo?: string[];
  dueDate?: Date;
  labels?: string[];
}

// Component Props Types
export interface BoardCardProps {
  board: Board;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onStar: (id: string) => void;
  canEdit: boolean;
  canDelete: boolean;
  canArchive: boolean;
}

export interface BoardManagementProps {
  userRole: UserRole;
  baseUrl: string;
}

export interface BoardViewProps {
  boardId: string;
  userRole: UserRole;
  baseUrl: string;
}

// Modal Props Types
export interface CreateBoardModalProps {
  onClose: () => void;
  onSubmit: (data: CreateBoardData) => Promise<void> | void;
}

export interface BoardMembersModalProps {
  board: Board;
  onClose: () => void;
  canManageMembers: boolean;
}

// Filter and View Types
export type ViewMode = 'grid' | 'list';
export type FilterType = 'all' | 'starred' | 'recent' | 'archived';
export type SortOption = 'name' | 'created' | 'updated' | 'activity';

export interface BoardFilters {
  search: string;
  filter: FilterType;
  sort: SortOption;
  view: ViewMode;
}

// Permission Types
export interface Permissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canArchive: boolean;
  canCreateLists: boolean;
  canManageMembers: boolean;
  canStar: boolean;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Error Types
export interface BoardError {
  type: 'permission' | 'network' | 'validation' | 'general';
  message: string;
  details?: unknown;
}

// Drag and Drop Types
export interface DragDropResult {
  draggableId: string;
  type: string;
  source: {
    droppableId: string;
    index: number;
  };
  destination?: {
    droppableId: string;
    index: number;
  } | null;
}

// Loading States
export interface LoadingStates {
  board: boolean;
  lists: boolean;
  cards: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
}