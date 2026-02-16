"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useRouter } from 'next/navigation';
import { Lock, CheckCircle, AlertCircle } from 'lucide-react';

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [sessionReady, setSessionReady] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // Supabase automatically handles the token from the URL hash
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
                setSessionReady(true);
            }
        });
        return () => subscription.unsubscribe();
    }, []);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            setSuccess(true);
            setTimeout(() => router.push('/dashboard'), 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to reset password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-background">
            {/* Left Side - Form */}
            <div className="flex flex-col justify-center p-8 lg:p-16 xl:p-24 relative">
                <div className="max-w-md w-full mx-auto space-y-8">
                    <div className="space-y-2 text-center lg:text-left">
                        <div className="inline-block h-16 w-16 mb-4 relative drop-shadow-xl hover:scale-105 transition-transform duration-300">
                            <div className="h-full w-full bg-white rounded-2xl flex items-center justify-center overflow-hidden shadow-lg shadow-blue-500/20">
                                <img src="/icon.png" alt="Joy Cloud Logo" className="h-full w-full object-cover" />
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                            Set new password
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400">
                            Enter your new password below.
                        </p>
                    </div>

                    {success ? (
                        <div className="space-y-4">
                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center space-y-3">
                                <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                                <h3 className="text-lg font-semibold text-green-800 dark:text-green-300">Password updated!</h3>
                                <p className="text-green-700 dark:text-green-400 text-sm">
                                    Your password has been reset successfully. Redirecting to dashboard...
                                </p>
                            </div>
                        </div>
                    ) : !sessionReady ? (
                        <div className="space-y-4">
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6 text-center space-y-3">
                                <AlertCircle className="h-12 w-12 text-amber-500 mx-auto" />
                                <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-300">Verifying reset link...</h3>
                                <p className="text-amber-700 dark:text-amber-400 text-sm">
                                    Processing your reset link. If this takes too long, the link may have expired.
                                </p>
                            </div>
                            <div className="text-center">
                                <a href="/forgot-password" className="text-blue-600 font-semibold hover:underline text-sm">
                                    Request a new link
                                </a>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleReset} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-900 dark:text-slate-300">New Password</label>
                                <Input
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="bg-slate-50 dark:bg-slate-900/50"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-900 dark:text-slate-300">Confirm Password</label>
                                <Input
                                    type="password"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    className="bg-slate-50 dark:bg-slate-900/50"
                                />
                            </div>

                            {error && (
                                <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
                                    {error}
                                </p>
                            )}

                            <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 shadow-lg shadow-blue-500/20 h-12 text-base" type="submit" loading={loading}>
                                <Lock className="h-4 w-4 mr-2" />
                                Reset password
                            </Button>
                        </form>
                    )}
                </div>
            </div>

            {/* Right Side - Visual */}
            <div className="hidden lg:block relative bg-slate-900 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-900 opacity-90" />
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px', opacity: 0.1 }}></div>

                <div className="relative z-10 h-full flex flex-col justify-center items-center p-16 text-white text-center">
                    <div className="max-w-md space-y-6">
                        <div className="h-20 w-20 mx-auto bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
                            <Lock className="h-10 w-10" />
                        </div>
                        <h2 className="text-2xl font-bold">Almost there!</h2>
                        <p className="text-slate-300 leading-relaxed">
                            Choose a strong password with at least 6 characters. You&apos;ll be signed in automatically after resetting.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
