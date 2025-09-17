# Project Management API Documentation

## Overview
This API provides comprehensive project management functionality with role-based access control, Kanban boards, and activity tracking.

## Authentication
All endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Role-Based Access Control

### System Roles
- **superadmin**: Full access to everything
- **admin**: Can manage all projects and users except superadmins
- **hr**: Can create projects and manage employees
- **client**: Can view assigned projects
- **employee**: Basic project member

### Project Roles
- **owner**: Full control over the project (set when creating project)
- **project_manager**: Can manage project members, boards, and settings
- **developer**: Can create/edit cards and boards
- **designer**: Can create/edit cards and boards
- **tester**: Can create/edit cards and boards
- **viewer**: Can only view project content
- **client_viewer**: Limited view for external clients

## API Endpoints

### Projects (`/api/projects`)

#### Get User's Projects
```
GET /api/projects
Query Parameters:
- status: filter by status (planning, active, on_hold, completed, cancelled)
- priority: filter by priority (low, medium, high, urgent)
- search: search in title, description, tags
- sortBy: sort field (default: createdAt)
- sortOrder: asc/desc (default: desc)
- page: page number (default: 1)
- limit: items per page (default: 10)
```

#### Create Project
```
POST /api/projects
Body:
{
  "title": "Project Name",
  "description": "Project description",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "priority": "high",
  "budget": { "amount": 50000, "currency": "USD" },
  "client": "user_id",
  "tags": ["web", "mobile"],
  "visibility": "team",
  "estimatedHours": 500
}
```

#### Get Project Details
```
GET /api/projects/:projectId
```

#### Update Project
```
PUT /api/projects/:projectId
Body: (same fields as create, all optional)
```

#### Delete Project
```
DELETE /api/projects/:projectId
```

#### Add Project Member
```
POST /api/projects/:projectId/members
Body:
{
  "userId": "user_id",
  "role": "developer"
}
```

#### Update Member Role
```
PUT /api/projects/:projectId/members/:memberId
Body:
{
  "role": "project_manager"
}
```

#### Remove Project Member
```
DELETE /api/projects/:projectId/members/:memberId
```

#### Get Project Activities
```
GET /api/projects/:projectId/activities
Query Parameters:
- limit: number of activities (default: 50)
- skip: skip activities (default: 0)
- types: comma-separated activity types
```

### Boards (`/api/boards`)

#### Get Project Boards
```
GET /api/projects/:projectId/boards
Query Parameters:
- includeArchived: true/false (default: false)
```

#### Create Board
```
POST /api/projects/:projectId/boards
Body:
{
  "title": "Board Name",
  "description": "Board description",
  "color": "#4F46E5",
  "createDefaultLists": true
}
```

#### Get Board Details
```
GET /api/boards/:boardId
```

#### Update Board
```
PUT /api/boards/:boardId
Body:
{
  "title": "Updated Board Name",
  "description": "Updated description",
  "color": "#10B981"
}
```

#### Delete Board
```
DELETE /api/boards/:boardId
```

#### Duplicate Board
```
POST /api/boards/:boardId/duplicate
Body:
{
  "title": "Board Copy",
  "includeCards": false
}
```

### Lists (`/api/lists`)

#### Get Board Lists
```
GET /api/boards/:boardId/lists
Query Parameters:
- includeArchived: true/false
- includeCards: true/false (default: true)
```

#### Create List
```
POST /api/boards/:boardId/lists
Body:
{
  "title": "List Name",
  "description": "List description",
  "color": "#6B7280",
  "listType": "todo"
}
```

#### Update List
```
PUT /api/lists/:listId
Body:
{
  "title": "Updated List Name",
  "color": "#EF4444"
}
```

#### Delete List
```
DELETE /api/lists/:listId
```

#### Move All Cards
```
POST /api/lists/:listId/move-all-cards
Body:
{
  "targetListId": "target_list_id"
}
```

### Cards (`/api/cards`)

#### Get List Cards
```
GET /api/lists/:listId/cards
Query Parameters:
- includeArchived: true/false
- assignedTo: user_id
- priority: low/medium/high/urgent
- status: open/in_progress/review/blocked/completed
```

#### Create Card
```
POST /api/lists/:listId/cards
Body:
{
  "title": "Card Title",
  "description": "Card description",
  "assignedTo": ["user_id1", "user_id2"],
  "priority": "high",
  "dueDate": "2024-01-15",
  "labels": [
    { "name": "Bug", "color": "#EF4444" },
    { "name": "Frontend", "color": "#3B82F6" }
  ]
}
```

#### Get Card Details
```
GET /api/cards/:cardId
```

#### Update Card
```
PUT /api/cards/:cardId
Body: (same fields as create, all optional)
```

#### Delete Card
```
DELETE /api/cards/:cardId
```

#### Assign Users to Card
```
PUT /api/cards/:cardId/assign
Body:
{
  "userIds": ["user_id1", "user_id2"]
}
```

#### Unassign Users from Card
```
PUT /api/cards/:cardId/unassign
Body:
{
  "userIds": ["user_id1"]
}
```

#### Add Comment to Card
```
POST /api/cards/:cardId/comments
Body:
{
  "text": "This is a comment",
  "mentions": ["user_id1"]
}
```

#### Update Comment
```
PUT /api/cards/:cardId/comments/:commentId
Body:
{
  "text": "Updated comment text"
}
```

#### Add Time Entry
```
POST /api/cards/:cardId/time
Body:
{
  "hours": 2.5,
  "description": "Worked on bug fix"
}
```

#### Move Card
```
PUT /api/cards/:cardId/move
Body:
{
  "targetListId": "new_list_id",
  "position": 1
}
```

#### Get My Assigned Cards
```
GET /api/cards/assigned-to-me
Query Parameters:
- status: card status
- priority: card priority
- dueDate: overdue/today/this_week
- page: page number
- limit: items per page
```

### Activities (`/api/activities`)

#### Get Dashboard Activities
```
GET /api/activities/dashboard
Query Parameters:
- limit: number of activities (default: 20)
- skip: skip activities (default: 0)
```

#### Get My Activities
```
GET /api/activities/my-activities
Query Parameters:
- limit: number of activities (default: 50)
- skip: skip activities (default: 0)
- types: comma-separated activity types
- projectId: filter by project
```

#### Get Activity Types
```
GET /api/activities/types
```

#### Get Activity Statistics
```
GET /api/activities/stats
Query Parameters:
- period: today/week/month/year (default: week)
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description"
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

## Real-time Updates

The API includes Socket.IO for real-time updates. Connect to the WebSocket server to receive live notifications for:
- Project updates
- Card assignments
- Comments
- Status changes
- New activities

## Usage Examples

### Creating a Complete Project Workflow

1. **Create Project** (as admin/hr)
2. **Add Members** with appropriate roles
3. **Create Board** with default lists
4. **Create Cards** and assign to team members
5. **Track Progress** through activities and card updates
6. **Monitor** real-time updates via WebSocket

### Role-Based Scenarios

#### As Superadmin/Admin:
- Create any project
- Manage all users and projects
- Access all endpoints

#### As HR:
- Create projects
- Add employees to projects
- Cannot add admin/superadmin roles

#### As Project Manager:
- Manage project members (except other PMs)
- Create/edit boards and cards
- Assign tasks to team

#### As Developer/Designer/Tester:
- View assigned projects
- Create/edit cards
- Add comments and time entries
- Update task status

#### As Client/Viewer:
- View project progress
- Add comments (if permitted)
- Limited editing capabilities

This comprehensive project management system provides enterprise-level functionality with proper role-based security and real-time collaboration features.