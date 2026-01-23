-- Create a table for public profiles linkable to auth.users
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  role text check (role in ('admin', 'user')) default 'user',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Config RLS for profiles
alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);

-- Create a table for folders
create table folders (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references profiles(id) on delete cascade not null,
    parent_id uuid references folders(id) on delete cascade,
    name text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    deleted_at timestamp with time zone
);

-- Enable RLS for folders
alter table folders enable row level security;

-- Create a table for files
create table files (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  folder_id uuid references folders(id) on delete cascade,
  name text not null,
  size bigint not null,
  type text not null,
  s3_key text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  deleted_at timestamp with time zone
);

-- Config RLS for files
alter table files enable row level security;

-- Policies for Folders

-- Admin can see all folders
-- Users can see their own folders (regardless of deleted status - client filters)
create policy "Folders viewable by owner or admin" on folders
    for select using (
        auth.uid() = user_id OR 
        EXISTS (select 1 from profiles where id = auth.uid() and role = 'admin')
    );

create policy "Users can insert own folders" on folders
    for insert with check (auth.uid() = user_id);

-- Soft Delete: Users can update deleted_at
create policy "Users can update/soft-delete own folders" on folders
    for update using (
        auth.uid() = user_id or 
        exists (select 1 from profiles where id = auth.uid() and role = 'admin')
    );

create policy "Admins can hard delete folders" on folders
    for delete using (
        exists (select 1 from profiles where id = auth.uid() and role = 'admin')
    );


-- Policies for Files

-- Admin can see all files
-- Users can see their own files (regardless of deleted status - client filters)
create policy "Files viewable by owner or admin" on files
  for select using (
    auth.uid() = user_id OR 
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Users can insert their own files
create policy "Users can insert own files" on files
  for insert with check (auth.uid() = user_id);

-- Soft Delete: Users can update deleted_at
create policy "Users can update/soft-delete own files" on files
  for update using (
    auth.uid() = user_id or 
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Admins can hard delete files
create policy "Admins can hard delete files" on files
  for delete using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Function to handle new user signup
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create profile on signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();