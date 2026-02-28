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
        const token = searchParams.get('token');
        const isPreview = searchParams.get('preview') === 'true';

        if (!fileId || !token) {
            return NextResponse.json({ error: 'File ID and token required' }, { status: 400 });
        }

        // We DO NOT pass user Authorization header because this is public
        // We use the anon key so we have a valid client, and call our security definer RPC
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data: file, error } = await supabase.rpc('get_public_file_download_details', {
            p_share_id: token,
            p_target_file_id: fileId
        });

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
        console.error('Public download error:', error);
        return NextResponse.json({ error: 'Download failed' }, { status: 500 });
    }
}
