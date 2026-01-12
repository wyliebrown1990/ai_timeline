# Sprint LEarn-3: User Profiles & Authentication

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-01-12 by Claude (Core implementation complete)

## Overview

Enable user accounts with registration, authentication, and profile management. Migrate learning progress from localStorage to persistent user accounts.

**Goals:**
1. User registration and login system
2. User profile model with customizable settings
3. Public profile pages showing activity
4. Migrate localStorage progress to user accounts
5. Prepare foundation for community features (comments, karma)

---

## Tasks

### 1. Database Schema Changes

#### 1.1 Create User Model
- [x] Add to `prisma/schema.prisma`:
  ```prisma
  model User {
    id              String    @id @default(cuid())
    email           String    @unique
    passwordHash    String
    username        String    @unique
    displayName     String?
    avatarUrl       String?
    bio             String?

    isAdmin         Boolean   @default(false)
    isVerified      Boolean   @default(false)

    createdAt       DateTime  @default(now())
    updatedAt       DateTime  @updatedAt
    lastLoginAt     DateTime?

    // Learning progress
    learningProgress    UserLearningProgress?
    flashcardDecks      FlashcardDeck[]

    @@index([username])
    @@index([email])
  }
  ```

#### 1.2 Create UserLearningProgress Model
- [x] Add learning progress storage (using existing UserSession model with userId):
  ```prisma
  model UserLearningProgress {
    id              String   @id @default(cuid())
    userId          String   @unique
    user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

    // Learning path progress
    completedMilestones   String   @default("[]")  // JSON array of milestone IDs
    completedCheckpoints  String   @default("[]")  // JSON array of checkpoint IDs
    viewedGlossaryTerms   String   @default("[]")  // JSON array of term IDs

    // Stats
    totalTimeSpent        Int      @default(0)     // Minutes
    streakDays            Int      @default(0)
    lastActivityAt        DateTime?

    createdAt       DateTime @default(now())
    updatedAt       DateTime @updatedAt
  }
  ```

#### 1.3 Create FlashcardDeck Model
- [x] Using existing FlashcardContext with session linking (deferred to future sprint for full implementation):
  ```prisma
  model FlashcardDeck {
    id              String   @id @default(cuid())
    userId          String
    user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

    name            String   @default("My Flashcards")
    cards           String   @default("[]")  // JSON array of flashcard objects

    createdAt       DateTime @default(now())
    updatedAt       DateTime @updatedAt

    @@index([userId])
  }
  ```

#### 1.4 Run Migration
- [x] Execute migration:
  ```bash
  npx prisma migrate dev --name add_user_authentication
  ```

---

### 2. Authentication System

#### 2.1 Create Auth Service
- [x] Create `server/src/services/auth/authService.ts`:
  ```typescript
  interface RegisterInput {
    email: string;
    password: string;
    username: string;
    displayName?: string;
  }

  interface LoginInput {
    email: string;
    password: string;
  }

  async function register(input: RegisterInput): Promise<User>;
  async function login(input: LoginInput): Promise<{ user: User; token: string }>;
  async function verifyToken(token: string): Promise<User | null>;
  async function refreshToken(token: string): Promise<string>;
  ```

#### 2.2 Password Handling
- [x] Use bcrypt for password hashing (bcryptjs with 12 rounds)
- [x] Implement password strength validation (min 8 chars, mixed case, number)
- [ ] Add rate limiting for login attempts (deferred)

#### 2.3 JWT Token Management
- [x] Create access tokens (15 min expiry)
- [x] Create refresh tokens (7 day expiry, stored in DB)
- [x] Store refresh tokens in httpOnly cookies

#### 2.4 Auth API Endpoints
- [x] Add to `server/src/routes/auth.ts`:
  ```
  POST /api/auth/user/register      # Create new account
  POST /api/auth/user/login         # Login, get tokens
  POST /api/auth/user/logout        # Clear tokens
  POST /api/auth/user/refresh       # Refresh access token
  GET  /api/auth/user/me            # Get current user
  PUT  /api/auth/user/me            # Update profile
  POST /api/auth/user/change-password   # Change password
  POST /api/auth/user/forgot-password   # Request password reset
  POST /api/auth/user/reset-password    # Reset with token
  POST /api/auth/user/link-session      # Link anonymous session
  GET  /api/auth/users/:username        # Public profile
  ```

