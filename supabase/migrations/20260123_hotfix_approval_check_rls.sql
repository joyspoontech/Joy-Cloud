-- HOTFIX Part 3: Add approval status check to files and folders RLS
-- Users must be approved to access their files/folders

-- ============ FILES TABLE ============

DROP POLICY IF EXISTS "Files viewable by owner" ON files;
DROP POLICY IF EXISTS "Users can update own files" ON files;

-- Files: Only approved users can access their own files
CREATE POLICY "Files viewable by approved owner" ON files
  FOR SELECT USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.approval_status = 'approved'
    )
  );

-- Files: Only approved users can update their own files
CREATE POLICY "Approved users can update own files" ON files
  FOR UPDATE USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.approval_status = 'approved'
    )
  );

-- ============ FOLDERS TABLE ============

DROP POLICY IF EXISTS "Folders viewable by owner" ON folders;
DROP POLICY IF EXISTS "Users can update own folders" ON folders;

-- Folders: Only approved users can access their own folders
CREATE POLICY "Folders viewable by approved owner" ON folders
  FOR SELECT USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.approval_status = 'approved'
    )
  );

-- Folders: Only approved users can update their own folders
CREATE POLICY "Approved users can update own folders" ON folders
  FOR UPDATE USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.approval_status = 'approved'
    )
  );
