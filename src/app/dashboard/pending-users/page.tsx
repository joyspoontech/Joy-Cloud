"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Clock, ArrowLeft, RefreshCw } from 'lucide-react';

interface PendingUser {
    id: string;
    email: string;
    created_at: string;
    approval_status: 'pending' | 'approved' | 'rejected';
    approved_at: string | null;
    rejected_at: string | null;
}

export default function PendingUsersPage() {
    const [users, setUsers] = useState<PendingUser[]>([]);
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        checkAdminAndFetch();
    }, [filter]);

    const checkAdminAndFetch = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push('/login');
            return;
        }

        // Check if user is admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            router.push('/dashboard');
            return;
        }

        fetchUsers();
    };

    const fetchUsers = async () => {
        setLoading(true);

        let query = supabase
            .from('profiles')
            .select('id, email, created_at, approval_status, approved_at, rejected_at')
            .order('created_at', { ascending: false });

        if (filter !== 'all') {
            query = query.eq('approval_status', filter);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching users:', error);
        } else {
            setUsers(data || []);
        }

        setLoading(false);
    };

    const handleApprove = async (userId: string) => {
        setProcessing(userId);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const res = await fetch('/api/approve-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ userId, action: 'approve' }),
            });

            if (!res.ok) throw new Error('Failed to approve user');

            await fetchUsers();
        } catch (error) {
            console.error('Error approving user:', error);
            alert('Failed to approve user');
        } finally {
            setProcessing(null);
        }
    };

    const handleReject = async (userId: string) => {
        if (!confirm('Are you sure you want to reject this user? They can retry after 3 days.')) return;

        setProcessing(userId);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const res = await fetch('/api/approve-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ userId, action: 'reject' }),
            });

            if (!res.ok) throw new Error('Failed to reject user');

            await fetchUsers();
        } catch (error) {
            console.error('Error rejecting user:', error);
            alert('Failed to reject user');
        } finally {
            setProcessing(null);
        }
    };

    const pendingCount = users.filter(u => u.approval_status === 'pending').length;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 lg:p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Button
                        variant="ghost"
                        onClick={() => router.push('/dashboard')}
                        className="mb-4 text-slate-500 hover:text-slate-900"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Dashboard
                    </Button>

                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                                User Approval Requests
                                {filter === 'pending' && pendingCount > 0 && (
                                    <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-500 text-white text-sm font-semibold">
                                        {pendingCount}
                                    </span>
                                )}
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 mt-1">
                                Manage user signup requests and access permissions
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            onClick={fetchUsers}
                            loading={loading}
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex gap-3 mb-6">
                    {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === status
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}
                        >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="p-12 flex justify-center">
                            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="p-12 text-center">
                            <Clock className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-slate-900 dark:text-white">No {filter} requests</h3>
                            <p className="text-slate-500 mt-1">All caught up!</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-800">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Email
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Signup Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                {users.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                                {user.email}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-slate-600 dark:text-slate-400">
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.approval_status === 'approved'
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                    : user.approval_status === 'rejected'
                                                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                }`}>
                                                {user.approval_status === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
                                                {user.approval_status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                                                {user.approval_status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                                                {user.approval_status.charAt(0).toUpperCase() + user.approval_status.slice(1)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {user.approval_status === 'pending' && (
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleApprove(user.id)}
                                                        loading={processing === user.id}
                                                        className="bg-green-600 hover:bg-green-700"
                                                    >
                                                        <CheckCircle className="h-4 w-4 mr-1" />
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        onClick={() => handleReject(user.id)}
                                                        loading={processing === user.id}
                                                        className="bg-red-600 hover:bg-red-700 text-white"
                                                    >
                                                        <XCircle className="h-4 w-4 mr-1" />
                                                        Reject
                                                    </Button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
