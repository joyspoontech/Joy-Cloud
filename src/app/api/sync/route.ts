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

        // 1. Build Set of Current S3 Keys (including inferred folder paths)
        const currentS3Keys = new Set<string>();
        const allS3Paths = new Set<string>(); // Used for checking folder existence

        for (const item of contents) {
            if (item.Key) {
                currentS3Keys.add(item.Key);

                // Add all path prefixes to allS3Paths
                const parts = item.Key.split('/');
                // If it ends with /, it's a folder, parts has empty string at end
                // If "a/b/c.txt", parts=["a","b","c.txt"] -> paths: "a/", "a/b/"
                // If "a/b/", parts=["a","b",""] -> paths: "a/", "a/b/"

                let currentPath = '';
                // Don't include the last part if it's a file
                const isFolder = item.Key.endsWith('/');
                const limit = isFolder ? parts.length - 1 : parts.length - 1;

                for (let i = 0; i < limit; i++) {
                    const part = parts[i];
                    if (!part) continue; // skip empty
                    currentPath += part + '/';
                    allS3Paths.add(currentPath);
                }
                if (isFolder) allS3Paths.add(item.Key);
            }
        }

        // 2. Add New Items (Folders & Files)
        // Get existing files to avoid duplicates
        const { data: existingFiles } = await supabase.from('files').select('s3_key');
        const existingKeys = new Set(existingFiles?.map(f => f.s3_key) || []);

        let addedCount = 0;

        for (const item of contents) {
            if (!item.Key) continue;

            // Handle folder markers (keys ending in /)
            if (item.Key.endsWith('/')) {
                const parts = item.Key.split('/').filter(p => p); // Remove empty strings

                let parentFolderId: string | null = null;

                for (const folderName of parts) {
                    let folderQuery = supabase
                        .from('folders')
                        .select('id')
                        .eq('name', folderName)
                        .eq('user_id', user.id);

                    if (parentFolderId) {
                        folderQuery = folderQuery.eq('parent_id', parentFolderId);
                    } else {
                        folderQuery = folderQuery.is('parent_id', null);
                    }

                    const { data: folders } = await folderQuery;
                    let folderId = folders?.[0]?.id;

                    if (!folderId) {
                        const { data: newFolder, error } = await supabase
                            .from('folders')
                            .insert({
                                name: folderName,
                                user_id: user.id,
                                parent_id: parentFolderId
                            })
                            .select()
                            .single();

                        if (!error && newFolder) {
                            folderId = newFolder.id;
                        }
                    }
                    parentFolderId = folderId; // for next level
                }
                continue; // Done with folder marker
            }

            if (existingKeys.has(item.Key)) continue;

            // Infer structure for files
            const parts = item.Key.split('/');
            const filename = parts.pop()!;
            const folderPath = parts; // Remaining parts are folders

            let parentFolderId: string | null = null;

            // Traverse/Create folders for file path
            for (const folderName of folderPath) {
                // Check if folder exists
                let folderQuery = supabase
                    .from('folders')
                    .select('id')
                    .eq('name', folderName)
                    .eq('user_id', user.id);

                if (parentFolderId) {
                    folderQuery = folderQuery.eq('parent_id', parentFolderId);
                } else {
                    folderQuery = folderQuery.is('parent_id', null);
                }

                const { data: folders } = await folderQuery;
                let folderId = folders?.[0]?.id;

                if (!folderId) {
                    // Create folder
                    const { data: newFolder, error } = await supabase
                        .from('folders')
                        .insert({
                            name: folderName,
                            user_id: user.id,
                            parent_id: parentFolderId
                        })
                        .select()
                        .single();

                    if (!error && newFolder) {
                        folderId = newFolder.id;
                    } else if (error) {
                        console.error('Error creating folder', folderName, error);
                    }
                }
                parentFolderId = folderId;
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

        // 3. Process Deletions (Pruning)
        // Identify files in DB that are NOT in S3
        if (existingFiles) {
            const filesToDelete = existingFiles.filter(f => !currentS3Keys.has(f.s3_key));
            if (filesToDelete.length > 0) {
                const keysToDelete = filesToDelete.map(f => f.s3_key);
                await supabase.from('files').delete().in('s3_key', keysToDelete);
                console.log('Deleted orphaned files:', keysToDelete);
            }
        }

        // Prune Folders
        // Get all DB folders and check if their paths exist in S3 (implied or explicit)
        const { data: allDbFolders } = await supabase.from('folders').select('id, name, parent_id');
        if (allDbFolders) {
            const folderMap = new Map(allDbFolders.map(f => [f.id, f]));

            const getFolderPath = (folderId: string): string => {
                let current = folderMap.get(folderId);
                let pathParts = [];
                while (current) {
                    pathParts.unshift(current.name);
                    current = current.parent_id ? folderMap.get(current.parent_id) : undefined;
                }
                return pathParts.join('/') + '/';
            };

            const dbFolderPaths = allDbFolders.map(f => ({ id: f.id, path: getFolderPath(f.id) }));
            const folderIdsToDelete = [];

            for (const item of dbFolderPaths) {
                // Check if this path exists in our set of ALL S3 paths (explicit + implied)
                if (!allS3Paths.has(item.path)) {
                    folderIdsToDelete.push(item.id);
                }
            }

            if (folderIdsToDelete.length > 0) {
                await supabase.from('folders').delete().in('id', folderIdsToDelete);
                console.log('Deleted orphaned folders IDs:', folderIdsToDelete);
            }
        }

        return NextResponse.json({ message: 'Sync complete', added: addedCount });

    } catch (error) {
        console.error('Sync error:', error);
        return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
    }
}
