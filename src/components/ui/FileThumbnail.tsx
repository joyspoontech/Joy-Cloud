"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Image as ImageIcon, FileText, Film, File as FileIcon } from 'lucide-react';
import Image from 'next/image';

interface FileThumbnailProps {
    fileId: string;
    type: string;
    name: string;
    isPublic?: boolean;
    publicToken?: string;
}

export function FileThumbnail({ fileId, type, name, isPublic, publicToken }: FileThumbnailProps) {
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    useEffect(() => {
        if (type.startsWith('image/')) {
            fetchPreviewUrl();
        }
    }, [fileId, type]);

    const fetchPreviewUrl = async () => {
        try {
            let urlToFetch = '';

            if (isPublic && publicToken) {
                // Public fetch - no auth needed
                urlToFetch = `/api/public/download?fileId=${fileId}&token=${publicToken}&preview=true`;
                const res = await fetch(urlToFetch);
                if (res.ok) {
                    const { url } = await res.json();
                    if (url) setImageUrl(url);
                }
            } else {
                // Authenticated fetch
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;

                urlToFetch = `/api/download?fileId=${fileId}&preview=true`;
                const res = await fetch(urlToFetch, {
                    headers: { 'Authorization': `Bearer ${session.access_token}` },
                });
                if (res.ok) {
                    const { url } = await res.json();
                    if (url) setImageUrl(url);
                }
            }
        } catch (error) {
            console.error("Failed to load thumbnail", error);
        }
    };

    if (imageUrl) {
        return (
            <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <Image
                    src={imageUrl}
                    alt={name}
                    fill
                    className="object-cover"
                    unoptimized // Use unoptimized for external S3 URLs unless configured in next.config
                />
            </div>
        );
    }

    // Fallback icons
    let Icon = FileIcon;
    let colorClass = "text-slate-500";

    if (type.includes('image')) {
        Icon = ImageIcon;
        colorClass = "text-blue-500";
    } else if (type.includes('pdf')) {
        Icon = FileText;
        colorClass = "text-red-500";
    } else if (type.includes('video')) {
        Icon = Film;
        colorClass = "text-purple-500";
    }

    return (
        <div className="h-10 w-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center shrink-0">
            <Icon className={`h-5 w-5 ${colorClass}`} />
        </div>
    );
}
