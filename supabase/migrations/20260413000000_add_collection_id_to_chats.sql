-- Add collection_id to chats table
ALTER TABLE chats ADD COLUMN collection_id UUID REFERENCES collections(id) ON DELETE SET NULL;
