import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
    try {
        // Get authorization header
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');

        // Create authenticated Supabase client with user's token for RLS
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            }
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user is admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Parse request body
        const { userId, action } = await req.json();

        if (!userId || !action || !['approve', 'reject'].includes(action)) {
            return NextResponse.json({ error: 'Invalid request. Required: userId, action (approve/reject)' }, { status: 400 });
        }

        // Update user approval status
        const updateData: any = {
            approval_status: action === 'approve' ? 'approved' : 'rejected',
            approved_by: user.id,
        };

        if (action === 'approve') {
            updateData.approved_at = new Date().toISOString();
            updateData.rejected_at = null; // Clear rejection timestamp
        } else {
            updateData.rejected_at = new Date().toISOString();
            updateData.approved_at = null;
        }

        const { data, error } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', userId)
            .select()
            .single();

        if (error) {
            console.error('Error updating user approval:', error);
            return NextResponse.json({ error: 'Failed to update user status' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: `User ${action}d successfully`,
            user: data
        });

    } catch (error) {
        console.error('Error in approve-user API:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
