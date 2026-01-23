-- HOTFIX Part 2: Fix files and folders RLS policies to avoid profiles table recursion
-- Replace all policies that check profiles table with auth.users metadata checks

-- ============ FILES TABLE ============

DROP POLICY IF EXISTS "Files viewable by owner or admin" ON files;
DROP POLICY IF EXISTS "Users can update/soft-delete own files" ON files;
DROP POLICY IF EXISTS "Admins can hard delete files" ON files;

-- New non-recursive policies for files
CREATE POLICY "Files viewable by owner" ON files
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all files" ON files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Users can update own files" ON files
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can update all files" ON files
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Admins can delete files" ON files
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- ============ FOLDERS TABLE ============

DROP POLICY IF EXISTS "Folders viewable by owner or admin" ON folders;
DROP POLICY IF EXISTS "Users can update/soft-delete own folders" ON folders;
DROP POLICY IF EXISTS "Admins can hard delete folders" ON folders;

-- New non-recursive policies for folders
CREATE POLICY "Folders viewable by owner" ON folders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all folders" ON folders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Users can update own folders" ON folders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can update all folders" ON folders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Admins can delete folders" ON folders
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );
