create table shared_links (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  folder_id uuid references folders(id) on delete cascade,
  file_id uuid references files(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  -- Ensure it points to either a file or a folder, but not both or neither
  constraint shared_target_check check (
    (folder_id is null and file_id is not null) or
    (folder_id is not null and file_id is null)
  )
);

alter table shared_links enable row level security;

create policy "Users can view their own shared links" on shared_links
  for select using (auth.uid() = user_id);

create policy "Users can insert their own shared links" on shared_links
  for insert with check (auth.uid() = user_id);

create policy "Users can delete their own shared links" on shared_links
  for delete using (auth.uid() = user_id);

-- SECURE FUNCTIONS FOR PUBLIC ACCESS

-- Get public share details (verifies link, and fetches target info)
create or replace function get_public_share_details(p_share_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_share shared_links;
  v_folder folders;
  v_file files;
  v_result jsonb;
begin
  select * into v_share from shared_links where id = p_share_id;
  
  if not found then
    return null;
  end if;

  if v_share.folder_id is not null then
    select * into v_folder from folders where id = v_share.folder_id and deleted_at is null;
    if not found then return null; end if;
    v_result := jsonb_build_object(
      'type', 'folder',
      'id', v_folder.id,
      'name', v_folder.name,
      'created_at', v_folder.created_at
    );
  else
    select * into v_file from files where id = v_share.file_id and deleted_at is null;
    if not found then return null; end if;
    v_result := jsonb_build_object(
      'type', 'file',
      'id', v_file.id,
      'name', v_file.name,
      'size', v_file.size,
      'created_at', v_file.created_at
    );
  end if;

  return v_result;
end;
$$;

-- Get folder contents securely if inside a shared folder
create or replace function get_public_folder_contents(p_share_id uuid, p_target_folder_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_share shared_links;
  v_is_valid boolean := false;
  v_folders jsonb;
  v_files jsonb;
begin
  -- 1. Validate the share
  select * into v_share from shared_links where id = p_share_id;
  if not found or v_share.folder_id is null then
    return null;
  end if;

  -- 2. Validate p_target_folder_id is a descendant of v_share.folder_id
  -- If target is the shared folder itself, valid.
  if p_target_folder_id = v_share.folder_id then
    v_is_valid := true;
  else
    -- Check if target is a child/descendant
    with recursive folder_tree as (
      select id from folders where id = v_share.folder_id and deleted_at is null
      union all
      select f.id from folders f
      inner join folder_tree ft on f.parent_id = ft.id
      where f.deleted_at is null
    )
    select true into v_is_valid from folder_tree where id = p_target_folder_id;
  end if;

  if not coalesce(v_is_valid, false) then
    return null;
  end if;

  -- 3. Fetch contents of p_target_folder_id
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'name', name, 'created_at', created_at, 'type', 'folder'
  )), '[]'::jsonb)
  into v_folders
  from folders
  where parent_id = p_target_folder_id and deleted_at is null;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'name', name, 'size', size, 'created_at', created_at, 'type', 'file'
  )), '[]'::jsonb)
  into v_files
  from files
  where folder_id = p_target_folder_id and deleted_at is null;

  return jsonb_build_object(
    'folders', v_folders,
    'files', v_files
  );
end;
$$;

-- Securely get file download details if inside a shared folder OR directly shared
create or replace function get_public_file_download_details(p_share_id uuid, p_target_file_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_share shared_links;
  v_file files;
  v_is_valid boolean := false;
begin
  select * into v_share from shared_links where id = p_share_id;
  if not found then return null; end if;

  select * into v_file from files where id = p_target_file_id and deleted_at is null;
  if not found then return null; end if;

  if v_share.file_id = p_target_file_id then
    v_is_valid := true;
  elsif v_share.folder_id is not null then
    -- Verify file is inside the shared folder tree
    if v_file.folder_id = v_share.folder_id then
      v_is_valid := true;
    else
      with recursive folder_tree as (
        select id from folders where id = v_share.folder_id and deleted_at is null
        union all
        select f.id from folders f
        inner join folder_tree ft on f.parent_id = ft.id
        where f.deleted_at is null
      )
      select true into v_is_valid from folder_tree where id = v_file.folder_id;
    end if;
  end if;

  if not coalesce(v_is_valid, false) then
    return null;
  end if;

  return jsonb_build_object(
    's3_key', v_file.s3_key,
    'name', v_file.name
  );
end;
$$;
