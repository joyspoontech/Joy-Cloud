"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Trash2, Link as LinkIcon, ExternalLink, Globe, Clock, File as FileIcon, Folder, AlertCircle } from 'lucide-react';

interface SharedLink {
    id: string;
    target_name: string;
    target_type: 'file' | 'folder';
    created_at: string;
    expires_at: string | null;
    owner_email?: string; // For admins
}

export default function SharedLinksPage() {
    const [loading, setLoading] = useState(true);
    const [links, setLinks] = useState<SharedLink[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchLinks();
    }, []);

    const fetchLinks = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
            const adminMode = profile?.role === 'admin';
            setIsAdmin(adminMode);

            // Fetch links with join on files and folders to get names
            let query = supabase
                .from('shared_links')
                .select(`
                    id, created_at, expires_at, user_id,
                    files (name), folders (name),
                    profiles (email)
                `)
                .order('created_at', { ascending: false });

            // If not admin, RLS handles filtering, but good to be explicit
            if (!adminMode) {
                query = query.eq('user_id', user.id);
            }

            const { data, error: fetchError } = await query;

            if (fetchError) throw fetchError;

            const formattedLinks: SharedLink[] = (data || []).map((link: any) => {
                const isFolder = !!link.folders;
                return {
                    id: link.id,
                    created_at: link.created_at,
                    expires_at: link.expires_at,
                    target_type: (isFolder ? 'folder' : 'file') as 'folder' | 'file',
                    target_name: isFolder ? link.folders?.name : link.files?.name,
                    owner_email: adminMode ? link.profiles?.email : undefined
                };
            }).filter(l => l.target_name); // Hide links where the target was permanently deleted (though cascade should handle this)

            setLinks(formattedLinks);
        } catch (err: any) {
            console.error('Error fetching links:', err);
            setError(err.message || 'Failed to load shared links');
        } finally {
            setLoading(false);
        }
    };

    const handleRevoke = async (id: string) => {
        if (!confirm('Are you sure you want to revoke this link? Anyone with it will lose access immediately.')) return;

        try {
            // Because we enabled RLS for admins, and the user has RLS for their own,
            // we can just call the DELETE endpoint or delete directly via Supabase.
            // Let's use the API to keep it consistent.
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`/api/share?id=${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });

            if (!res.ok) throw new Error('Failed to revoke link');

            setLinks(prev => prev.filter(l => l.id !== id));
        } catch (err) {
            console.error(err);
            alert('Failed to revoke link.');
        }
    };

    const isExpired = (expiresAt: string | null) => {
        if (!expiresAt) return false;
        return new Date(expiresAt) < new Date();
    };

    if (loading) {
        return (
            <div className="p-8 flex justify-center mt-20">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center">
                        <Globe className="h-6 w-6 mr-3 text-blue-500" />
                        Shared Links {isAdmin && <span className="ml-3 text-xs font-semibold bg-purple-100 text-purple-700 px-2 py-1 rounded-full uppercase tracking-wider">Admin View</span>}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        {isAdmin ? "Manage all public share links across the platform." : "Manage your active public share links."}
                    </p>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-start mb-6 border border-red-100 dark:border-red-900/30">
                    <AlertCircle className="h-5 w-5 mr-3 shrink-0" />
                    <p className="text-sm">{error}</p>
                </div>
            )}

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                {links.length === 0 ? (
                    <div className="p-16 text-center flex flex-col items-center">
                        <div className="h-16 w-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-4">
                            <LinkIcon className="h-8 w-8 text-blue-500" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">No Shared Links</h3>
                        <p className="text-slate-500 mt-2 max-w-sm">You haven't shared any files or folders publicly yet.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left whitespace-nowrap">
                            <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider text-xs">
                                <tr>
                                    <th className="px-6 py-4">Item</th>
                                    {isAdmin && <th className="px-6 py-4">Owner</th>}
                                    <th className="px-6 py-4">Created</th>
                                    <th className="px-6 py-4">Expiration</th>
                                    <th className="px-6 py-4">Link</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {links.map(link => {
                                    const expired = isExpired(link.expires_at);
                                    return (
                                        <tr key={link.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${link.target_type === 'folder' ? 'bg-blue-50 text-blue-500' : 'bg-indigo-50 text-indigo-500'}`}>
                                                        {link.target_type === 'folder' ? <Folder className="h-4 w-4" /> : <FileIcon className="h-4 w-4" />}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-900 dark:text-slate-100">
                                                            {link.target_name}
                                                        </p>
                                                        <p className="text-xs text-slate-500 capitalize">{link.target_type}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            {isAdmin && (
                                                <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                                    {link.owner_email || 'Unknown'}
                                                </td>
                                            )}
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                    {new Date(link.created_at).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {link.expires_at ? (
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${expired ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                                                        {expired ? 'Expired' : `Expires: ${new Date(link.expires_at).toLocaleString()}`}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                        No Limit
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <a
                                                    href={`/share/${link.id}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                                                >
                                                    Open Link <ExternalLink className="h-3 w-3 ml-1" />
                                                </a>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRevoke(link.id)}
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" /> Revoke
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
