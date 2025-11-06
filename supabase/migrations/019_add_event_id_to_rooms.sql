-- =====================================================
-- ADD EVENT LINKING TO EXPENSE ROOMS
-- =====================================================
-- Migration: 019_add_event_id_to_rooms.sql
-- Description: Add event_id column to expense_rooms for linking rooms to events

-- Add event_id column to expense_rooms
ALTER TABLE expense_rooms
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES expense_events(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_expense_rooms_event_id ON expense_rooms(event_id);

-- Add comment
COMMENT ON COLUMN expense_rooms.event_id IS 'Optional link to an event if this room was created for a specific event';
