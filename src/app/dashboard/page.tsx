"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Upload, FileText, Image as ImageIcon, Film, File as FileIcon, Download, Trash2, LogOut, Search, Clock, HardDrive, Folder, FolderPlus, ChevronRight, ArrowLeft, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { FileThumbnail } from '@/components/ui/FileThumbnail';

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
    const [loading, setLoading] = useState(true);
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
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            await processUpload(e.dataTransfer.files[0]);
        }
    };

    const processUpload = async (file: File) => {
        try {
            setUploading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

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
                    folderPath: getCurrentPath()
                }),
            });

            if (!res.ok) throw new Error('Failed to get upload URL');
            const { url, key } = await res.json();

            const uploadRes = await fetch(url, {
                method: 'PUT',
                body: file,
                headers: { 'Content-Type': file.type },
            });

            if (!uploadRes.ok) throw new Error('Upload to S3 failed');

            const { error } = await supabase.from('files').insert({
                name: file.name,
                size: file.size,
                type: file.type,
                s3_key: key,
                user_id: session.user.id,
                folder_id: currentFolder ? currentFolder.id : null
            });

            if (error) throw error;
            fetchContent();
        } catch (error) {
            console.error(error);
            alert('Upload failed!');
        } finally {
            setUploading(false);
        }
    };

    const handleUploadInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        await processUpload(e.target.files[0]);
    };

    const handleDownload = async (fileId: string) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        try {
            const res = await fetch(`/api/download?fileId=${fileId}`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` },
            });
            const { url } = await res.json();
            if (url) window.open(url, '_blank');
        } catch (error) {
            console.error(error);
            alert('Download failed');
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
                if (data?.role === 'admin') setIsAdmin(true);
            }
        };
        checkRole();
    }, []);

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
            <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 h-16 px-6 flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center space-x-3 cursor-pointer" onClick={() => router.push('/')}>
                    <div className="h-8 w-8 relative bg-white rounded-lg shadow-sm overflow-hidden">
                        <img src="/icon.png" alt="Joy Cloud" className="h-full w-full object-cover" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Joy Cloud</h1>
                </div>

                <div className="flex-1 max-w-xl mx-8">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search files..."
                            className="w-full h-10 pl-10 pr-4 rounded-lg bg-slate-100 dark:bg-slate-800 border-transparent focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 transition-all outline-none text-sm"
                        />
                    </div>
                </div>

                <Button variant="ghost" size="sm" onClick={handleSync} loading={syncing} className="mr-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10">
                    <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                    Sync
                </Button>
                {isAdmin && (
                    <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/recycle-bin')} className="mr-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Recycle Bin
                    </Button>
                )}
                <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                </Button>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full">
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
                    <div className="flex items-center space-x-3">
                        <Button variant="ghost" onClick={handleCreateFolder} className="text-slate-600 dark:text-slate-300">
                            <FolderPlus className="h-4 w-4 mr-2" />
                            New Folder
                        </Button>
                        <div className="relative">
                            <input
                                type="file"
                                onChange={handleUploadInput}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                disabled={uploading}
                                title="Upload file"
                            />
                            <Button loading={uploading} className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20">
                                <Upload className="h-4 w-4 mr-2" />
                                Upload File
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[400px]">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        <div className="col-span-6">Name</div>
                        <div className="col-span-2">Size</div>
                        <div className="col-span-3">Date Added</div>
                        <div className="col-span-1 text-right">Actions</div>
                    </div>

                    {/* Loading */}
                    {loading && (
                        <div className="p-12 flex justify-center">
                            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                        </div>
                    )}

                    {/* Empty State */}
                    {!loading && files.length === 0 && folders.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="h-20 w-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                <Folder className="h-10 w-10 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900 dark:text-white">This folder is empty</h3>
                            <p className="text-slate-500 max-w-sm mt-2">Upload files or create a subfolder to get started.</p>
                        </div>
                    )}

                    {/* Unified List Rows */}
                    <div className="divide-y divide-gray-100 dark:divide-slate-800">
                        {/* Render Folders First */}
                        {folders.map((folder) => (
                            <div
                                key={`folder-${folder.id}`}
                                onClick={() => navigateToFolder(folder)}
                                className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                            >
                                <div className="col-span-6 flex items-center min-w-0">
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
                                <div className="col-span-2 text-sm text-slate-400">
                                    -
                                </div>
                                <div className="col-span-3 text-sm text-slate-600 dark:text-slate-400 flex items-center">
                                    <Clock className="h-3 w-3 mr-1.5 opacity-70" />
                                    {new Date(folder.created_at).toLocaleDateString()}
                                </div>
                                <div className="col-span-1 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(folder.id, 'folder');
                                        }}
                                        className="h-8 w-8 p-0"
                                        title="Delete"
                                    >
                                        <Trash2 className="h-4 w-4 text-slate-500 hover:text-red-600" />
                                    </Button>
                                </div>
                            </div>
                        ))}

                        {/* Render Files */}
                        {files.map((file) => (
                            <div key={`file-${file.id}`} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                <div className="col-span-6 flex items-center min-w-0">
                                    <div className="mr-3 shrink-0">
                                        <FileThumbnail fileId={file.id} type={file.type} name={file.name} />
                                    </div>
                                    <div className="truncate">
                                        <p className="font-medium text-slate-900 dark:text-slate-100 truncate" title={file.name}>{file.name}</p>
                                        <p className="text-xs text-slate-400 truncate">{file.type}</p>
                                    </div>
                                </div>
                                <div className="col-span-2 text-sm text-slate-600 dark:text-slate-400">
                                    {formatSize(file.size)}
                                </div>
                                <div className="col-span-3 text-sm text-slate-600 dark:text-slate-400 flex items-center">
                                    <Clock className="h-3 w-3 mr-1.5 opacity-70" />
                                    {new Date(file.created_at).toLocaleDateString()}
                                </div>
                                <div className="col-span-1 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDownload(file.id);
                                        }}
                                        className="h-8 w-8 p-0"
                                        title="Download"
                                    >
                                        <Download className="h-4 w-4 text-slate-500 hover:text-blue-600" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(file.id, 'file');
                                        }}
                                        className="h-8 w-8 p-0 ml-1"
                                        title="Delete"
                                    >
                                        <Trash2 className="h-4 w-4 text-slate-500 hover:text-red-600" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
