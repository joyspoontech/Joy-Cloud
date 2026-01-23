-- HOTFIX Part 4: Fix admin RLS policies to check profiles.role correctly
-- Admin role is stored in profiles table, not auth.users metadata

-- ============ PROFILES TABLE ============

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Admins can view all profiles (safe to check profiles for admin-only policy)
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
  );

-- Admins can update all profiles
CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE USING (
    (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
  );

-- ============ FILES TABLE ============

DROP POLICY IF EXISTS "Admins can view all files" ON files;
DROP POLICY IF EXISTS "Admins can update all files" ON files;
DROP POLICY IF EXISTS "Admins can delete files" ON files;

-- Admins can view all files
CREATE POLICY "Admins can view all files" ON files
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
  );

-- Admins can update all files
CREATE POLICY "Admins can update all files" ON files
  FOR UPDATE USING (
    (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
  );

-- Admins can delete files
CREATE POLICY "Admins can delete files" ON files
  FOR DELETE USING (
    (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
  );

-- ============ FOLDERS TABLE ============

DROP POLICY IF EXISTS "Admins can view all folders" ON folders;
DROP POLICY IF EXISTS "Admins can update all folders" ON folders;
DROP POLICY IF EXISTS "Admins can delete folders" ON folders;

-- Admins can view all folders
CREATE POLICY "Admins can view all folders" ON folders
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
  );

-- Admins can update all folders
CREATE POLICY "Admins can update all folders" ON folders
  FOR UPDATE USING (
    (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
  );

-- Admins can delete folders
CREATE POLICY "Admins can delete folders" ON folders
  FOR DELETE USING (
    (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
  );
