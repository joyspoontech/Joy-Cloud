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
    size?: number;
}

export default function RecycleBin() {
    const [items, setItems] = useState<DeletedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
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

        const { data: folders } = await supabase
            .from('folders')
            .select('id, name, deleted_at')
            .not('deleted_at', 'is', null);

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

    const handleBulkDelete = async () => {
        if (selectedItems.size === 0) return;

        if (!confirm(`This will permanently delete ${selectedItems.size} item(s). This action is irreversible. Continue?`)) return;

        try {
            const { data: { session } } = await supabase.auth.getSession();

            for (const itemId of Array.from(selectedItems)) {
                const item = items.find(i => i.id === itemId);
                if (!item) continue;

                const res = await fetch('/api/delete-permanent', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.access_token}`
                    },
                    body: JSON.stringify({ id: item.id, type: item.type })
                });

                if (!res.ok) throw new Error(`Failed to delete ${item.name}`);
            }

            setSelectedItems(new Set());
            fetchDeletedItems();
            alert(`Successfully deleted ${selectedItems.size} item(s)`);

        } catch (error) {
            console.error(error);
            alert('Failed to delete some items.');
        }
    };

    const toggleSelectAll = () => {
        if (selectedItems.size === items.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(items.map(i => i.id)));
        }
    };

    const toggleSelectItem = (id: string) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedItems(newSelected);
    };

    if (loading) return <div className="p-10 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div></div>;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
                    <div className="flex items-center">
                        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')} className="mr-2 md:mr-4">
                            <ArrowLeft className="h-4 w-4 mr-1 md:mr-2" />
                            <span className="hidden sm:inline">Back</span>
                        </Button>
                        <h1 className="text-xl md:text-2xl font-bold flex items-center text-slate-900 dark:text-white">
                            <Trash2 className="mr-2 md:mr-3 h-5 w-5 md:h-6 md:w-6 text-red-500" />
                            Recycle Bin
                        </h1>
                    </div>
                    {selectedItems.size > 0 && (
                        <Button
                            size="sm"
                            onClick={handleBulkDelete}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Selected ({selectedItems.size})
                        </Button>
                    )}
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl shadow border border-slate-200 dark:border-slate-800 overflow-hidden">
                    {/* Desktop Header */}
                    <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase">
                        <div className="col-span-1 flex items-center">
                            <input
                                type="checkbox"
                                checked={items.length > 0 && selectedItems.size === items.length}
                                onChange={toggleSelectAll}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                        </div>
                        <div className="col-span-5">Name</div>
                        <div className="col-span-2">Type</div>
                        <div className="col-span-2">Deleted At</div>
                        <div className="col-span-2 text-right">Actions</div>
                    </div>

                    {/* Mobile Header */}
                    <div className="md:hidden flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-800">
                        <input
                            type="checkbox"
                            checked={items.length > 0 && selectedItems.size === items.length}
                            onChange={toggleSelectAll}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-xs font-semibold text-slate-500 uppercase">
                            {selectedItems.size > 0 ? `${selectedItems.size} selected` : 'Select All'}
                        </span>
                    </div>

                    <div className="divide-y divide-gray-100 dark:divide-slate-800">
                        {items.length === 0 && (
                            <div className="p-12 text-center text-slate-500">Recycle Bin is empty</div>
                        )}
                        {items.map(item => (
                            <div key={item.id} className="flex items-center gap-3 px-4 md:px-6 py-3 md:py-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 md:grid md:grid-cols-12 md:gap-4">
                                {/* Checkbox */}
                                <div className="shrink-0 md:col-span-1 flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={selectedItems.has(item.id)}
                                        onChange={() => toggleSelectItem(item.id)}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                </div>

                                {/* Name */}
                                <div className="flex-1 min-w-0 md:col-span-5 font-medium flex items-center">
                                    <div className="shrink-0 mr-2 md:mr-3">
                                        {item.type === 'folder' ? (
                                            <div className="h-8 w-8 bg-blue-100 dark:bg-blue-900/30 rounded flex items-center justify-center">
                                                <Trash2 className="h-4 w-4 text-blue-600" />
                                            </div>
                                        ) : (
                                            <FileThumbnail fileId={item.id} type="file" name={item.name} />
                                        )}
                                    </div>
                                    <div className="truncate">
                                        <span className="truncate block" title={item.name}>{item.name}</span>
                                        <span className="md:hidden text-xs text-slate-400 capitalize">{item.type} · {new Date(item.deleted_at).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                {/* Type - desktop only */}
                                <div className="hidden md:block md:col-span-2 text-sm text-slate-500 capitalize">{item.type}</div>

                                {/* Date - desktop only */}
                                <div className="hidden md:block md:col-span-2 text-sm text-slate-500">{new Date(item.deleted_at).toLocaleDateString()}</div>

                                {/* Actions */}
                                <div className="shrink-0 flex items-center gap-1 md:col-span-2 md:justify-end">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRestore(item.id, item.type)}
                                        title="Restore"
                                        className="h-9 w-9 md:h-8 md:w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handlePermanentDelete(item.id, item.type)}
                                        title="Permanently Delete"
                                        className="h-9 w-9 md:h-8 md:w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
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
