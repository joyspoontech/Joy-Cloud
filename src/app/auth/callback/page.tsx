"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
    const router = useRouter();

    useEffect(() => {
        // The Supabase client automatically handles the hash fragment parsing
        // We just need to wait for the session to be established using onAuthStateChange
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || session) {
                router.push('/dashboard');
            }
        });

        // Fallback check in case the event already fired
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                router.push('/dashboard');
            }
        };
        checkSession();

        return () => subscription.unsubscribe();
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-slate-500 dark:text-slate-400">Completing sign in...</p>
            </div>
        </div>
    );
}
