-- Add approval system to profiles table
-- Migration: 20260123_add_user_approval_system

-- Add approval fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Create index for faster queries on approval status
CREATE INDEX IF NOT EXISTS idx_profiles_approval_status ON profiles(approval_status);

-- Update existing users to be approved (backward compatibility)
UPDATE profiles 
SET approval_status = 'approved', 
    approved_at = created_at 
WHERE approval_status = 'pending' AND created_at < NOW();

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- Updated RLS: Users can only see their own profile unless admin
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (
    auth.uid() = id OR 
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Policy: Only approved users can insert/update their own data
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (
    auth.uid() = id AND 
    (approval_status = 'approved' OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  );

-- Comment the table for documentation
COMMENT ON COLUMN profiles.approval_status IS 'User approval status: pending, approved, or rejected';
COMMENT ON COLUMN profiles.rejected_at IS 'Timestamp when user was rejected (for 3-day cooldown)';
COMMENT ON COLUMN profiles.approved_by IS 'Admin user ID who approved/rejected this user';
COMMENT ON COLUMN profiles.approved_at IS 'Timestamp when user was approved';
