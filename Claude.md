# Project Brief: MyCrib Backend & Database Schema

## Context
I'm building a **roommate-finding mobile app** using Expo/React Native with the following features:
- **Chat**: Real-time messaging between potential roommates
- **Matches**: Swipe/browse potential roommates with matching algorithm
- **Marketplace**: List and browse furniture, items for sale/rent
- **Expenses**: Shared expense tracking and splitting between roommates
- **User Profiles**: Detailed profiles with preferences, lifestyle, budget

## Technical Stack
- **Frontend**: Expo Router + React Native (already built)
- **Backend**: Supabase (PostgreSQL database, Auth, Storage, Real-time subscriptions)
- **Authentication**: Supabase Auth + Google OAuth
- **No external APIs**: All functionality through Supabase

## Project Goal
Create a complete Supabase backend with:
1. **Database schema** (tables, relationships, RLS policies)
2. **Database functions** (stored procedures for complex queries)
3. **Real-time subscriptions** setup for chat
4. **Storage buckets** configuration for images
5. **Integration code** for the React Native app

## Constraints & Requirements
- Use Supabase Row Level Security (RLS) for all tables
- Design for scalability (indexes on foreign keys and search fields)
- Follow PostgreSQL best practices
- Keep schema normalized (avoid data duplication)
- Use TypeScript for all integration code
- Include proper error handling
- Write migrations that can be rolled back

## Standard Workflow

### Phase 1: Planning (DO THIS FIRST)
1. **Read the existing codebase** to understand:
   - Current file structure (`app/`, `contexts/`, `types/`)
   - Existing type definitions
   - Current mock data structure
   - UI components and their data requirements

2. **STOP and wait for my approval** before proceeding

### Phase 2: Implementation (After approval)
Work through tasks **one at a time** in this order:

1. **Database Schema**
   - Create SQL migration files in `supabase/migrations/`
   - Include CREATE TABLE, indexes, foreign keys, RLS policies
   - Keep each migration focused (one concern per file)

2. **Database Functions**
   - Create stored procedures for complex queries
   - Functions for matching algorithm, search, etc.

3. **TypeScript Types**
   - Generate types from Supabase schema
   - Update existing types in `/types` folder

4. **Supabase Client Setup**
   - Create `lib/supabase.ts` with client initialization
   - Setup auth helpers

5. **Integration Functions**
   - Create API layer functions in `lib/api/`
   - Separate file per feature (chat, matches, marketplace, expenses)

6. **Update React Hooks**
   - Replace mock data with real Supabase queries
   - Use React Query for data fetching

### Phase 3: Communication Style

**For each task you complete:**
- ✅ Check it off in `projectplan.md`
- Give me a **2-3 sentence summary** of what you did
- Example: "Created users table with RLS policies. Added indexes on email and location fields for faster queries. Set up foreign key to auth.users table."

**Keep changes minimal:**
- One task at a time
- Small, focused commits
- Avoid refactoring existing code unless necessary
- Don't change working code that doesn't need backend integration

**Before making large changes:**
- Explain what you're about to do
- Wait for confirmation if it affects more than 3 files

### Phase 4: Documentation & Review

When all tasks are complete, add to `projectplan.md`:

**## Review & Summary**
- ✅ **Completed**: What was built
- 📋 **Files Changed**: List of new/modified files
- 🔧 **Setup Instructions**: How to run migrations and configure Supabase
- ⚠️ **Known Issues**: Any limitations or TODOs
- 📚 **Next Steps**: Recommended follow-up work

**## Testing Checklist**
- [ ] All migrations run successfully
- [ ] RLS policies tested with different user roles
- [ ] Real-time subscriptions working
- [ ] File uploads to storage working
- [ ] Auth flow (signup, login, logout) tested

## Key Priorities
1. **Security First**: Every table must have RLS policies
2. **Simplicity**: Prefer simple solutions over clever ones
3. **Type Safety**: Generate and use TypeScript types
4. **Real-time Ready**: Design for real-time where needed (chat)
5. **Mobile Optimized**: Consider offline-first where possible

## Questions to Answer During Planning
- What are the core entities? (User, Match, Chat, Message, Listing, Expense, etc.)
- What are the relationships between them?
- Which tables need real-time updates?
- What queries will be most common? (optimize with indexes)
- What user roles exist? (regular user, admin, etc.)
- What data needs to be public vs private?

## Example Database Tables to Consider
- `profiles` - Extended user data beyond auth.users
- `matches` - Potential roommate matches
- `conversations` - Chat threads
- `messages` - Individual messages
- `listings` - Marketplace items
- `expenses` - Shared expenses
- `expense_splits` - Who owes what
- `preferences` - User matching preferences
- `swipes` - Like/dislike history

## Success Criteria
✅ Database schema is complete and normalized
✅ All tables have RLS policies
✅ Migrations are tested and reversible
✅ TypeScript types are generated
✅ API functions are typed and working
✅ Real-time chat is functional
✅ Auth flow is complete
✅ Documentation is clear

---

**START by creating the projectplan.md and STOP for my review.**