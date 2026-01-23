"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useRouter } from 'next/navigation';
import { Cloud, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const router = useRouter();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                alert('Check your email for the confirmation link!');
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                router.push('/dashboard');
            }
        } catch (error: any) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-background">
            {/* Left Side - Form */}
            <div className="flex flex-col justify-center p-8 lg:p-16 xl:p-24 relative">
                <Link href="/" className="absolute top-8 left-8 flex items-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back home
                </Link>

                <div className="max-w-md w-full mx-auto space-y-8">
                    <div className="space-y-2 text-center lg:text-left">
                        <div className="inline-block h-16 w-16 mb-4 relative drop-shadow-xl hover:scale-105 transition-transform duration-300">
                            <div className="h-full w-full bg-white rounded-2xl flex items-center justify-center overflow-hidden shadow-lg shadow-blue-500/20">
                                <img src="/icon.png" alt="Joy Cloud Logo" className="h-full w-full object-cover" />
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                            {isSignUp ? 'Create an account' : 'Welcome back'}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400">
                            {isSignUp ? 'Enter your details to get started.' : 'Please enter your details to sign in.'}
                        </p>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-6">
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
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-900 dark:text-slate-300">Password</label>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="bg-slate-50 dark:bg-slate-900/50"
                            />
                        </div>

                        <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 shadow-lg shadow-blue-500/20 h-12 text-base" type="submit" loading={loading}>
                            {isSignUp ? 'Sign up' : 'Sign in'}
                        </Button>

                        <div className="text-center text-sm text-slate-500 dark:text-slate-400">
                            {isSignUp ? "Already have an account?" : "Don't have an account?"} {' '}
                            <button
                                type="button"
                                onClick={() => setIsSignUp(!isSignUp)}
                                className="text-blue-600 font-semibold hover:underline"
                            >
                                {isSignUp ? 'Sign in' : 'Sign up'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Right Side - Visual */}
            <div className="hidden lg:block relative bg-slate-900 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-900 opacity-90" />
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px', opacity: 0.1 }}></div>

                <div className="relative z-10 h-full flex flex-col justify-between p-16 text-white">
                    <div className="space-y-4">
                        <div className="inline-flex px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-sm font-medium">
                            Trusted by 10k+ users
                        </div>
                    </div>
                    <div className="glass-card p-8 rounded-2xl max-w-lg">
                        <p className="text-lg leading-relaxed text-slate-100 mb-6">
                            "Joy Cloud has completely transformed how our team handles secure file transfers. The S3 integration speeds are improving our workflow daily."
                        </p>
                        <div className="flex items-center space-x-4">
                            <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center">
                                <span className="font-bold">JD</span>
                            </div>
                            <div>
                                <p className="font-semibold">Jane Doe</p>
                                <p className="text-sm text-slate-300">CTO, TechStart Inc.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
