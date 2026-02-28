"use client";

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { FileIcon, Download, Folder, ChevronRight, AlertCircle, HardDrive, LayoutGrid, List, CheckSquare } from 'lucide-react';
import { FileThumbnail } from '@/components/ui/FileThumbnail';
import { FilePreviewModal, isPreviewable } from '@/components/ui/FilePreviewModal';
import { MediaGallery } from '@/components/ui/MediaGallery';

interface FileRecord {
    id: string;
    name: string;
    size: number;
    type: string;
    created_at: string;
}

interface FolderRecord {
    id: string;
    name: string;
    created_at: string;
}

export default function PublicSharePage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = use(params);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [shareDetails, setShareDetails] = useState<any>(null); // Details of the initially shared item

    const [files, setFiles] = useState<FileRecord[]>([]);
    const [folders, setFolders] = useState<FolderRecord[]>([]);

    // For navigation inside a shared folder
    const [breadcrumbs, setBreadcrumbs] = useState<FolderRecord[]>([]);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

    const [previewFile, setPreviewFile] = useState<FileRecord | null>(null);
    const [showGallery, setShowGallery] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

    useEffect(() => {
        fetchInitialShare();
    }, [token]);

    const fetchInitialShare = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase.rpc('get_public_share_details', {
                p_share_id: token
            });

            if (error || !data) {
                setError("This link is invalid or has expired.");
                setLoading(false);
                return;
            }

            setShareDetails(data);

            if (data.type === 'folder') {
                setBreadcrumbs([data]);
                await fetchFolderContents(data.id);
            } else {
                setFiles([data]);
            }
        } catch (err) {
            console.error('Error fetching share:', err);
            setError("Something went wrong while fetching the shared item.");
        } finally {
            setLoading(false);
        }
    };

    const fetchFolderContents = async (targetFolderId: string) => {
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_public_folder_contents', {
                p_share_id: token,
                p_target_folder_id: targetFolderId
            });

            if (error || !data) {
                setError("Could not load folder contents.");
                return;
            }

            setFolders(data.folders || []);
            setFiles(data.files || []);
            setCurrentFolderId(targetFolderId);
        } catch (err) {
            console.error('Error fetching folder contents:', err);
        } finally {
            setLoading(false);
        }
    };

    const navigateToFolder = (folder: FolderRecord) => {
        setBreadcrumbs([...breadcrumbs, folder]);
        fetchFolderContents(folder.id);
    };

    const navigateToBreadcrumb = (index: number) => {
        const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
        setBreadcrumbs(newBreadcrumbs);
        fetchFolderContents(newBreadcrumbs[index].id);
    };

    const handleDownload = async (fileId: string) => {
        try {
            const res = await fetch(`/api/public/download?fileId=${fileId}&token=${token}`);
            if (!res.ok) throw new Error('Failed to get download URL');

            const { url } = await res.json();
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

    const toggleSelection = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setSelectedFiles(prev =>
            prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]
        );
    };

    const selectAll = () => {
        if (selectedFiles.length === files.length && files.length > 0) {
            setSelectedFiles([]);
        } else {
            setSelectedFiles(files.map(f => f.id));
        }
    };

    const handleBulkDownload = async () => {
        if (selectedFiles.length === 0) return;
        for (const fileId of selectedFiles) {
            await handleDownload(fileId);
            await new Promise(r => setTimeout(r, 300));
        }
        setSelectedFiles([]);
    };

    const formatSize = (bytes: number) => {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    if (loading && !shareDetails) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
                <p className="text-slate-500">Loading shared content...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
                <div className="h-20 w-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6">
                    <AlertCircle className="h-10 w-10 text-red-500" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Link Not Found</h1>
                <p className="text-slate-500 dark:text-slate-400 max-w-md">{error}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center py-8 px-4 md:px-8">
            <header className="w-full max-w-5xl mb-8 flex justify-center">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 relative bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden shrink-0">
                        <img src="/icon.png" alt="Joy Cloud" className="h-full w-full object-cover" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Joy Cloud Shared Content</h1>
                </div>
            </header>

            <main className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
                {/* Header Section */}
                <div className="px-6 py-6 border-b border-gray-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center">
                            {shareDetails?.type === 'folder' ? (
                                <Folder className="h-6 w-6 text-blue-500 mr-3 fill-blue-500/20" />
                            ) : (
                                <FileIcon className="h-6 w-6 text-indigo-500 mr-3 fill-indigo-500/20" />
                            )}
                            {shareDetails?.name}
                        </h2>
                        {shareDetails?.type === 'folder' && files.length > 0 && (
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
                        )}
                    </div>

                    {shareDetails?.type === 'folder' && breadcrumbs.length > 1 && (
                        <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 mt-4 overflow-x-auto pb-2">
                            {breadcrumbs.map((folder, index) => (
                                <div key={folder.id} className="flex items-center whitespace-nowrap">
                                    {index > 0 && <ChevronRight className="h-4 w-4 mx-1.5 shrink-0" />}
                                    <button
                                        onClick={() => navigateToBreadcrumb(index)}
                                        className={`hover:text-blue-600 transition-colors ${index === breadcrumbs.length - 1 ? 'font-semibold text-slate-700 dark:text-slate-300' : ''}`}
                                    >
                                        {folder.name}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Content List */}
                <div className="divide-y divide-gray-100 dark:divide-slate-800 min-h-[300px]">
                    {loading ? (
                        <div className="p-12 flex justify-center">
                            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                        </div>
                    ) : (
                        <>
                            {folders.map((folder) => (
                                <div
                                    key={`folder-${folder.id}`}
                                    onClick={() => navigateToFolder(folder)}
                                    className="flex items-center gap-3 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group"
                                >
                                    <div className="h-10 w-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center border border-blue-100 dark:border-blue-800/50 shrink-0">
                                        <Folder className="h-5 w-5 text-blue-500 fill-blue-500/20" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{folder.name}</p>
                                        <p className="text-xs text-slate-400">Folder</p>
                                    </div>
                                    <div className="text-sm text-slate-500">
                                        {new Date(folder.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}

                            <div className="border-t border-slate-100 dark:border-slate-800"></div>

                            {showGallery && files.length > 0 && (
                                <div className="p-4 border-b border-gray-100 dark:border-slate-800">
                                    <MediaGallery files={files} onPreview={(f) => setPreviewFile(f as FileRecord)} isPublic={true} publicToken={token} />
                                </div>
                            )}

                            {(!showGallery || files.length === 0) && files.map((file) => (
                                <div
                                    key={`file-${file.id}`}
                                    className="flex flex-col sm:flex-row sm:items-center gap-3 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group border-b border-gray-100 dark:border-slate-800 last:border-0"
                                >
                                    <div onClick={(e) => toggleSelection(e, file.id)} className="w-10 flex justify-center cursor-pointer shrink-0 py-2 sm:py-0">
                                        {selectedFiles.includes(file.id) ? (
                                            <CheckSquare className="h-5 w-5 text-blue-600" />
                                        ) : (
                                            <div className="h-5 w-5 rounded border-2 border-slate-300 dark:border-slate-600 group-hover:border-blue-400 transition-colors" />
                                        )}
                                    </div>
                                    <div className="flex items-center min-w-0 flex-1 cursor-pointer" onClick={() => isPreviewable(file.type) ? setPreviewFile(file) : handleDownload(file.id)}>
                                        <div className="mr-4 shrink-0">
                                            <FileThumbnail fileId={file.id} type={file.type} name={file.name} isPublic={true} publicToken={token} />
                                        </div>
                                        <div className="truncate">
                                            <p className="font-medium text-slate-900 dark:text-slate-100 truncate pr-4">{file.name}</p>
                                            <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                                                <span>{formatSize(file.size)}</span>
                                                <span>•</span>
                                                <span className="truncate max-w-[150px]">{file.type}</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex sm:shrink-0 mt-3 sm:mt-0 justify-end items-center border-t border-gray-100 dark:border-slate-800 pt-3 sm:border-0 sm:pt-0">
                                        <Button
                                            onClick={() => handleDownload(file.id)}
                                            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 rounded-lg px-5 py-2 flex items-center justify-center transition-transform hover:-translate-y-0.5"
                                        >
                                            <Download className="h-4 w-4 mr-2" />
                                            <span className="font-medium">Download</span>
                                        </Button>
                                    </div>
                                </div>
                            ))}

                            {folders.length === 0 && files.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                                    <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                        <HardDrive className="h-8 w-8 text-slate-400" />
                                    </div>
                                    <h3 className="text-lg font-medium text-slate-900 dark:text-white">This folder is empty</h3>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>

            {/* Floating Bulk Action Bar */}
            {selectedFiles.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-900 shadow-2xl rounded-full border border-slate-200 dark:border-slate-800 px-6 py-3 flex items-center gap-4 z-50 animate-in slide-in-from-bottom-5">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {selectedFiles.length} item{selectedFiles.length !== 1 ? 's' : ''} selected
                    </span>
                    <div className="h-4 w-px bg-slate-300 dark:bg-slate-700"></div>
                    <button onClick={handleBulkDownload} className="text-sm font-medium text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 flex items-center transition-colors">
                        <Download className="h-4 w-4 mr-2" /> Download
                    </button>
                    <div className="h-4 w-px bg-slate-300 dark:bg-slate-700"></div>
                    <button onClick={selectAll} className="text-sm font-medium text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400">
                        {selectedFiles.length === files.length ? 'Deselect All' : 'Select All'}
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
                isPublic={true}
                publicToken={token}
            />
        </div>
    );
}
