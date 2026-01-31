import { createClient } from '@supabase/supabase-js';
import { S3Client, DeleteObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { NextResponse } from 'next/server';

const s3 = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

async function deleteS3Folder(folderPath: string) {
    const params = {
        Bucket: process.env.AWS_BUCKET_NAME!,
        Prefix: folderPath.endsWith('/') ? folderPath : `${folderPath}/`,
    };

    // List all objects with this prefix
    const listedObjects = await s3.send(new ListObjectsV2Command(params));

    if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
        return;
    }

    // Delete all objects
    const deleteParams = {
        Bucket: process.env.AWS_BUCKET_NAME!,
        Delete: {
            Objects: listedObjects.Contents.map(({ Key }) => ({ Key: Key! })),
        },
    };

    await s3.send(new DeleteObjectsCommand(deleteParams));

    // Check if there are more objects to delete (pagination)
    if (listedObjects.IsTruncated) {
        await deleteS3Folder(folderPath);
    }
}

async function getFolderS3Path(supabase: any, folderId: string): Promise<string> {
    const { data: folder } = await supabase
        .from('folders')
        .select('name, parent_id')
        .eq('id', folderId)
        .single();

    if (!folder) return '';

    let path = folder.name;
    let currentParentId = folder.parent_id;

    while (currentParentId) {
        const { data: parentFolder } = await supabase
            .from('folders')
            .select('name, parent_id')
            .eq('id', currentParentId)
            .single();

        if (!parentFolder) break;
        path = `${parentFolder.name}/${path}`;
        currentParentId = parentFolder.parent_id;
    }

    return path;
}

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

        // Admin check
        if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id, type } = await request.json();

        if (type === 'file') {
            // Get S3 Key
            const { data: file } = await supabase.from('files').select('s3_key').eq('id', id).single();
            if (file) {
                // Delete from S3
                await s3.send(new DeleteObjectCommand({
                    Bucket: process.env.AWS_BUCKET_NAME!,
                    Key: file.s3_key,
                }));

                // Delete from DB
                await supabase.from('files').delete().eq('id', id);
            }
        } else {
            // Folder deletion - Delete all S3 objects with this folder's path prefix
            const folderPath = await getFolderS3Path(supabase, id);

            if (folderPath) {
                await deleteS3Folder(folderPath);
            }

            // Delete folder and its children from DB (cascade should handle children)
            await supabase.from('folders').delete().eq('id', id);
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Delete error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
