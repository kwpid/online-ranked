# Gaming Social Platform

## Overview

A modern gaming social platform inspired by Rocket League's UI design, enabling players to connect, form parties, and interact with friends. The application features a dark, sleek interface optimized for gaming environments with Google authentication via Firebase, real-time party management, and social features like friend requests and notifications.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React with TypeScript for type-safe component development
- Vite as the build tool and development server
- Wouter for lightweight client-side routing
- TanStack Query for server state management
- Shadcn UI component library with Radix UI primitives
- Tailwind CSS for styling with custom gaming-themed design system

**Design System:**
- Dark mode primary with gaming-optimized color palette
- Rocket League-inspired UI with bottom-left navigation pattern
- Custom color scheme: deep charcoal backgrounds (220 15% 8%), primary blue accents (210 90% 55%), status indicators (green/orange/red)
- Typography: Inter for body text, Rajdhani for display/headers with uppercase styling
- Spacing system based on 2-24 unit scale for consistent layouts

**Component Structure:**
- Protected routes with authentication guards
- Context-based authentication state management (AuthContext)
- Reusable UI components from Shadcn/Radix UI library
- Custom gaming components: PartyMemberCard, PlayerCard, FriendsSidebar
- Modal-based interactions for Profile and Settings

### Backend Architecture

**Server Framework:**
- Express.js as the web server
- TypeScript for type safety across the stack
- Development: Vite middleware integration for HMR
- Production: Static file serving from dist/public

**API Structure:**
- RESTful API with /api prefix convention
- Request/response logging middleware
- Error handling middleware with status codes
- Placeholder storage interface (IStorage) for future database integration

**Storage Layer:**
- In-memory storage implementation (MemStorage) as placeholder
- Designed for easy swap to persistent database (Drizzle ORM configured for PostgreSQL)
- CRUD operations abstracted behind IStorage interface

### Authentication & User Management

**Firebase Authentication:**
- Google OAuth sign-in with redirect flow
- Firebase SDK for authentication state management
- Firestore for user profile storage
- Username generation from email (can be changed weekly)
- User status tracking (online/away/busy/offline)

**User Profile Schema:**
- Firebase UID as primary identifier
- Email, username, displayName, photoURL
- Status and activity tracking
- Username change cooldown (7 days)
- Optional title and banner fields (coming soon)

### Real-Time Features

**Firestore Real-Time Listeners:**
- Party membership updates via onSnapshot
- Friend list synchronization
- Friend request notifications
- Activity status updates

**Party System:**
- Dynamic party creation and management
- Leader promotion on member leave
- Automatic party deletion when empty
- Party invitation system
- Member kick functionality for leaders

### Social Features

**Friend System:**
- Friend request workflow (pending/accepted/declined)
- Friend list with online status
- Recently played with tracking
- Friend removal capability

**Notification System:**
- Friend requests
- Party invitations
- System notifications
- Toast-based UI notifications

## External Dependencies

**Firebase Services:**
- Firebase Authentication (Google OAuth provider)
- Cloud Firestore (NoSQL database for user profiles, parties, friend requests, notifications)
- Firebase SDK v12.4.0
- Configuration via environment variables (VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_APP_ID)

**Database (Configured but not yet implemented):**
- Drizzle ORM configured for PostgreSQL via @neondatabase/serverless
- Schema defined in shared/schema.ts with Zod validation
- Migration system ready via drizzle-kit

**UI Component Libraries:**
- Radix UI primitives for accessible components (dialogs, dropdowns, avatars, etc.)
- Shadcn UI configuration for consistent component styling
- Lucide React for icons

**State Management:**
- TanStack React Query for server state
- React Context for authentication state
- Real-time Firestore subscriptions for live data

**Development Tools:**
- Replit-specific plugins for development (cartographer, dev-banner, runtime-error-modal)
- TypeScript for type checking
- ESBuild for production bundling

**Third-Party Services:**
- Google Fonts (Inter, Rajdhani)
- Firebase Hosting infrastructure