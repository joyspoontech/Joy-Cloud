"use client";

import { useState, useEffect } from 'react';
import { X, Loader2, Edit2 } from 'lucide-react';

interface RenameModalProps {
    isOpen: boolean;
    onClose: () => void;
    itemId: string;
    currentName: string;
    onRenameSuccess: () => void;
}

export function RenameModal({ isOpen, onClose, itemId, currentName, onRenameSuccess }: RenameModalProps) {
    const [loading, setLoading] = useState(false);
    const [newName, setNewName] = useState(currentName);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setNewName(currentName);
            setError(null);
        }
    }, [isOpen, currentName]);

    if (!isOpen) return null;

    const handleRename = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = newName.trim();

        if (!trimmedName) {
            setError('Name cannot be empty.');
            return;
        }

        if (trimmedName === currentName) {
            onClose();
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { supabase } = await import('@/lib/supabase');
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) throw new Error('Not authenticated');

            const res = await fetch('/api/rename-folder', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ folderId: itemId, newName: trimmedName })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to rename folder');
            }

            onRenameSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Could not rename folder.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
                        <Edit2 className="w-5 h-5 mr-2 text-blue-500" />
                        Rename Folder
                    </h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

                    <form onSubmit={handleRename} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Folder Name
                            </label>
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                autoFocus
                                required
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-6">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !newName.trim()}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center"
                            >
                                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Rename
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
