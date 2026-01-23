import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
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

        const { filename, contentType, size, folderPath } = await request.json();

        let prefix = '';
        if (folderPath) {
            const cleanPath = folderPath.replace(/^\/+/, '').replace(/\/+$/, '') + '/';
            if (cleanPath !== '/') prefix = cleanPath;
        }

        const key = `${prefix}${filename}`;
        // Note: Removing timestamp prefix to keep names clean in S3 as per user preference likely, 
        // OR keeping it but ensuring it's inside the folder. 
        // Let's keep the timestamp to avoid collisions, but maybe simpler?
        // User saw "1769163056845-Screenshot..." in the screenshot.
        // Let's stick effectively to `${prefix}${Date.now()}-${filename}` to match existing pattern but nested.
        const finalKey = `${prefix}${Date.now()}-${filename}`;

        const command = new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME!,
            Key: key,
            ContentType: contentType,
        });

        const url = await getSignedUrl(s3, command, { expiresIn: 60 });

        // We don't insert into DB here; client will call another endpoint upon success, 
        // OR client can insert into DB using Supabase client after upload.
        // For tighter security, we could insert a "pending" record here. 
        // We will let client insert for simplicity in this MVP, protected by RLS.

        return NextResponse.json({ url, key });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
