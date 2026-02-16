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

    const StatusBadge = ({ status }: { status: string }) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status === 'approved'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : status === 'rejected'
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
            }`}>
            {status === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
            {status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
            {status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-6 md:mb-8">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push('/dashboard')}
                        className="mb-4 text-slate-500 hover:text-slate-900"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Dashboard
                    </Button>

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                                User Approval
                                {filter === 'pending' && pendingCount > 0 && (
                                    <span className="inline-flex items-center justify-center h-7 w-7 md:h-8 md:w-8 rounded-full bg-blue-500 text-white text-sm font-semibold">
                                        {pendingCount}
                                    </span>
                                )}
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm md:text-base">
                                Manage user signup requests
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={fetchUsers}
                            loading={loading}
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex gap-2 md:gap-3 mb-6 flex-wrap">
                    {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`px-3 md:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === status
                                ? 'bg-blue-600 text-white'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}
                        >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Content */}
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
                        <>
                            {/* Desktop Table */}
                            <table className="w-full hidden md:table">
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
                                                <StatusBadge status={user.approval_status} />
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

                            {/* Mobile Card List */}
                            <div className="md:hidden divide-y divide-gray-100 dark:divide-slate-800">
                                {users.map((user) => (
                                    <div key={user.id} className="p-4 space-y-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                                                    {user.email}
                                                </p>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    Signed up {new Date(user.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <StatusBadge status={user.approval_status} />
                                        </div>
                                        {user.approval_status === 'pending' && (
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleApprove(user.id)}
                                                    loading={processing === user.id}
                                                    className="bg-green-600 hover:bg-green-700 flex-1"
                                                >
                                                    <CheckCircle className="h-4 w-4 mr-1" />
                                                    Approve
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => handleReject(user.id)}
                                                    loading={processing === user.id}
                                                    className="bg-red-600 hover:bg-red-700 text-white flex-1"
                                                >
                                                    <XCircle className="h-4 w-4 mr-1" />
                                                    Reject
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
