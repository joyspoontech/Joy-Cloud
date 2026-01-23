import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { userId, email, createdAt } = await req.json();

        if (!userId || !email) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Get n8n webhook URL from environment
        const webhookUrl = process.env.N8N_WEBHOOK_URL;

        if (!webhookUrl) {
            console.warn('N8N_WEBHOOK_URL not configured. Skipping notification.');
            return NextResponse.json({
                success: true,
                message: 'Webhook URL not configured'
            });
        }

        // Send webhook to n8n
        const webhookPayload = {
            event: 'user_signup',
            user: {
                id: userId,
                email: email,
                created_at: createdAt || new Date().toISOString()
            }
        };

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(webhookPayload),
        });

        if (!response.ok) {
            console.error('Failed to send webhook to n8n:', await response.text());
            return NextResponse.json({
                success: false,
                error: 'Failed to send notification'
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Admin notified successfully'
        });

    } catch (error) {
        console.error('Error in notify-admin webhook:', error);
        return NextResponse.json({
            error: 'Internal server error'
        }, { status: 500 });
    }
}
