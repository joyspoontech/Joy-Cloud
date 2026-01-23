import { createClient } from '@supabase/supabase-js';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { NextResponse } from 'next/server';

const s3 = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const fileId = searchParams.get('fileId');
        const isPreview = searchParams.get('preview') === 'true';

        if (!fileId) {
            return NextResponse.json({ error: 'File ID required' }, { status: 400 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: { headers: { Authorization: request.headers.get('Authorization')! } },
            }
        );

        // Check if user has access to this file via Supabase RLS logic
        // We query the file first. If RLS allows it, we get data.
        const { data: file, error } = await supabase
            .from('files')
            .select('s3_key, name')
            .eq('id', fileId)
            .single();

        if (error || !file) {
            return NextResponse.json({ error: 'File not found or unauthorized' }, { status: 404 });
        }

        const command = new GetObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME!,
            Key: file.s3_key,
            ResponseContentDisposition: isPreview ? 'inline' : `attachment; filename="${file.name}"`,
        });

        const url = await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour link

        return NextResponse.json({ url });
    } catch (error) {
        console.error('Download error:', error);
        return NextResponse.json({ error: 'Download failed' }, { status: 500 });
    }
}
