"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Image as ImageIcon, FileText, Film, File as FileIcon } from 'lucide-react';
import Image from 'next/image';

interface FileThumbnailProps {
    fileId: string;
    type: string;
    name: string;
}

export function FileThumbnail({ fileId, type, name }: FileThumbnailProps) {
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    useEffect(() => {
        if (type.startsWith('image/')) {
            fetchPreviewUrl();
        }
    }, [fileId, type]);

    const fetchPreviewUrl = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const res = await fetch(`/api/download?fileId=${fileId}&preview=true`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` },
            });
            const { url } = await res.json();
            if (url) setImageUrl(url);
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
