# HIIT Coach - Personalized HIIT Workout App

## Overview

HIIT Coach is a mobile-first fitness application that generates personalized high-intensity interval training (HIIT) workouts using AI-driven personalization. The app adapts workout difficulty, exercise selection, and framework choices based on user performance history, equipment availability, fitness goals, and recovery status.

The application supports multiple HIIT frameworks (EMOM, Tabata, AMRAP, Circuit) and provides real-time workout guidance with audio/visual cues, exercise videos, and performance tracking. Built as a Progressive Web App with Capacitor support for native iOS/Android deployment.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React 18 with TypeScript
- Vite for build tooling and development server
- Wouter for client-side routing
- TanStack Query (React Query) for server state management
- Tailwind CSS v4 with custom design system
- shadcn/ui component library (Radix UI primitives)
- Framer Motion for animations
- Capacitor for native mobile deployment

**Design Pattern:**
- Mobile-first responsive design with max-width container (max-w-md) centered on desktop
- Custom dark theme with neon accent colors (primary: #00E5FF teal)
- Component-driven architecture with reusable UI primitives
- Global layout wrapper (MobileLayout) with bottom navigation
- Page-based routing with lazy loading and route transitions

**State Management:**
- React Query for API data caching and synchronization
- Local state with useState/useEffect for UI interactions
- Session storage for workout flow continuity
- No global state management library (Redux/Zustand) - relies on React Query cache

**Key UI Components:**
- Equipment selector with icon grid (shared across onboarding and settings)
- Workout timer with audio/visual cues and vibration feedback
- Bottom navigation with context-aware routing
- Card-based layouts with glassmorphism effects

### Backend Architecture

**Technology Stack:**
- Node.js with Express server
- TypeScript across the entire stack
- Drizzle ORM for type-safe database operations
- Neon serverless PostgreSQL database
- Passport.js with Replit OIDC authentication
- Express session with PostgreSQL session store

**API Design:**
- RESTful JSON API with `/api/*` prefix
- Session-based authentication (secure cookies)
- Request validation using Zod schemas
- Centralized error handling with HTTP status codes

**Core Services:**
- Workout generation engine with personalization algorithms
- Performance tracking and analytics
- Recovery and periodization management
- Personal records and mastery scoring
- Framework preference learning

### Data Storage Architecture

**Database Schema (PostgreSQL via Drizzle):**

1. **users** - Authentication and user identity (Replit OIDC integration)
2. **profiles** - User fitness profile, equipment, goals, and skill scores
   - Equipment stored as typed `EquipmentId[]` array
   - Primary goal with secondary goals and weights for AI personalization
   - Skill score (0-100) adjusted after each workout based on performance
3. **workoutSessions** - Completed workout records with metadata
4. **workoutRounds** - Individual exercise rounds within sessions
5. **exerciseStats** - Aggregated performance metrics per exercise
6. **personalRecords** - Best reps/seconds achieved per exercise
7. **exerciseMastery** - Mastery scores (0-100) per exercise for difficulty scaling
8. **muscleGroupRecovery** - Recovery tracking per muscle group
9. **weeklyPeriodization** - Weekly volume tracking for progressive overload
10. **frameworkPreferences** - User preference scores for each HIIT framework
11. **sessions** - Express session storage (connect-pg-simple)

**Data Flow:**
- Workout generation queries profile, history, recovery, and mastery data
- Session completion triggers updates to stats, PRs, mastery, recovery, and periodization tables
- Skill score updated using RPE feedback and hit rate calculations
- Framework preferences learned from completion rates and performance

### Authentication & Authorization

**Strategy:**
- Replit OIDC (OpenID Connect) authentication
- Passport.js middleware with custom OIDC strategy
- Session-based auth with PostgreSQL-backed session store
- Session cookies with 7-day TTL
- `isAuthenticated` middleware protects all `/api/*` routes except auth endpoints

**Problem:**
- Session cookies configured with `secure: true`, which blocks HTTP/localhost development
- Hard-coded HTTPS callback URLs prevent local testing
- Recommendation: Make cookie security environment-dependent

### Workout Generation Algorithm

**Personalization Inputs:**
- User profile (fitness level, equipment, goals, skill score)
- Session intent (energy level, focus areas, notes)
- Performance history (hit rates, skip rates, RPE)
- Recovery status per muscle group
- Exercise mastery scores
- Weekly volume tracking
- Framework preferences
- Streak status

**Framework Selection:**
- Goal-based framework bias (e.g., Tabata for fat loss, EMOM for strength)
- Framework preference scores from history
- Time block performance optimization
- Streak-aware adjustments (easier workouts to maintain streaks)

**Exercise Selection:**
- Filtered by available equipment (typed `EquipmentId[]`)
- Weighted by goal exercise bias (compound/cardio/plyometric/mobility)
- Recovery-aware muscle group targeting
- Mastery-based difficulty scaling
- Progressive overload detection (3+ sessions with >110% hit rate)

**Difficulty Adjustment:**
- Base difficulty from skill score (beginner/intermediate/advanced)
- Equipment richness modifier (fewer equipment = easier scaling)
- Recovery penalty (0-20% reduction for under-recovered muscles)
- Mastery adjustment (+/- 10% based on exercise mastery)
- Volume bias from periodization (prevent overtraining)
- Streak preservation (reduce difficulty if streak at risk)

### External Dependencies

**Third-Party Services:**
- **Neon Database** - Serverless PostgreSQL hosting (`@neondatabase/serverless`)
- **Replit Auth** - OIDC authentication provider
- **YouTube** - Exercise instructional videos (embedded player, fallback to search)

**NPM Packages:**
- **drizzle-orm** / **drizzle-kit** - Database ORM and migrations
- **zod** - Schema validation for API requests and database inserts
- **passport** / **openid-client** - Authentication middleware
- **express-session** / **connect-pg-simple** - Session management
- **@tanstack/react-query** - Client-side data fetching and caching
- **@radix-ui/react-*** - Headless UI component primitives
- **lucide-react** - Icon library
- **framer-motion** - Animation library
- **@capacitor/*** - Native mobile app wrapper (iOS/Android)
- **tailwindcss** - Utility-first CSS framework
- **vite** - Frontend build tool

**Development Tools:**
- **tsx** - TypeScript execution for server
- **esbuild** - Server bundling for production
- **@replit/vite-plugin-*** - Replit-specific development tooling

**Notable Integrations:**
- No external AI API currently (workout generation is algorithmic)
- No email service (no nodemailer usage despite being in dependencies)
- No payment processing (Stripe in dependencies but unused)
- YouTube video embeds for exercise tutorials (client-side only)