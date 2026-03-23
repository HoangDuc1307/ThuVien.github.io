-- Script to fix unique constraint issue
-- Run this in PostgreSQL if migration doesn't work

-- Drop the old constraint that includes status
ALTER TABLE books_borrowrecord 
DROP CONSTRAINT IF EXISTS books_borrowrecord_user_id_book_id_status_2f20f16d_uniq;

-- The new constraint will be added by migration 0002_fix_unique_constraint

