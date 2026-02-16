"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });
            if (error) throw error;
            setSent(true);
        } catch (err: any) {
            setError(err.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-background">
            {/* Left Side - Form */}
            <div className="flex flex-col justify-center p-8 lg:p-16 xl:p-24 relative">
                <Link href="/login" className="absolute top-8 left-8 flex items-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back to login
                </Link>

                <div className="max-w-md w-full mx-auto space-y-8">
                    <div className="space-y-2 text-center lg:text-left">
                        <div className="inline-block h-16 w-16 mb-4 relative drop-shadow-xl hover:scale-105 transition-transform duration-300">
                            <div className="h-full w-full bg-white rounded-2xl flex items-center justify-center overflow-hidden shadow-lg shadow-blue-500/20">
                                <img src="/icon.png" alt="Joy Cloud Logo" className="h-full w-full object-cover" />
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                            Forgot your password?
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400">
                            No worries. Enter your email and we&apos;ll send you a reset link.
                        </p>
                    </div>

                    {sent ? (
                        <div className="space-y-6">
                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center space-y-3">
                                <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                                <h3 className="text-lg font-semibold text-green-800 dark:text-green-300">Check your email</h3>
                                <p className="text-green-700 dark:text-green-400 text-sm">
                                    We sent a password reset link to <strong>{email}</strong>. Click the link in the email to create a new password.
                                </p>
                            </div>
                            <div className="text-center text-sm text-slate-500 dark:text-slate-400">
                                Didn&apos;t receive it?{' '}
                                <button
                                    type="button"
                                    onClick={() => setSent(false)}
                                    className="text-blue-600 font-semibold hover:underline"
                                >
                                    Try again
                                </button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleReset} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-900 dark:text-slate-300">Email</label>
                                <Input
                                    type="email"
                                    placeholder="name@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
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
                                <Mail className="h-4 w-4 mr-2" />
                                Send reset link
                            </Button>

                            <div className="text-center text-sm text-slate-500 dark:text-slate-400">
                                Remember your password?{' '}
                                <Link href="/login" className="text-blue-600 font-semibold hover:underline">
                                    Sign in
                                </Link>
                            </div>
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
                            <Mail className="h-10 w-10" />
                        </div>
                        <h2 className="text-2xl font-bold">Password recovery</h2>
                        <p className="text-slate-300 leading-relaxed">
                            We&apos;ll email you a secure link to reset your password. The link expires in 1 hour for your security.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
