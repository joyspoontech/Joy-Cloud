"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Trash2, RefreshCw, ArrowLeft, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FileThumbnail } from '@/components/ui/FileThumbnail';

interface DeletedItem {
    id: string;
    name: string;
    type: 'file' | 'folder';
    deleted_at: string;
    size?: number; // only for files
}

export default function RecycleBin() {
    const [items, setItems] = useState<DeletedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const router = useRouter();

    useEffect(() => {
        checkAdminAndFetch();
    }, []);

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
            alert('Access Denied: Only Admins can access the Recycle Bin.');
            router.push('/dashboard');
            return;
        }

        setIsAdmin(true);
        fetchDeletedItems();
    };

    const fetchDeletedItems = async () => {
        setLoading(true);

        // Fetch deleted folders
        const { data: folders } = await supabase
            .from('folders')
            .select('id, name, deleted_at')
            .not('deleted_at', 'is', null);

        // Fetch deleted files
        const { data: files } = await supabase
            .from('files')
            .select('id, name, size, type, deleted_at')
            .not('deleted_at', 'is', null);

        const combined: DeletedItem[] = [
            ...(folders?.map(f => ({ ...f, type: 'folder' as const })) || []),
            ...(files?.map(f => ({ ...f, type: 'file' as const })) || []),
        ].sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime());

        setItems(combined);
        setLoading(false);
    };

    const handleRestore = async (id: string, type: 'file' | 'folder') => {
        const table = type === 'file' ? 'files' : 'folders';
        const { error } = await supabase
            .from(table)
            .update({ deleted_at: null })
            .eq('id', id);

        if (error) {
            alert('Failed to restore item');
        } else {
            fetchDeletedItems();
        }
    };

    const handlePermanentDelete = async (id: string, type: 'file' | 'folder') => {
        if (!confirm('This action is irreversible. The item will be permanently removed from storage.')) return;

        // For files, we strictly should delete from S3 too. 
        // For now, let's delete from DB and let the "Sync" cleanup S3? 
        // No, Sync deletes from DB if missing in S3.
        // If we delete from DB, S3 still has it. Sync will re-add it? 
        // YES. The Sync logic adds files found in S3.
        // So we MUST delete from S3 first.

        // We need an API route for permanent deletion to handle S3 securely.
        // Let's call /api/permanent-delete (Need to create this) OR just use Sync to prune?
        // Wait, if I delete from DB, Sync will see it in S3 and ADD it back.
        // If I delete from S3, Sync will see it missing in S3 and REMOVE it from DB (Soft or Hard? My sync logic Hard Deletes!)

        // So correct flow:
        // 1. Delete from S3 (via API)
        // 2. Delete from DB (via API or Sync)

        // Let's create an API endpoint: /api/delete-permanent
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/delete-permanent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ id, type })
            });

            if (!res.ok) throw new Error('Failed to delete');
            fetchDeletedItems();

        } catch (error) {
            console.error(error);
            alert('Failed to permanently delete item.');
        }
    };

    if (loading) return <div className="p-10 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div></div>;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-8">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center">
                        <Button variant="ghost" onClick={() => router.push('/dashboard')} className="mr-4">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>
                        <h1 className="text-2xl font-bold flex items-center text-slate-900 dark:text-white">
                            <Trash2 className="mr-3 h-6 w-6 text-red-500" />
                            Recycle Bin (Admin)
                        </h1>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl shadow border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase">
                        <div className="col-span-6">Name</div>
                        <div className="col-span-2">Type</div>
                        <div className="col-span-2">Deleted At</div>
                        <div className="col-span-2 text-right">Actions</div>
                    </div>

                    <div className="divide-y divide-gray-100 dark:divide-slate-800">
                        {items.length === 0 && (
                            <div className="p-12 text-center text-slate-500">Recycle Bin is empty</div>
                        )}
                        {items.map(item => (
                            <div key={item.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
                                <div className="col-span-6 font-medium flex items-center truncate">
                                    {item.type === 'folder' ? <div className="h-8 w-8 bg-blue-100 dark:bg-blue-900/30 rounded flex items-center justify-center mr-3"><Trash2 className="h-4 w-4 text-blue-600" /></div> : <FileThumbnail fileId={item.id} type="file" name={item.name} />}
                                    <span className="truncate" title={item.name}>{item.name}</span>
                                </div>
                                <div className="col-span-2 text-sm text-slate-500 capitalize">{item.type}</div>
                                <div className="col-span-2 text-sm text-slate-500">{new Date(item.deleted_at).toLocaleDateString()}</div>
                                <div className="col-span-2 flex justify-end gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRestore(item.id, item.type)}
                                        title="Restore"
                                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handlePermanentDelete(item.id, item.type)}
                                        title="Permanently Delete"
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                        <AlertTriangle className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
