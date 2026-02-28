"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Play, Image as ImageIcon } from 'lucide-react';

interface MediaFile {
    id: string;
    name: string;
    type: string;
    size: number;
}

interface MediaGalleryProps {
    files: MediaFile[];
    onPreview: (file: MediaFile) => void;
    isPublic?: boolean;
    publicToken?: string;
}

export function MediaGallery({ files, onPreview, isPublic, publicToken }: MediaGalleryProps) {
    const mediaFiles = files.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));

    if (mediaFiles.length === 0) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm p-12 text-center">
                <ImageIcon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-white">No media files</h3>
                <p className="text-slate-500 text-sm mt-1">Upload images or videos to see them here.</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-4 md:px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Media Gallery · {mediaFiles.length} item{mediaFiles.length !== 1 ? 's' : ''}
                </span>
            </div>
            <div className="p-3 md:p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3">
                {mediaFiles.map(file => (
                    <MediaTile key={file.id} file={file} onClick={() => onPreview(file)} isPublic={isPublic} publicToken={publicToken} />
                ))}
            </div>
        </div>
    );
}

function MediaTile({ file, onClick, isPublic, publicToken }: { file: MediaFile; onClick: () => void; isPublic?: boolean; publicToken?: string }) {
    const [thumbUrl, setThumbUrl] = useState<string | null>(null);
    const [loaded, setLoaded] = useState(false);
    const isVideo = file.type.startsWith('video/');

    useEffect(() => {
        fetchThumb();
    }, [file.id]);

    const fetchThumb = async () => {
        try {
            let res;
            if (isPublic && publicToken) {
                res = await fetch(`/api/public/download?fileId=${file.id}&token=${publicToken}&preview=true`);
            } else {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;

                res = await fetch(`/api/download?fileId=${file.id}&preview=true`, {
                    headers: { 'Authorization': `Bearer ${session.access_token}` },
                });
            }
            if (!res.ok) return;
            const { url } = await res.json();
            if (url) setThumbUrl(url);
        } catch {
            // Thumbnail failed to load
        }
    };

    return (
        <button
            onClick={onClick}
            className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 group cursor-pointer border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all hover:shadow-lg hover:scale-[1.02]"
        >
            {thumbUrl ? (
                isVideo ? (
                    <>
                        <video
                            src={thumbUrl}
                            className="w-full h-full object-cover"
                            muted
                            preload="metadata"
                            onLoadedData={() => setLoaded(true)}
                        />
                        {/* Play overlay */}
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/40 transition-colors">
                            <div className="h-12 w-12 rounded-full bg-white/90 dark:bg-white/80 flex items-center justify-center shadow-lg">
                                <Play className="h-6 w-6 text-slate-900 ml-0.5" fill="currentColor" />
                            </div>
                        </div>
                    </>
                ) : (
                    <img
                        src={thumbUrl}
                        alt={file.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onLoad={() => setLoaded(true)}
                    />
                )
            ) : (
                <div className="w-full h-full flex items-center justify-center">
                    <div className="animate-pulse h-6 w-6 rounded-full bg-slate-300 dark:bg-slate-600" />
                </div>
            )}

            {/* File name overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white text-xs truncate font-medium">{file.name}</p>
            </div>

            {/* Video badge */}
            {isVideo && (
                <div className="absolute top-1.5 right-1.5 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                    VIDEO
                </div>
            )}
        </button>
    );
}
