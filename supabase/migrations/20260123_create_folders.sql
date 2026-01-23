-- Create a table for folders
create table folders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  parent_id uuid references folders(id) on delete cascade,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for folders
alter table folders enable row level security;

-- Policies for folders
create policy "Folders viewable by owner or admin" on folders
  for select using (
    auth.uid() = user_id or 
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Users can insert own folders" on folders
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own folders" on folders
  for delete using (
    auth.uid() = user_id or 
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Add folder_id to files
alter table files add column folder_id uuid references folders(id) on delete cascade;
