# Changelog

All notable changes to this project will be documented in this file.

Format: [Date] - [Version] - [Type]

---

## [Unreleased]

### Added
- [New features]

### Changed
- [Changes to existing functionality]

### Fixed
- [Bug fixes]

### Removed
- [Removed features]

---

## [1.2.0] - 2026-02-28

### Added
- Added `expires_at` column to `shared_links` table allowing for link expiration (timed shares).
- Implemented `/dashboard/shared-links` page to allow users to view and revoke their active links.
- Added an Admin View on the `/dashboard/shared-links` page allowing administrators to manage all public links platform-wide.
- Integrated a "Gallery View" and "List View" toggle to the public sharing page (`/share/[token]`).
- Implemented multi-selection enabling "Download Selected" functionality inside shared folders.
- Enhanced public share details to enforce link expiration rules.

### Changed
- Updated `ShareModal` UI to allow users to specify an expiration duration when generating links.
- Modified `ShareModal` backend API to persist the desired expiration timestamp.

---

## [1.1.0] - 2026-02-28

### Added
- Implemented public file and folder sharing feature without requiring sign-up/in.
- Added a `shared_links` table with `user_id`, `folder_id`, `file_id`, and `created_at`.
- Implemented `get_public_share_details`, `get_public_folder_contents`, and `get_public_file_download_details` PostgreSQL Security Definer RPC functions for secure data retrieval.
- Created `/api/share` endpoint for generating and revoking share links.
- Created `/api/public/download` endpoint for public, token-based downloading.
- Built a public UI at `/share/[token]` for viewing and downloading shared folders and individual files.
- Integrated a `ShareModal` within the Dashboard page for users to easily generate/copy public share links.

### Technical Details
- Added RLS bypass utilizing Security Definer RPCs to fetch share hierarchies safely.
- Enhanced `FilePreviewModal` and `FileThumbnail` to gracefully support public unauthenticated contexts via `isPublic` and `publicToken`.

### Design Decisions
- Kept the sharing interface simple with UUID tokens instead of complex obfuscation.
- Designed the external sharing page adhering to the white/light theme.

---

## [1.0.0] - Initial version

### Added
- Initial setup for Storage Cloud.
- Folder and file uploads via drag-and-drop and manual selection.
- S3 integration for backend storage.
- Supabase integration for authorization and DB records.
