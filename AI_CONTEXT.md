# AI Context for Storage-Cloud (Joy Cloud)

## Project Overview
- **Purpose**: A cloud storage platform allowing users to upload, manage, and share files and folders securely.
- **Tech Stack**: Next.js, React, TailwindCSS, Supabase (Database, Auth, RPCs), AWS S3 (for blob storage), Lucide React (Icons).
- **Architecture**: App Router pattern (Next.js). Pages render mainly on the client with data fetching via Supabase JS Client mostly. Uses S3 for presigned URL based upload and download streams. Public sharing features utilize Postgres `SECURITY DEFINER` functions to decouple public queries from authenticated RLS enforcement cleanly.

## Current State
- **Version**: 1.2.0
- **Status**: In Development
- **Last Updated**: 2026-02-28

## File Structure
```
├── src
│   ├── app
│   │   ├── api          # Next.js API Routes (upload, download, share, public/download)
│   │   ├── dashboard    # Main authenticated app interface
│   │   ├── share        # Public-facing routing
│   │   ├── login        # Authentication pages
│   │   ├── globals.css  # Global styles
│   │   └── layout.tsx   # Root layout
│   ├── components
│   │   └── ui           # Reusable React components (Button, Modal, FileThumbnail, FilePreview, ShareModal)
│   ├── lib              # Utility functions and Supabase/AWS initializations
└── supabase
    ├── migrations       # Database schema migrations
    └── schema.sql       # Current schema declaration
```

## Key Components
### Dashboard
- **Location**: `src/app/dashboard/page.tsx`
- **Purpose**: Main file/folder management UI. Supports uploading, drag/drop, folder navigation, multi-selection, and sharing actions.
- **Dependencies**: Supabase JS, `FilePreviewModal`, `ShareModal`, Lucide icons.

### Public Share Page
- **Location**: `src/app/share/[token]/page.tsx`
- **Purpose**: A portal for anyone to view and explore a shared folder or directly download a specific shared file, using the `token` UUID. Includes Gallery mode and multiple-file downloading.
- **Dependencies**: Supabase RPC endpoints (`get_public_share_details`, `get_public_folder_contents`, `get_public_file_download_details`).

### Shared Links Management
- **Location**: `src/app/dashboard/shared-links/page.tsx`
- **Purpose**: A dedicated page for users to view and revoke their generated share links. Also serves as an admin dashboard to moderate all shared links across the platform.

## Configuration
- **Environment Variables**:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `AWS_REGION`
  - `AWS_BUCKET_NAME`

## Database Structure
- `profiles`: User information schema (1-to-1 with Supabase Auth users).
- `folders`: Represents nested directories. References `parent_id` (self-referencing recursive model) and `user_id`.
- `files`: File metadata mapping to backend S3. Includes `folder_id` and `user_id`.
- `shared_links`: Centralized table bridging UUID tokens to either an individual `file_id` or `folder_id` with relation to origin `user_id`. Also tracks `expires_at` for timed sharing.

## Future Improvements
- Implement folder sharing indicators on UI elements (a "shared" badge/icon).
- Support downloading full folders as ZIP.
- Multi-user collaboration.

## Development Notes
- When adding new DB permissions, rely on RLS strongly for `public` facing functions. If exposing specific public resources (e.g. sharing features), wrap restricted statements in a `SECURITY DEFINER` RPC function so `anon` token clients can't generically browse the table outside of intended flows.
