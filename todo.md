# Caller Tracking System - Development TODO

## Phase 1: Database & Backend Setup

- [x] Create Drizzle schema with agents, phone_numbers, call_logs, callback_queue, and statistics tables
- [x] Generate and execute Drizzle migration SQL
- [x] Create database helper functions for agents (CRUD, role management)
- [x] Create database helper functions for phone numbers (assign, track, list)
- [x] Create database helper functions for call logs (create, list, filter by agent)
- [x] Create database helper functions for callback queue (create, list, mark complete, filter by agent)
- [x] Create database helper functions for statistics (total calls, calls per agent, completion rate)

## Phase 2: Authentication & Authorization

- [x] Implement username/password authentication (replace OAuth with local auth)
- [x] Create login procedure with credential validation
- [x] Create logout procedure
- [x] Implement session management with JWT tokens
- [x] Create protectedProcedure for agent-only operations
- [x] Create adminProcedure for admin-only operations
- [x] Add role-based access control (agent vs admin)
- [x] Ensure agents can only view their own data

## Phase 3: Admin Dashboard - Backend

- [x] Create tRPC procedure for agent management (list, create, edit, deactivate)
- [x] Create tRPC procedure for phone number management (assign, list, track)
- [x] Create tRPC procedure for system overview statistics
- [x] Create tRPC procedure for agent performance metrics

## Phase 4: Agent Interface - Backend

- [x] Create tRPC procedure for call log creation (incoming/outgoing)
- [x] Create tRPC procedure for call log listing (agent-specific)
- [x] Create tRPC procedure for callback queue creation
- [x] Create tRPC procedure for callback queue listing (agent-specific)
- [x] Create tRPC procedure for marking callbacks as completed
- [x] Create tRPC procedure for callback priority/time updates

## Phase 5: Frontend - Authentication

- [ ] Build login page with username/password form
- [ ] Implement login logic with error handling
- [ ] Create logout functionality
- [ ] Build session persistence with JWT tokens
- [ ] Create protected routes for authenticated users
- [ ] Implement role-based route protection

## Phase 6: Frontend - Admin Dashboard

- [ ] Build admin layout with sidebar navigation
- [ ] Create agent management page (list, create, edit, deactivate)
- [ ] Create phone number management page (assign, track, list)
- [ ] Create system overview page with key metrics
- [ ] Implement admin-only access control

## Phase 7: Frontend - Agent Interface

- [ ] Build agent layout with navigation
- [ ] Create call log entry form (caller info, duration, notes, outcome)
- [ ] Create call log listing page with filters
- [ ] Create callback queue entry form (caller info, scheduled time, priority)
- [ ] Create callback queue listing page with status tracking
- [ ] Implement mark-as-completed functionality for callbacks

## Phase 8: Frontend - Statistics Dashboard

- [ ] Create real-time statistics page
- [ ] Display total calls metric
- [ ] Display calls per agent metric
- [ ] Display callback completion rate metric
- [ ] Create daily call chart
- [ ] Create weekly call chart
- [ ] Create agent performance chart

## Phase 9: Frontend - Styling & UX

- [ ] Apply Scandinavian minimalist design (white/light gray palette)
- [ ] Implement subtle typography and soft shadows
- [ ] Ensure responsive design for mobile and tablet
- [ ] Add loading states and empty states
- [ ] Implement error handling UI
- [ ] Test accessibility (keyboard navigation, color contrast)

## Phase 10: Testing & Deployment

- [ ] Write vitest tests for authentication procedures
- [ ] Write vitest tests for agent management procedures
- [ ] Write vitest tests for call log procedures
- [ ] Write vitest tests for callback queue procedures
- [ ] Write vitest tests for statistics procedures
- [ ] Run full test suite
- [ ] Save final checkpoint
- [ ] Push to GitHub repository

