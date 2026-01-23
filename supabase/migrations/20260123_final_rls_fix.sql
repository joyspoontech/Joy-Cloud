-- FINAL FIX: Use security definer function to check roles without RLS recursion
-- This function bypasses RLS to safely check if a user is an admin

-- Create a function to check if current user is admin (bypasses RLS)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============ PROFILES TABLE ============

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Simple policies without recursion
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (is_admin());

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE USING (is_admin());

-- ============ FILES TABLE ============

DROP POLICY IF EXISTS "Files viewable by approved owner" ON files;
DROP POLICY IF EXISTS "Admins can view all files" ON files;
DROP POLICY IF EXISTS "Approved users can update own files" ON files;
DROP POLICY IF EXISTS "Admins can update all files" ON files;
DROP POLICY IF EXISTS "Admins can delete files" ON files;

CREATE POLICY "Users can view own files" ON files
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all files" ON files
  FOR SELECT USING (is_admin());

CREATE POLICY "Users can update own files" ON files
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can update all files" ON files
  FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can delete files" ON files
  FOR DELETE USING (is_admin());

CREATE POLICY "Users can insert own files" ON files
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============ FOLDERS TABLE ============

DROP POLICY IF EXISTS "Folders viewable by approved owner" ON folders;
DROP POLICY IF EXISTS "Admins can view all folders" ON folders;
DROP POLICY IF EXISTS "Approved users can update own folders" ON folders;
DROP POLICY IF EXISTS "Admins can update all folders" ON folders;
DROP POLICY IF EXISTS "Admins can delete folders" ON folders;

CREATE POLICY "Users can view own folders" ON folders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all folders" ON folders
  FOR SELECT USING (is_admin());

CREATE POLICY "Users can update own folders" ON folders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can update all folders" ON folders
  FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can delete folders" ON folders
  FOR DELETE USING (is_admin());

CREATE POLICY "Users can insert own folders" ON folders
  FOR INSERT WITH CHECK (auth.uid() = user_id);
