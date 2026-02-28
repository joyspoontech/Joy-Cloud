import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { folderId, newName } = body;

        if (!folderId || !newName || typeof newName !== 'string' || newName.trim() === '') {
            return NextResponse.json({ error: 'Folder ID and a valid new name are required' }, { status: 400 });
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

        const { data: folders, error: folderError } = await supabase
            .from('folders')
            .update({ name: newName.trim() })
            .eq('id', folderId)
            .select();

        if (folderError) {
            console.error('Error renaming folder:', folderError);
            if (folderError.code === '23505') { // Unique violation
                return NextResponse.json({ error: 'A folder with this name already exists in this location' }, { status: 409 });
            }
            return NextResponse.json({ error: `Failed to rename folder: ${folderError.message || folderError.details || JSON.stringify(folderError)}` }, { status: 500 });
        }

        if (!folders || folders.length === 0) {
            return NextResponse.json({ error: 'Folder not found or you do not have permission to rename it.' }, { status: 404 });
        }

        return NextResponse.json({ folder: folders[0] });
    } catch (error: any) {
        console.error('Folder rename error:', error);
        return NextResponse.json({ error: `Failed to rename folder: ${error.message || String(error)}` }, { status: 500 });
    }
}