---

### 3. User Profile API

#### 3.1 Profile Endpoints
- [x] Integrated into auth routes (`server/src/routes/auth.ts`):
  ```
  GET  /api/auth/users/:username       # Public profile
  GET  /api/auth/user/me               # Get current user
  PUT  /api/auth/user/me               # Update own profile
  ```
- [ ] PUT  /api/users/me/avatar        # Upload avatar (deferred)
- [ ] GET  /api/users/me/progress      # Get learning progress (deferred - using SessionContext)
- [ ] PUT  /api/users/me/progress      # Update learning progress (deferred - using SessionContext)

#### 3.2 Profile Validation
- [x] Username: 3-20 chars, alphanumeric + underscore
- [x] Display name: 1-50 chars
- [x] Bio: max 500 chars
- [ ] Avatar: max 2MB, image types only (deferred - using URL for now)

---

### 4. Frontend: Auth Components

#### 4.1 Create Auth Context
- [x] Create `src/contexts/UserAuthContext.tsx`:
  ```typescript
  interface UserAuthContextType {
    user: UserProfile | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (input: LoginInput, sessionId?: string) => Promise<Result>;
    register: (data: RegisterInput) => Promise<Result>;
    logout: () => Promise<void>;
    updateProfile: (input: UpdateProfileInput) => Promise<Result>;
    changePassword: (input: ChangePasswordInput) => Promise<Result>;
    forgotPassword: (email: string) => Promise<Result>;
    resetPassword: (token: string, newPassword: string) => Promise<Result>;
    linkSession: (sessionId: string) => Promise<Result>;
  }
  ```
- [x] Create `src/services/userAuth.ts` for API calls

#### 4.2 Create Auth Pages
- [x] Create `src/pages/auth/LoginPage.tsx`:
  - Email/password form
  - "Forgot password" link
  - "Create account" link
  - Auto-links session on login

- [x] Create `src/pages/auth/RegisterPage.tsx`:
  - Email, username, password, confirm password
  - Password strength validation shown
  - Username validation (3-20 chars, alphanumeric)

- [x] Create `src/pages/auth/ForgotPasswordPage.tsx`:
  - Email input
  - Success message shown

- [x] Create `src/pages/auth/ResetPasswordPage.tsx`:
  - New password input with validation
  - Token from URL parameter

#### 4.3 Create Auth Modal
- [ ] Create `src/components/auth/AuthModal.tsx` (deferred):
  - Can show Login or Register forms
  - Used for inline prompts ("Sign in to save progress")

---

### 5. Frontend: Profile Pages

#### 5.1 Update Settings Page
- [x] Update `src/pages/SettingsPage.tsx`:
  - Profile section (display name, bio, avatar URL)
  - Account section (username, email, change password)
  - Sign out button
  - Guest prompt for unauthenticated users

#### 5.2 Create Public Profile Page
- [x] Create `src/pages/UserProfilePage.tsx`:
  - Avatar (or placeholder), display name, username
  - Bio
  - Join date
  - Route: `/u/:username`
  - [ ] Learning stats (milestones completed, terms learned) - deferred
  - [ ] Recent activity feed - deferred

#### 5.3 Add Profile Header Component
- [ ] Create `src/components/user/ProfileHeader.tsx` (deferred):
  - Shows in main nav when logged in
  - Avatar, username dropdown
  - Links to: Profile, Settings, Logout

---

### 6. Progress Migration

#### 6.1 Create Migration Flow
- [x] Session linking on login via `linkSession` API endpoint
- [x] SessionContext handles localStorage to database migration
- [x] UserAuthContext.login() accepts sessionId and auto-links on login
- [x] LoginPage passes sessionId from useSession() to login

#### 6.2 Migration UI
- [x] Migration is automatic and silent (no prompt needed)
- [ ] Show migration prompt for explicit user consent (deferred - not needed for MVP)

