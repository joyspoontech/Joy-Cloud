"use client";

import { useState, useEffect, useCallback } from 'react';
import { X, Download, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface PreviewFile {
    id: string;
    name: string;
    type: string;
    size: number;
}

interface FilePreviewModalProps {
    file: PreviewFile | null;
    onClose: () => void;
    onDownload: (fileId: string) => void;
    allFiles: PreviewFile[];
    onNavigate: (file: PreviewFile) => void;
    isPublic?: boolean;
    publicToken?: string;
}

export function FilePreviewModal({ file, onClose, onDownload, allFiles, onNavigate, isPublic, publicToken }: FilePreviewModalProps) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const previewableFiles = allFiles.filter(f => isPreviewable(f.type));
    const currentIndex = file ? previewableFiles.findIndex(f => f.id === file.id) : -1;
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < previewableFiles.length - 1;

    const goNext = useCallback(() => {
        if (hasNext) onNavigate(previewableFiles[currentIndex + 1]);
    }, [hasNext, currentIndex, previewableFiles, onNavigate]);

    const goPrev = useCallback(() => {
        if (hasPrev) onNavigate(previewableFiles[currentIndex - 1]);
    }, [hasPrev, currentIndex, previewableFiles, onNavigate]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') goNext();
            if (e.key === 'ArrowLeft') goPrev();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, goNext, goPrev]);

    useEffect(() => {
        if (!file) return;
        setLoading(true);
        setError(false);
        setPreviewUrl(null);
        fetchPreviewUrl(file.id);
    }, [file?.id]);

    const fetchPreviewUrl = async (fileId: string) => {
        try {
            let res;
            if (isPublic && publicToken) {
                // Public fetch - no auth needed
                res = await fetch(`/api/public/download?fileId=${fileId}&token=${publicToken}&preview=true`);
            } else {
                // Authenticated fetch
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;

                res = await fetch(`/api/download?fileId=${fileId}&preview=true`, {
                    headers: { 'Authorization': `Bearer ${session.access_token}` },
                });
            }

            if (res && res.ok) {
                const { url } = await res.json();
                if (url) {
                    setPreviewUrl(url);
                } else {
                    setError(true);
                }
            } else {
                setError(true);
            }
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    if (!file) return null;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />

            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 md:px-6 py-3 bg-gradient-to-b from-black/80 to-transparent">
                <div className="flex items-center min-w-0 flex-1 mr-4">
                    <p className="text-white font-medium truncate text-sm md:text-base">{file.name}</p>
                    {previewableFiles.length > 1 && (
                        <span className="ml-3 text-white/50 text-xs shrink-0">
                            {currentIndex + 1} / {previewableFiles.length}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={(e) => { e.stopPropagation(); onDownload(file.id); }}
                        className="h-10 w-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                        title="Download"
                    >
                        <Download className="h-5 w-5" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                        className="h-10 w-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                        title="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Navigation arrows */}
            {hasPrev && (
                <button
                    onClick={(e) => { e.stopPropagation(); goPrev(); }}
                    className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 z-10 h-12 w-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                    <ChevronLeft className="h-6 w-6" />
                </button>
            )}
            {hasNext && (
                <button
                    onClick={(e) => { e.stopPropagation(); goNext(); }}
                    className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 z-10 h-12 w-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                    <ChevronRight className="h-6 w-6" />
                </button>
            )}

            {/* Content */}
            <div className="relative z-[5] max-w-[90vw] max-h-[85vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                {loading && (
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-10 w-10 text-white animate-spin" />
                        <p className="text-white/60 text-sm">Loading preview...</p>
                    </div>
                )}

                {error && !loading && (
                    <div className="flex flex-col items-center gap-3 text-center px-8">
                        <p className="text-white text-lg font-medium">Preview unavailable</p>
                        <p className="text-white/60 text-sm">This file cannot be previewed.</p>
                        <button
                            onClick={() => onDownload(file.id)}
                            className="mt-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
                        >
                            Download Instead
                        </button>
                    </div>
                )}

                {previewUrl && !loading && isImage && (
                    <img
                        src={previewUrl}
                        alt={file.name}
                        className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
                        onError={() => setError(true)}
                    />
                )}

                {previewUrl && !loading && isVideo && (
                    <video
                        src={previewUrl}
                        controls
                        autoPlay
                        className="max-w-[90vw] max-h-[85vh] rounded-lg shadow-2xl"
                        onError={() => setError(true)}
                    >
                        Your browser does not support video playback.
                    </video>
                )}
            </div>
        </div>
    );
}

export function isPreviewable(mimeType: string): boolean {
    return mimeType.startsWith('image/') || mimeType.startsWith('video/');
}
