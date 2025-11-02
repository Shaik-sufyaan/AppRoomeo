-- =====================================================
-- ADD MESSAGE TYPE COLUMN
-- =====================================================
-- Adds support for different message types (text, split_request, system)

-- Add type column to messages table
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'text'
CHECK (type IN ('text', 'split_request', 'system'));

-- Add index for filtering by type
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(type);

-- Add comment
COMMENT ON COLUMN messages.type IS 'Type of message: text (regular), split_request (contains split), system (system message)';
