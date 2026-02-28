"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Upload, FileText, Image as ImageIcon, Film, File as FileIcon, Download, Trash2, LogOut, Search, Clock, HardDrive, Folder, FolderPlus, ChevronRight, ArrowLeft, RefreshCw, Menu, X, LayoutGrid, List, CheckSquare, Share2, Edit2, Link as LinkIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { FileThumbnail } from '@/components/ui/FileThumbnail';
import { FilePreviewModal, isPreviewable } from '@/components/ui/FilePreviewModal';
import { MediaGallery } from '@/components/ui/MediaGallery';
import { ShareModal } from '@/components/ui/ShareModal';
import { RenameModal } from '@/components/ui/RenameModal';

interface FileRecord {
    id: string;
    name: string;
    size: number;
    type: string;
    created_at: string;
    folder_id: string | null;
}

interface FolderRecord {
    id: string;
    name: string;
    parent_id: string | null;
    created_at: string;
}

export default function Dashboard() {
    const [files, setFiles] = useState<FileRecord[]>([]);
    const [folders, setFolders] = useState<FolderRecord[]>([]);
    const [currentFolder, setCurrentFolder] = useState<FolderRecord | null>(null);
    const [breadcrumbs, setBreadcrumbs] = useState<FolderRecord[]>([]);

    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<{ fileName: string; progress: number; status: 'uploading' | 'complete' | 'error' }[]>([]);
    const [loading, setLoading] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [previewFile, setPreviewFile] = useState<FileRecord | null>(null);
    const [showGallery, setShowGallery] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [shareItem, setShareItem] = useState<{ id: string, type: 'file' | 'folder', name: string } | null>(null);

    const [renameModalOpen, setRenameModalOpen] = useState(false);
    const [renameItem, setRenameItem] = useState<{ id: string, currentName: string } | null>(null);
    const router = useRouter();

    useEffect(() => {
        fetchContent();
    }, [currentFolder]);

    const fetchContent = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push('/login');
            return;
        }

        // Fetch Folders
        let folderQuery = supabase
            .from('folders')
            .select('*')
            .is('deleted_at', null) // Filter out soft-deleted folders
            .order('name');

        if (currentFolder) {
            folderQuery = folderQuery.eq('parent_id', currentFolder.id);
        } else {
            folderQuery = folderQuery.is('parent_id', null);
        }

        const { data: folderData, error: folderError } = await folderQuery;
        if (folderData) setFolders(folderData);

        // Fetch Files
        let fileQuery = supabase
            .from('files')
            .select('*')
            .is('deleted_at', null) // Filter out soft-deleted files
            .order('created_at', { ascending: false });

        if (currentFolder) {
            fileQuery = fileQuery.eq('folder_id', currentFolder.id);
        } else {
            fileQuery = fileQuery.is('folder_id', null);
        }

        const { data: fileData, error: fileError } = await fileQuery;
        if (fileData) setFiles(fileData);

        setLoading(false);
    };

    // Helper to get current path string
    const getCurrentPath = () => {
        return breadcrumbs.map(b => b.name).join('/');
    };

    const handleCreateFolder = async () => {
        const name = prompt("Enter folder name:");
        if (!name) return;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        try {
            const res = await fetch('/api/create-folder', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    name,
                    parentId: currentFolder ? currentFolder.id : null,
                    path: getCurrentPath()
                }),
            });

            if (!res.ok) throw new Error('Failed to create folder');
            fetchContent();
        } catch (error) {
            console.error(error);
            alert('Failed to create folder');
        }
    };

    const navigateToFolder = (folder: FolderRecord) => {
        setBreadcrumbs([...breadcrumbs, folder]);
        setCurrentFolder(folder);
    };

    const navigateUp = () => {
        if (breadcrumbs.length === 0) return;
        const newBreadcrumbs = [...breadcrumbs];
        newBreadcrumbs.pop(); // Remove current
        setBreadcrumbs(newBreadcrumbs);
        setCurrentFolder(newBreadcrumbs.length > 0 ? newBreadcrumbs[newBreadcrumbs.length - 1] : null);
    };

    const navigateToBreadcrumb = (index: number) => {
        if (index === -1) {
            setBreadcrumbs([]);
            setCurrentFolder(null);
        } else {
            const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
            setBreadcrumbs(newBreadcrumbs);
            setCurrentFolder(newBreadcrumbs[index]);
        }
    };

    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // Only hide overlay if leaving the main container
        if (e.currentTarget === e.target) {
            setIsDragging(false);
        }
    };

    // Helper function to traverse folders in drag-and-drop
    const traverseFileTree = async (item: any, path: string = ''): Promise<File[]> => {
        const files: File[] = [];

        if (item.isFile) {
            return new Promise((resolve) => {
                item.file((file: File) => {
                    // Add path information to file for folder structure
                    const fileWithPath = new File([file], file.name, { type: file.type });
                    Object.defineProperty(fileWithPath, 'webkitRelativePath', {
                        value: path ? `${path}/${file.name}` : file.name,
                        writable: false
                    });
                    resolve([fileWithPath]);
                });
            });
        } else if (item.isDirectory) {
            const dirReader = item.createReader();
            return new Promise((resolve) => {
                const readEntries = () => {
                    dirReader.readEntries(async (entries: any[]) => {
                        if (entries.length === 0) {
                            resolve(files);
                            return;
                        }

                        for (const entry of entries) {
                            const newPath = path ? `${path}/${item.name}` : item.name;
                            const entryFiles = await traverseFileTree(entry, newPath);
                            files.push(...entryFiles);
                        }

                        readEntries(); // Continue reading if there are more entries
                    });
                };
                readEntries();
            });
        }

        return files;
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const items = Array.from(e.dataTransfer.items);
        const allFiles: File[] = [];

        // Check if we're dropping folders using FileSystemEntry API
        if (items.length > 0 && typeof items[0].webkitGetAsEntry === 'function') {
            for (const item of items) {
                const entry = item.webkitGetAsEntry();
                if (entry) {
                    const files = await traverseFileTree(entry);
                    allFiles.push(...files);
                }
            }

            if (allFiles.length > 0) {
                // Convert to FileList-like object
                const fileList = Object.assign(allFiles, { item: (i: number) => allFiles[i] });
                await processBatchUpload(fileList as any);
                return;
            }
        }

        // Fallback to regular file handling
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            await processBatchUpload(e.dataTransfer.files);
        }
    };

    const processUpload = async (file: File, customFolderPath?: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const folderPath = customFolderPath !== undefined ? customFolderPath : getCurrentPath();

            const res = await fetch('/api/upload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    filename: file.name,
                    contentType: file.type,
                    size: file.size,
                    folderPath: folderPath
                }),
            });

            if (!res.ok) {
                const errorData = await res.text();
                console.error('Upload API error:', errorData);
                throw new Error(`Failed to get upload URL: ${errorData}`);
            }
            const { url, key } = await res.json();

            const uploadRes = await fetch(url, {
                method: 'PUT',
                body: file,
                headers: { 'Content-Type': file.type },
            });

            if (!uploadRes.ok) {
                const errorText = await uploadRes.text();
                console.error('S3 upload failed:', uploadRes.status, errorText);
                throw new Error(`Upload to S3 failed: ${uploadRes.status} - ${errorText}`);
            }

            // Determine folder_id for database insertion
            let targetFolderId: string | null = currentFolder ? currentFolder.id : null;

            // If customFolderPath is provided and different from current path, find/create the folder
            if (customFolderPath && customFolderPath !== getCurrentPath()) {
                const pathParts = customFolderPath.split('/').filter(p => p);
                let parentId: string | null = null;

                for (const folderName of pathParts) {
                    // Check if folder exists
                    let folderQuery = supabase
                        .from('folders')
                        .select('id')
                        .eq('name', folderName)
                        .is('deleted_at', null);

                    if (parentId) {
                        folderQuery = folderQuery.eq('parent_id', parentId);
                    } else {
                        folderQuery = folderQuery.is('parent_id', null);
                    }

                    const { data: existingFolders } = await folderQuery;

                    if (existingFolders && existingFolders.length > 0) {
                        parentId = existingFolders[0].id;
                    } else {
                        // Create folder
                        const { data: newFolder, error: folderError }: { data: any; error: any } = await supabase
                            .from('folders')
                            .insert({
                                name: folderName,
                                user_id: session.user.id,
                                parent_id: parentId
                            })
                            .select()
                            .single();

                        if (folderError) throw folderError;
                        parentId = newFolder.id;
                    }
                }

                targetFolderId = parentId;
            }

            const { error } = await supabase.from('files').insert({
                name: file.name,
                size: file.size,
                type: file.type,
                s3_key: key,
                user_id: session.user.id,
                folder_id: targetFolderId
            });

            if (error) throw error;
        } catch (error) {
            console.error(error);
            throw error; // Re-throw for batch handler
        }
    };

    const handleUploadInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        await processBatchUpload(e.target.files);
        e.target.value = ''; // Reset input for re-selection
    };

    const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        await processBatchUpload(e.target.files);
        e.target.value = ''; // Reset input
    };

    const processBatchUpload = async (fileList: FileList) => {
        const files = Array.from(fileList);
        if (files.length === 0) return;

        setUploading(true);
        setUploadProgress(files.map(f => ({ fileName: f.name, progress: 0, status: 'uploading' })));

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            setUploading(false);
            return;
        }

        // Request screen wake lock to prevent the device from sleeping during long uploads
        let wakeLock: any = null;
        try {
            if ('wakeLock' in navigator) {
                wakeLock = await (navigator as any).wakeLock.request('screen');
            }
        } catch (err: any) {
            console.warn(`Wake Lock error: ${err.name}, ${err.message}`);
        }

        // Extract folder structure from file paths (for folder uploads)
        const folderStructure = extractFolderStructure(files);

        // Upload files sequentially to avoid overwhelming the API
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                // Update progress
                setUploadProgress(prev => prev.map((p, idx) =>
                    idx === i ? { ...p, progress: 50 } : p
                ));

                // Determine target folder
                const filePath = (file as any).webkitRelativePath || file.name;
                const pathParts = filePath.split('/');
                const fileName = pathParts.pop()!;
                const folderPath = pathParts.filter((p: string) => p).join('/'); // Filter out empty parts

                // Get current folder path
                const basePath = getCurrentPath();
                let fullPath = '';
                if (basePath && folderPath) {
                    fullPath = `${basePath}/${folderPath}`;
                } else if (basePath) {
                    fullPath = basePath;
                } else if (folderPath) {
                    fullPath = folderPath;
                }

                await processUpload(file, fullPath);

                // Mark as complete
                setUploadProgress(prev => prev.map((p, idx) =>
                    idx === i ? { ...p, progress: 100, status: 'complete' } : p
                ));
            } catch (error) {
                console.error(`Failed to upload ${file.name}:`, error);
                setUploadProgress(prev => prev.map((p, idx) =>
                    idx === i ? { ...p, status: 'error' } : p
                ));
                alert(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }

        // Release the wake lock after uploads finish
        if (wakeLock !== null) {
            try {
                await wakeLock.release();
                wakeLock = null;
            } catch (err: any) {
                console.warn(`Wake Lock release error: ${err.name}, ${err.message}`);
            }
        }

        setUploading(false);
        // Clear progress after 2 seconds
        setTimeout(() => setUploadProgress([]), 2000);
        fetchContent();
    };

    const extractFolderStructure = (files: File[]) => {
        const structure = new Map<string, string[]>();
        files.forEach(file => {
            const path = (file as any).webkitRelativePath || file.name;
            const parts = path.split('/');
            if (parts.length > 1) {
                const folder = parts.slice(0, -1).join('/');
                if (!structure.has(folder)) {
                    structure.set(folder, []);
                }
                structure.get(folder)!.push(file.name);
            }
        });
        return structure;
    };

    const handleDownload = async (fileId: string) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        try {
            const res = await fetch(`/api/download?fileId=${fileId}`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });

            if (!res.ok) throw new Error('Failed to get download URL');

            const { url } = await res.json();

            // Create a temporary hidden anchor to trigger download instead of window.open
            // to avoid popup blockers when downloading multiple files
            const a = document.createElement('a');
            a.href = url;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (error) {
            console.error('Download error:', error);
            alert('Failed to download file');
        }
    };

    const handleBulkDownload = async () => {
        if (selectedFiles.length === 0) return;

        // Process sequentially with a tiny delay to avoid hitting rate limits or triggering overly aggressive pop-up blockers
        for (const fileId of selectedFiles) {
            await handleDownload(fileId);
            await new Promise(r => setTimeout(r, 300));
        }
        setSelectedFiles([]);
    };

    const handleBulkDelete = async () => {
        if (selectedFiles.length === 0) return;

        if (!confirm(`Are you sure you want to delete ${selectedFiles.length} item(s)?`)) return;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        try {
            const res = await fetch(`/api/delete-items`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    items: selectedFiles.map(id => {
                        const isFolder = folders.some(f => f.id === id);
                        return { id, type: isFolder ? 'folder' : 'file' };
                    })
                })
            });

            if (!res.ok) throw new Error('Failed to delete files');

            fetchContent();
            setSelectedFiles([]);
        } catch (error) {
            console.error(error);
            alert('Failed to delete selected files');
        }
    };

    const toggleSelection = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setSelectedFiles(prev =>
            prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]
        );
    };

    const selectAll = () => {
        const visibleFiles = files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
        const visibleFolders = folders.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
        const allVisibleIds = [...visibleFolders.map(f => f.id), ...visibleFiles.map(f => f.id)];

        if (selectedFiles.length === allVisibleIds.length && allVisibleIds.length > 0) {
            setSelectedFiles([]);
        } else {
            setSelectedFiles(allVisibleIds);
        }
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    const [syncing, setSyncing] = useState(false);

    const [isAdmin, setIsAdmin] = useState(false);

    const handleSync = async () => {
        setSyncing(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const res = await fetch('/api/sync', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}` },
            });

            if (res.ok) {
                fetchContent();
            }
        } catch (error) {
            console.error('Sync failed', error);
        } finally {
            setSyncing(false);
        }
    };

    // Check admin status
    useEffect(() => {
        const checkRole = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
                if (data?.role === 'admin') {
                    setIsAdmin(true);
                    // Fetch pending users count
                    fetchPendingCount();
                }
            }
        };
        checkRole();
    }, []);

    const [pendingUsersCount, setPendingUsersCount] = useState(0);

    const fetchPendingCount = async () => {
        const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('approval_status', 'pending');
        setPendingUsersCount(count || 0);
    };

    const handleDelete = async (id: string, type: 'file' | 'folder') => {
        if (!confirm('Are you sure you want to delete this item? It will be moved to the Recycle Bin.')) return;

        const table = type === 'file' ? 'files' : 'folders';

        try {
            const { error } = await supabase
                .from(table)
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;

            fetchContent();
        } catch (error) {
            console.error('Delete failed:', error);
            alert('Failed to delete item');
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div
            className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col relative"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Drag Overlay */}
            {isDragging && (
                <div className="absolute inset-0 bg-blue-500/20 backdrop-blur-sm z-50 flex items-center justify-center border-4 border-blue-500 border-dashed m-4 rounded-xl pointer-events-none">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-2xl flex flex-col items-center animate-bounce">
                        <Upload className="h-16 w-16 text-blue-500 mb-4" />
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Drop files to upload</h3>
                    </div>
                </div>
            )}

            {/* Navbar */}
            <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-20">
                <div className="h-14 md:h-16 px-4 md:px-6 flex justify-between items-center">
                    <div className="flex items-center space-x-2 md:space-x-3 cursor-pointer" onClick={() => { setCurrentFolder(null); setBreadcrumbs([]); }}>
                        <div className="h-8 w-8 relative bg-white rounded-lg shadow-sm overflow-hidden">
                            <img src="/icon.png" alt="Joy Cloud" className="h-full w-full object-cover" />
                        </div>
                        <h1 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white tracking-tight">Joy Cloud</h1>
                    </div>

                    {/* Desktop search */}
                    <div className="hidden md:block flex-1 max-w-xl mx-8">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search files..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-10 pl-10 pr-4 rounded-lg bg-slate-100 dark:bg-slate-800 border-transparent focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 transition-all outline-none text-sm"
                            />
                        </div>
                    </div>

                    {/* Desktop nav buttons */}
                    <div className="hidden md:flex items-center">
                        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/shared-links')} className="mr-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10 relative">
                            <LinkIcon className="h-4 w-4 mr-2" />
                            Shared Links
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleSync} loading={syncing} className="mr-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10">
                            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                            Sync
                        </Button>
                        {isAdmin && (
                            <>
                                <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/pending-users')} className="mr-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10 relative">
                                    <Clock className="h-4 w-4 mr-2" />
                                    Pending Users
                                    {pendingUsersCount > 0 && (
                                        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-semibold">
                                            {pendingUsersCount}
                                        </span>
                                    )}
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/recycle-bin')} className="mr-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Recycle Bin
                                </Button>
                            </>
                        )}
                        <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10">
                            <LogOut className="h-4 w-4 mr-2" />
                            Sign Out
                        </Button>
                    </div>

                    {/* Mobile action buttons */}
                    <div className="flex md:hidden items-center gap-1">
                        <button
                            onClick={handleSync}
                            className="h-10 w-10 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Sync Files"
                        >
                            <RefreshCw className={`h-5 w-5 ${syncing ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
                            className="h-10 w-10 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                            <Search className="h-5 w-5" />
                        </button>
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="h-10 w-10 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 relative"
                        >
                            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                            {pendingUsersCount > 0 && !mobileMenuOpen && (
                                <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-500" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile search bar */}
                {mobileSearchOpen && (
                    <div className="md:hidden px-4 pb-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search files..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                                className="w-full h-10 pl-10 pr-4 rounded-lg bg-slate-100 dark:bg-slate-800 border-transparent focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 transition-all outline-none text-sm"
                            />
                        </div>
                    </div>
                )}

                {/* Mobile menu dropdown */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 space-y-1">
                        <button onClick={() => { router.push('/dashboard/shared-links'); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
                            <LinkIcon className="h-4 w-4" />
                            Shared Links
                        </button>
                        {isAdmin && (
                            <>
                                <button onClick={() => { router.push('/dashboard/pending-users'); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
                                    <Clock className="h-4 w-4" />
                                    Pending Users
                                    {pendingUsersCount > 0 && (
                                        <span className="ml-auto h-5 min-w-5 px-1.5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-semibold">
                                            {pendingUsersCount}
                                        </span>
                                    )}
                                </button>
                                <button onClick={() => { router.push('/dashboard/recycle-bin'); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
                                    <Trash2 className="h-4 w-4" />
                                    Recycle Bin
                                </button>
                            </>
                        )}
                        <div className="border-t border-gray-200 dark:border-slate-800 my-1" />
                        <button onClick={() => { handleSignOut(); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10">
                            <LogOut className="h-4 w-4" />
                            Sign Out
                        </button>
                    </div>
                )}
            </header>

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
                {/* Header Actions */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center">
                            My Files
                        </h2>
                        <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 mt-1 space-x-2">
                            <button onClick={() => navigateToBreadcrumb(-1)} className="hover:text-blue-600">Home</button>
                            {breadcrumbs.map((folder, index) => (
                                <div key={folder.id} className="flex items-center">
                                    <ChevronRight className="h-4 w-4 mx-1" />
                                    <button onClick={() => navigateToBreadcrumb(index)} className="hover:text-blue-600 font-medium">
                                        {folder.name}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                        <Button
                            variant={showGallery ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setShowGallery(!showGallery)}
                            className={showGallery ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-300'}
                            title={showGallery ? 'Switch to list view' : 'Show media gallery'}
                        >
                            {showGallery ? <List className="h-4 w-4 mr-1 md:mr-2" /> : <LayoutGrid className="h-4 w-4 mr-1 md:mr-2" />}
                            <span className="hidden sm:inline">{showGallery ? 'List' : 'Gallery'}</span>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleCreateFolder} className="text-slate-600 dark:text-slate-300">
                            <FolderPlus className="h-4 w-4 mr-1 md:mr-2" />
                            <span className="hidden sm:inline">New Folder</span>
                            <span className="sm:hidden">Folder</span>
                        </Button>
                        <div className="relative">
                            <input
                                type="file"
                                /* @ts-ignore */
                                webkitdirectory=""
                                directory=""
                                onChange={handleFolderUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                disabled={uploading}
                                title="Upload folder"
                            />
                            <Button variant="outline" size="sm" loading={uploading} className="text-slate-600 dark:text-slate-300">
                                <Folder className="h-4 w-4 mr-1 md:mr-2" />
                                <span className="hidden sm:inline">Upload Folder</span>
                                <span className="sm:hidden">Folder</span>
                            </Button>
                        </div>
                        <div className="relative">
                            <input
                                type="file"
                                multiple
                                onChange={handleUploadInput}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                disabled={uploading}
                                title="Upload files"
                            />
                            <Button size="sm" loading={uploading} className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20">
                                <Upload className="h-4 w-4 mr-1 md:mr-2" />
                                Upload
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Upload Progress */}
                {uploadProgress.length > 0 && (
                    <div className="mb-6 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm p-4">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Uploading {uploadProgress.length} file(s)</h3>
                        <div className="space-y-2">
                            {uploadProgress.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-3">
                                    <div className="flex-1">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-slate-700 dark:text-slate-300 truncate">{item.fileName}</span>
                                            <span className="text-slate-500">
                                                {item.status === 'complete' ? '✓' : item.status === 'error' ? '✗' : `${item.progress}%`}
                                            </span>
                                        </div>
                                        <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-300 ${item.status === 'complete' ? 'bg-green-500' :
                                                    item.status === 'error' ? 'bg-red-500' :
                                                        'bg-blue-500'
                                                    }`}
                                                style={{ width: `${item.progress}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Gallery View */}
                {showGallery && (
                    <div className="mb-6">
                        <MediaGallery
                            files={files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))}
                            onPreview={(f) => setPreviewFile(f as FileRecord)}
                        />
                    </div>
                )}

                {/* Content Area */}
                <div className={`bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[300px] md:min-h-[400px] ${showGallery ? 'hidden' : ''}`}>
                    {/* Table Header */}
                    <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider items-center">
                        <div className="col-span-6 flex items-center gap-3">
                            <button onClick={selectAll} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                <CheckSquare className="h-4 w-4" />
                            </button>
                            <span>Name</span>
                        </div>
                        <div className="col-span-2">Size</div>
                        <div className="col-span-3">Date Added</div>
                        <div className="col-span-1 text-right">Actions</div>
                    </div>
                    {/* Mobile Header */}
                    <div className="md:hidden flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        <span>Files & Folders</span>
                        <button onClick={selectAll} className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700">
                            <CheckSquare className="h-3.5 w-3.5" />
                            Select All
                        </button>
                    </div>

                    {/* Loading */}
                    {loading && (
                        <div className="p-12 flex justify-center">
                            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                        </div>
                    )}

                    {/* Empty State */}
                    {!loading && files.length === 0 && folders.length === 0 && !searchQuery && (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="h-20 w-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                <Folder className="h-10 w-10 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900 dark:text-white">This folder is empty</h3>
                            <p className="text-slate-500 max-w-sm mt-2">Upload files or create a subfolder to get started.</p>
                        </div>
                    )}

                    {/* No Search Results */}
                    {!loading && searchQuery && folders.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="h-20 w-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                <Search className="h-10 w-10 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900 dark:text-white">No results found</h3>
                            <p className="text-slate-500 max-w-sm mt-2">No files or folders match &ldquo;{searchQuery}&rdquo;</p>
                        </div>
                    )}

                    {/* Unified List Rows */}
                    <div className="divide-y divide-gray-100 dark:divide-slate-800">
                        {/* Render Folders First */}
                        {folders.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())).map((folder) => {
                            const isSelected = selectedFiles.includes(folder.id);
                            return (
                                <div
                                    key={`folder-${folder.id}`}
                                    onClick={() => navigateToFolder(folder)}
                                    className={`flex items-center gap-3 px-4 md:px-6 py-3 md:py-4 transition-colors group cursor-pointer md:grid md:grid-cols-12 md:gap-4 ${isSelected ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                                >
                                    <div className="flex items-center min-w-0 flex-1 md:col-span-6">
                                        <div
                                            onClick={(e) => toggleSelection(e, folder.id)}
                                            className={`mr-3 shrink-0 h-5 w-5 rounded border flex items-center justify-center cursor-pointer transition-colors ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'}`}
                                        >
                                            {isSelected && <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                        </div>
                                        <div className="mr-3 shrink-0">
                                            <div className="h-10 w-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center border border-blue-100 dark:border-blue-800/50">
                                                <Folder className="h-5 w-5 text-blue-500 fill-blue-500/20" />
                                            </div>
                                        </div>
                                        <div className="truncate">
                                            <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{folder.name}</p>
                                            <p className="text-xs text-slate-400">Folder</p>
                                        </div>
                                    </div>
                                    <div className="hidden md:block md:col-span-2 text-sm text-slate-400">
                                        -
                                    </div>
                                    <div className="hidden md:flex md:col-span-3 text-sm text-slate-600 dark:text-slate-400 items-center">
                                        <Clock className="h-3 w-3 mr-1.5 opacity-70" />
                                        {new Date(folder.created_at).toLocaleDateString()}
                                    </div>
                                    <div className="shrink-0 flex items-center md:col-span-1 md:justify-end opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setRenameItem({ id: folder.id, currentName: folder.name });
                                                setRenameModalOpen(true);
                                            }}
                                            className="h-9 w-9 md:h-8 md:w-8 p-0"
                                            title="Rename"
                                        >
                                            <Edit2 className="h-4 w-4 text-slate-400 md:text-slate-500 hover:text-green-600" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShareItem({ id: folder.id, type: 'folder', name: folder.name });
                                                setShareModalOpen(true);
                                            }}
                                            className="h-9 w-9 md:h-8 md:w-8 p-0 ml-0.5"
                                            title="Share"
                                        >
                                            <Share2 className="h-4 w-4 text-slate-400 md:text-slate-500 hover:text-blue-600" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(folder.id, 'folder');
                                            }}
                                            className="h-9 w-9 md:h-8 md:w-8 p-0 ml-0.5"
                                            title="Delete"
                                        >
                                            <Trash2 className="h-4 w-4 text-slate-400 md:text-slate-500 hover:text-red-600" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Render Files */}
                        {files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())).map((file) => {
                            const isSelected = selectedFiles.includes(file.id);
                            return (
                                <div
                                    key={`file-${file.id}`}
                                    onClick={() => isPreviewable(file.type) ? setPreviewFile(file) : handleDownload(file.id)}
                                    className={`flex items-center gap-3 px-4 md:px-6 py-3 md:py-4 transition-colors group md:grid md:grid-cols-12 md:gap-4 cursor-pointer ${isSelected ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                                    <div className="flex items-center min-w-0 flex-1 md:col-span-6">
                                        <div
                                            onClick={(e) => toggleSelection(e, file.id)}
                                            className={`mr-3 shrink-0 h-5 w-5 rounded border flex items-center justify-center cursor-pointer transition-colors ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'}`}
                                        >
                                            {isSelected && <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                        </div>
                                        <div className="mr-3 shrink-0">
                                            <FileThumbnail fileId={file.id} type={file.type} name={file.name} />
                                        </div>
                                        <div className="truncate">
                                            <p className="font-medium text-slate-900 dark:text-slate-100 truncate" title={file.name}>{file.name}</p>
                                            <p className="text-xs text-slate-400 truncate">
                                                <span className="md:hidden">{formatSize(file.size)} · </span>{file.type}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="hidden md:block md:col-span-2 text-sm text-slate-600 dark:text-slate-400">
                                        {formatSize(file.size)}
                                    </div>
                                    <div className="hidden md:flex md:col-span-3 text-sm text-slate-600 dark:text-slate-400 items-center">
                                        <Clock className="h-3 w-3 mr-1.5 opacity-70" />
                                        {new Date(file.created_at).toLocaleDateString()}
                                    </div>
                                    <div className="shrink-0 flex items-center md:col-span-1 md:justify-end opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShareItem({ id: file.id, type: 'file', name: file.name });
                                                setShareModalOpen(true);
                                            }}
                                            className="h-9 w-9 md:h-8 md:w-8 p-0"
                                            title="Share"
                                        >
                                            <Share2 className="h-4 w-4 text-slate-400 md:text-slate-500 hover:text-blue-600" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDownload(file.id);
                                            }}
                                            className="h-9 w-9 md:h-8 md:w-8 p-0 ml-0.5"
                                            title="Download"
                                        >
                                            <Download className="h-4 w-4 text-slate-400 md:text-slate-500 hover:text-blue-600" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(file.id, 'file');
                                            }}
                                            className="h-9 w-9 md:h-8 md:w-8 p-0 ml-0.5"
                                            title="Delete"
                                        >
                                            <Trash2 className="h-4 w-4 text-slate-400 md:text-slate-500 hover:text-red-600" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </main>

            {/* Floating Bulk Action Bar */}
            {selectedFiles.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-slate-800 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-4 z-50 animate-in slide-in-from-bottom-5">
                    <span className="text-sm font-medium mr-2">{selectedFiles.length} selected</span>
                    {selectedFiles.length === 1 && (
                        <>
                            <button
                                onClick={() => {
                                    const id = selectedFiles[0];
                                    const file = files.find(f => f.id === id);
                                    const folder = folders.find(f => f.id === id);

                                    if (file) {
                                        setShareItem({ id: file.id, type: 'file', name: file.name });
                                    } else if (folder) {
                                        setShareItem({ id: folder.id, type: 'folder', name: folder.name });
                                    }
                                    setShareModalOpen(true);
                                }}
                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors"
                            >
                                <Share2 className="h-4 w-4" /> Share
                            </button>
                            <div className="w-px h-6 bg-slate-700 mx-1"></div>
                        </>
                    )}
                    <button
                        onClick={handleBulkDownload}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors"
                    >
                        <Download className="h-4 w-4" /> Download All
                    </button>
                    <button
                        onClick={handleBulkDelete}
                        className="flex items-center gap-2 hover:bg-red-500/20 text-red-400 hover:text-red-300 px-4 py-2 rounded-full text-sm font-medium transition-colors"
                    >
                        <Trash2 className="h-4 w-4" /> Delete
                    </button>
                    <div className="w-px h-6 bg-slate-700 mx-1"></div>
                    <button
                        onClick={() => setSelectedFiles([])}
                        className="p-2 hover:bg-slate-800 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-white"
                        title="Cancel selection"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* File Preview Modal */}
            <FilePreviewModal
                file={previewFile}
                onClose={() => setPreviewFile(null)}
                onDownload={handleDownload}
                allFiles={files}
                onNavigate={(f) => setPreviewFile(f as FileRecord)}
            />

            {shareItem && (
                <ShareModal
                    isOpen={shareModalOpen}
                    onClose={() => setShareModalOpen(false)}
                    itemId={shareItem.id}
                    itemType={shareItem.type}
                    itemName={shareItem.name}
                />
            )}

            {renameItem && (
                <RenameModal
                    isOpen={renameModalOpen}
                    onClose={() => setRenameModalOpen(false)}
                    itemId={renameItem.id}
                    currentName={renameItem.currentName}
                    onRenameSuccess={fetchContent}
                />
            )}
        </div>
    );
}
