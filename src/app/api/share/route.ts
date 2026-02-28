import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { fileId, folderId, expiresValue, expiresUnit } = body;

        let expiresAt = null;
        if (expiresValue && expiresUnit && expiresUnit !== 'none') {
            const date = new Date();
            if (expiresUnit === 'hours') {
                date.setHours(date.getHours() + parseInt(expiresValue));
            } else if (expiresUnit === 'days') {
                date.setDate(date.getDate() + parseInt(expiresValue));
            }
            expiresAt = date.toISOString();
        }

        if (!fileId && !folderId) {
            return NextResponse.json({ error: 'Either fileId or folderId is required' }, { status: 400 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: { headers: { Authorization: request.headers.get('Authorization')! } },
            }
        );

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Create a share link
        const { data: shareData, error: shareError } = await supabase
            .from('shared_links')
            .insert({
                user_id: user.id,
                folder_id: folderId || null,
                file_id: fileId || null,
                expires_at: expiresAt
            })
            .select()
            .single();

        if (shareError) {
            console.error('Error creating share link:', shareError);
            return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 });
        }

        return NextResponse.json({ shareLink: shareData });
    } catch (error) {
        console.error('Share link creation error:', error);
        return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const linkId = searchParams.get('id');

        if (!linkId) {
            return NextResponse.json({ error: 'Link ID required' }, { status: 400 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: { headers: { Authorization: request.headers.get('Authorization')! } },
            }
        );

        const { error } = await supabase
            .from('shared_links')
            .delete()
            .eq('id', linkId);

        if (error) {
            console.error('Error deleting share link:', error);
            return NextResponse.json({ error: 'Failed to delete share link' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Share link deletion error:', error);
        return NextResponse.json({ error: 'Failed to delete share link' }, { status: 500 });
    }
}
