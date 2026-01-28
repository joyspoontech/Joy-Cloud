import { createClient } from '@supabase/supabase-js';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { NextResponse } from 'next/server';

const s3 = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

export async function POST(request: Request) {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: { headers: { Authorization: request.headers.get('Authorization')! } },
            }
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // List all objects in the bucket
        const command = new ListObjectsV2Command({
            Bucket: process.env.AWS_BUCKET_NAME!,
        });

        const s3Response = await s3.send(command);
        const contents = s3Response.Contents || [];

        // 1. Fetch ALL existing folders to build a cache
        // RLS allows viewing all folders, so this returns the global folder structure
        const { data: allFoldersData, error: folderFetchError } = await supabase
            .from('folders')
            .select('id, name, parent_id');

        if (folderFetchError) {
            console.error('Error fetching folders:', folderFetchError);
            throw folderFetchError;
        }

        // Map: "parent_id|name" -> folder_id. Root folders use "null|name"
        const folderMap = new Map<string, string>();

        if (allFoldersData) {
            for (const f of allFoldersData) {
                const key = `${f.parent_id || 'null'}|${f.name}`;
                folderMap.set(key, f.id);
            }
        }

        // Helper to get or create folder
        const getOrCreateFolder = async (name: string, parentId: string | null): Promise<string> => {
            const mapKey = `${parentId || 'null'}|${name}`;
            if (folderMap.has(mapKey)) {
                return folderMap.get(mapKey)!;
            }

            // Create new folder
            // Note: We assign current user as owner, but it's visible to all
            const { data: newFolder, error } = await supabase
                .from('folders')
                .insert({
                    name: name,
                    user_id: user.id,
                    parent_id: parentId
                })
                .select()
                .single();

            if (error || !newFolder) {
                console.error('Error creating folder:', name, error);
                throw error;
            }

            folderMap.set(mapKey, newFolder.id);
            return newFolder.id;
        };


        // 2. Build Set of Current S3 Keys (including inferred folder paths) for pruning later
        const currentS3Keys = new Set<string>();
        const allS3Paths = new Set<string>(); // Used for checking folder existence

        for (const item of contents) {
            if (item.Key) {
                currentS3Keys.add(item.Key);

                // Add all path prefixes to allS3Paths
                const parts = item.Key.split('/');

                let currentPath = '';
                const isFolder = item.Key.endsWith('/');
                // If folder "a/b/", parts=["a","b",""]. limit=2. path="a/", "a/b/"
                // If file "a/b/c", parts=["a","b","c"]. limit=2. path="a/", "a/b/"
                const limit = isFolder ? parts.length - 1 : parts.length - 1;

                for (let i = 0; i < limit; i++) {
                    const part = parts[i];
                    if (!part) continue;
                    currentPath += part + '/';
                    allS3Paths.add(currentPath);
                }
                if (isFolder) allS3Paths.add(item.Key);
            }
        }

        // 3. Process Items (Folders & Files)
        let addedCount = 0;

        // Get existing files to avoid duplicates
        const { data: existingFiles } = await supabase.from('files').select('s3_key');
        const existingFileKeys = new Set(existingFiles?.map(f => f.s3_key) || []);

        for (const item of contents) {
            if (!item.Key) continue;

            // Normalize path parts
            // "a/b/c" -> ["a", "b", "c"]
            // "a/b/" -> ["a", "b"]
            const parts = item.Key.split('/').filter(p => p);

            if (item.Key.endsWith('/')) {
                // Explicit folder
                let parentId: string | null = null;
                for (const folderName of parts) {
                    parentId = await getOrCreateFolder(folderName, parentId);
                }
                continue;
            }

            if (existingFileKeys.has(item.Key)) {
                // File exists, but ensure its folder structure exists too (in case of out-of-order sync)
                // Actually, if file exists, its folder *should* exist, but let's be safe?
                // For performance, skip valid files. Pruning will catch orphans.
                continue;
            }

            // New File
            const filename = parts.pop()!;
            const folderPath = parts; // Remaining parts are folders

            let parentFolderId: string | null = null;
            // Traverse/Create folders for file path
            for (const folderName of folderPath) {
                parentFolderId = await getOrCreateFolder(folderName, parentFolderId);
            }

            // Insert File
            const { error: insertError } = await supabase
                .from('files')
                .insert({
                    name: filename,
                    size: item.Size || 0,
                    type: 'application/octet-stream',
                    s3_key: item.Key,
                    user_id: user.id,
                    folder_id: parentFolderId
                });

            if (!insertError) addedCount++;
        }

        // 4. Process Deletions (Pruning)

        // Prune Files
        if (existingFiles) {
            const filesToDelete = existingFiles.filter(f => !currentS3Keys.has(f.s3_key));
            if (filesToDelete.length > 0) {
                const keysToDelete = filesToDelete.map(f => f.s3_key);
                await supabase.from('files').delete().in('s3_key', keysToDelete);
                console.log('Deleted orphaned files:', keysToDelete.length);
            }
        }

        // Prune Folders
        // Re-fetch folders structure after potential updates (or use our map?)
        // Using map is tricky because we need IDs to delete.
        // Let's rely on the DB state.

        // Note: We need to be careful. logic in original code was: check if folder path exists in S3.
        // If we have "Demo/" in DB, and "Demo/" in S3, keep it.
        // If we have "Old/" in DB, not in S3, delete it.

        // We need to map DB folders to PATHS to check against allS3Paths.
        // This is recursive and expensive in SQL, but manageable in JS for small sets.
        const { data: finalDbFolders } = await supabase.from('folders').select('id, name, parent_id');

        if (finalDbFolders) {
            const idToFolder = new Map(finalDbFolders.map(f => [f.id, f]));

            const getFullPath = (folderId: string): string => {
                let current = idToFolder.get(folderId);
                if (!current) return '';
                const parts = [];
                // Safety depth limit
                let depth = 0;
                while (current && depth < 20) {
                    parts.unshift(current.name);
                    current = current.parent_id ? idToFolder.get(current.parent_id) : undefined;
                    depth++;
                }
                return parts.join('/') + '/';
            };

            const foldersToDelete = [];
            for (const f of finalDbFolders) {
                const path = getFullPath(f.id);
                if (!allS3Paths.has(path)) {
                    // Only delete if it really doesn't exist in S3
                    // Double check root usage
                    foldersToDelete.push(f.id);
                }
            }

            if (foldersToDelete.length > 0) {
                await supabase.from('folders').delete().in('id', foldersToDelete);
                console.log('Deleted orphaned folders:', foldersToDelete.length);
            }
        }

        return NextResponse.json({ message: 'Sync complete', added: addedCount });

    } catch (error) {
        console.error('Sync error:', error);
        return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
    }
}
