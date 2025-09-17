# EUROSHUB

A comprehensive project management platform with integrated Kanban boards, user management, and real-time collaboration features.

## Features

- **Project Management**: Create, manage, and track projects with detailed dashboards
- **Kanban Boards**: Interactive boards with drag-and-drop functionality for task management
- **User Management**: Role-based access control with superadmin, admin, and user roles
- **Authentication**: Secure JWT-based authentication with session management
- **Real-time Updates**: Socket.io integration for live collaboration
- **Activity Tracking**: Comprehensive activity logs for all project actions

## Tech Stack

### Frontend
- **Next.js 15.5.2**: React framework with Turbopack
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **React Beautiful DnD**: Drag and drop functionality for Kanban boards

### Backend
- **Node.js**: Runtime environment
- **Express.js**: Web application framework
- **MongoDB**: NoSQL database with Mongoose ODM
- **Socket.io**: Real-time bidirectional communication
- **JWT**: JSON Web Token authentication

## Project Structure

```
EUROSHUB - ALONE/
├── euroshub-project/          # Frontend (Next.js)
│   ├── src/
│   │   ├── app/              # App router pages
│   │   ├── components/       # Reusable components
│   │   ├── hooks/           # Custom React hooks
│   │   └── lib/             # Utility functions
│   └── package.json
├── server/                   # Backend (Node.js/Express)
│   ├── config/              # Database and socket configuration
│   ├── middleware/          # Authentication and validation
│   ├── models/              # MongoDB schemas
│   ├── routes/              # API endpoints
│   └── server.js
└── README.md
```

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd EUROSHUB\ -\ ALONE
   ```

2. **Backend Setup**
   ```bash
   cd server
   npm install
   ```

3. **Frontend Setup**
   ```bash
   cd euroshub-project
   npm install
   ```

4. **Environment Configuration**

   Create `.env` file in the server directory:
   ```env
   NODE_ENV=development
   PORT=5001
   MONGODB_URI=mongodb://localhost:27017/euroshub
   JWT_SECRET=your_jwt_secret_key
   JWT_EXPIRE=7d
   ```

### Running the Application

1. **Start the Backend Server**
   ```bash
   cd server
   npm start
   ```
   The API server will run on `http://localhost:5001`

2. **Start the Frontend Development Server**
   ```bash
   cd euroshub-project
   npm run dev
   ```
   The frontend will run on `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Projects
- `GET /api/projects` - Get user projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Boards
- `GET /api/projects/:projectId/boards` - Get project boards
- `POST /api/projects/:projectId/boards` - Create new board
- `GET /api/boards/:id` - Get board details
- `PUT /api/boards/:id` - Update board
- `DELETE /api/boards/:id` - Delete board

### User Management
- `GET /api/users` - Get all users (admin only)
- `POST /api/users` - Create new user (admin only)
- `PUT /api/users/:id` - Update user (admin only)
- `DELETE /api/users/:id` - Delete user (admin only)

## User Roles

- **SuperAdmin**: Full system access, can manage all users and projects
- **Admin**: Can manage users within their organization
- **User**: Basic access to assigned projects and boards

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Create a Pull Request

## License

This project is licensed under the MIT License.