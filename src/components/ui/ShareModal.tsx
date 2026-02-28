"use client";

import { useState } from 'react';
import { X, Copy, Check, Link as LinkIcon, Trash2, Loader2, Globe } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    itemId: string;
    itemType: 'file' | 'folder';
    itemName: string;
}

export function ShareModal({ isOpen, onClose, itemId, itemType, itemName }: ShareModalProps) {
    const [loading, setLoading] = useState(false);
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [shareLinkId, setShareLinkId] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [expiresValue, setExpiresValue] = useState<number>(1);
    const [expiresUnit, setExpiresUnit] = useState<'hours' | 'days' | 'none'>('none');

    // Normally we'd fetch existing share links here if we had an endpoint for it.
    // For simplicity, generating a new link will just create one.

    if (!isOpen) return null;

    const handleCreateLink = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const res = await fetch('/api/share', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    fileId: itemType === 'file' ? itemId : null,
                    folderId: itemType === 'folder' ? itemId : null,
                    expiresValue: expiresUnit !== 'none' ? expiresValue : null,
                    expiresUnit: expiresUnit !== 'none' ? expiresUnit : null
                })
            });

            if (!res.ok) throw new Error('Failed to generate link');

            const data = await res.json();
            const token = data.shareLink.id;
            setShareLinkId(token);
            setShareUrl(`${window.location.origin}/share/${token}`);
        } catch (err) {
            console.error(err);
            setError("Could not create share link.");
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        if (!shareUrl) return;
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleRevoke = async () => {
        if (!shareLinkId) return;
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const res = await fetch(`/api/share?id=${shareLinkId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });
            if (!res.ok) throw new Error('Failed to revoke');
            setShareUrl(null);
            setShareLinkId(null);
        } catch (err) {
            console.error(err);
            setError("Could not revoke link.");
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
                        <Globe className="w-5 h-5 mr-2 text-blue-500" />
                        Share {itemType}
                    </h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    <p className="text-sm border p-3 rounded-lg dark:border-slate-800 mb-6 bg-slate-50 dark:bg-slate-800/50">
                        <span className="font-semibold text-slate-900 dark:text-white">{itemName}</span>
                    </p>

                    {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

                    {!shareUrl ? (
                        <div className="text-center">
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                                Anyone with the link will be able to view and download this {itemType}.
                            </p>

                            <div className="mb-6 text-left">
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Expiration Option</label>
                                <div className="flex gap-2">
                                    <select
                                        title="Select expiration unit"
                                        value={expiresUnit}
                                        onChange={(e) => setExpiresUnit(e.target.value as any)}
                                        className="flex-1 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm px-3 py-2.5 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500/50"
                                    >
                                        <option value="none">No Limit</option>
                                        <option value="hours">Hours</option>
                                        <option value="days">Days</option>
                                    </select>
                                    {expiresUnit !== 'none' && (
                                        <input
                                            title="Expiration value"
                                            type="number"
                                            min="1"
                                            value={expiresValue}
                                            onChange={(e) => setExpiresValue(parseInt(e.target.value) || 1)}
                                            className="w-24 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm px-3 py-2.5 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500/50"
                                        />
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={handleCreateLink}
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <LinkIcon className="w-4 h-4 mr-2" />}
                                Create Public Link
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Public Link</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={shareUrl}
                                        className="flex-1 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm px-3 py-2.5 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-mono"
                                    />
                                    <button
                                        onClick={handleCopy}
                                        className="flex-shrink-0 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 p-2.5 rounded-lg transition-colors flex items-center justify-center"
                                        title="Copy to clipboard"
                                    >
                                        {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    onClick={handleRevoke}
                                    disabled={loading}
                                    className="w-full bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 hover:text-red-700 font-medium py-2 rounded-lg flex items-center justify-center transition-colors text-sm disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                                    Revoke Link
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