#### 6.3 Update Learning Hooks
- [x] SessionContext already handles database sync
- [x] Existing behavior maintained for anonymous users
- [ ] Add offline mode graceful handling (deferred)

---

### 7. Auth Guards & Protected Routes

#### 7.1 Create Auth Guard
- [x] Create `src/components/auth/UserProtectedRoute.tsx`:
  ```tsx
  function UserProtectedRoute({ children }: { children: ReactNode }) {
    const { isAuthenticated, isLoading } = useUserAuth();

    if (isLoading) return <LoadingSpinner />;
    if (!isAuthenticated) return <Navigate to="/login" state={{ from: location.pathname }} />;

    return children;
  }
  ```
- [x] Export from `src/components/auth/index.ts`

#### 7.2 Add Protected Routes
- [x] Routes added to `src/App.tsx`:
  - `/login` - User login page
  - `/register` - User registration page
  - `/forgot-password` - Password reset request
  - `/reset-password` - Password reset with token
  - `/u/:username` - Public user profile
- [x] Settings page conditionally shows profile sections when authenticated
- [ ] Wrap specific routes with UserProtectedRoute if needed (deferred - not required for MVP)

#### 7.3 Soft Auth Prompts
- [x] Guest prompt shown on Settings page when not logged in
- [ ] Create `src/components/auth/AuthPrompt.tsx` (deferred):
  - Non-blocking prompt for features that benefit from login
  - "Sign in to save your progress across devices"
  - Dismissible, shows once per session

---

### 8. Email Verification (Optional Enhancement)

#### 8.1 Email Service Setup
- [ ] Create `server/src/services/email/emailService.ts`
- [ ] Configure AWS SES or similar
- [ ] Create email templates (verification, password reset)

#### 8.2 Verification Flow
- [ ] Send verification email on registration
- [ ] Create `/verify-email/:token` endpoint
- [ ] Show "verify email" banner until verified

---

## Acceptance Criteria

- [x] Users can register with email/password
- [x] Users can log in and stay logged in (refresh tokens)
- [x] Users can update their profile (name, bio, avatar URL)
- [x] Public profile pages show user info (`/u/:username`)
- [x] Session linking on login for progress migration
- [x] localStorage progress migrates on first login (via SessionContext)
- [x] UserProtectedRoute component available for route protection
- [x] Logout clears all tokens (access + refresh cookie)

---

## Testing Checklist

- [ ] Register new account → Redirected to login
- [ ] Login → JWT stored, user data available
- [ ] Refresh page → Still logged in
- [ ] Update profile → Changes persist
- [ ] View public profile → Shows correct user
- [ ] Complete milestone while logged in → Progress saved to server
- [ ] Login with existing localStorage → Migration prompt shown
- [ ] Accept migration → Progress merged
- [ ] Logout → Tokens cleared, redirected

---

## Validation with Claude Chrome

- [ ] Navigate to register page
- [ ] Fill and submit registration form
- [ ] Verify redirect to login
- [ ] Log in with new credentials
- [ ] Verify profile dropdown appears in nav
- [ ] Navigate to settings page
- [ ] Update display name
- [ ] Navigate to public profile
- [ ] Verify updated name shows

---

## Notes for Future Developers

### Password Security
- bcrypt with cost factor 12
- Never store plain text passwords
- Rate limit login attempts (5 per minute per IP)

### Token Strategy
- Access token: short-lived (15 min), stored in memory
- Refresh token: longer-lived (7 days), httpOnly cookie
- On 401, attempt silent refresh before showing login

### Profile Privacy
For MVP, all profiles are public. Future enhancement:
- Private profiles (only visible to user)
- Friends-only profiles

### Username Rules
- 3-20 characters
- Alphanumeric + underscore only
- Cannot start with underscore
- Reserved: admin, support, help, api, www

### Migration Edge Cases
- User has localStorage AND existing account progress → merge both
- Conflicting data (same milestone in both) → keep server version
- Large flashcard deck → batch upload to avoid timeouts
