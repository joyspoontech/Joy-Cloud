import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
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

        const { name, parentId, path } = await request.json();

        // 1. Insert into Database
        const { data: folder, error: dbError } = await supabase
            .from('folders')
            .insert({
                name,
                parent_id: parentId,
                user_id: user.id
            })
            .select()
            .single();

        if (dbError) {
            console.error('DB Folder Create Error:', dbError);
            return NextResponse.json({ error: dbError.message }, { status: 500 });
        }

        // 2. Create S3 Object (Folder)
        // Path should allow for nesting: "Parent/Child/"
        // S3 Key: "Parent/Child/NewFolder/"

        let s3KeyPrefix = '';
        if (path) {
            // Ensure path doesn't start with / and ends with /
            const cleanPath = path.replace(/^\/+/, '').replace(/\/+$/, '') + '/';
            if (cleanPath !== '/') s3KeyPrefix = cleanPath;
        }

        const s3Key = `${s3KeyPrefix}${name}/`;

        const command = new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME!,
            Key: s3Key,
            Body: '', // Empty body
        });

        await s3.send(command);

        return NextResponse.json({ folder, s3Key });

    } catch (error) {
        console.error('Create Folder Error:', error);
        return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 });
    }
}
