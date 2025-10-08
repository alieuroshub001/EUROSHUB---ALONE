'use client';

import { useState } from 'react';
import {
  Folder,
  FolderOpen,
  File,
  ChevronRight,
  ChevronDown,
  Edit2,
  Trash2,
  Download,
  FileText,
  Image as ImageIcon,
  FileArchive
} from 'lucide-react';

interface FolderNode {
  _id: string;
  name: string;
  parentFolder: string | null;
  cardId: string;
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: Date;
  children?: FolderNode[];
}

interface FileItem {
  _id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  url: string;
  cloudflareKey?: string;
  folderId: string | null;
  uploadedBy: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  createdAt: Date;
  isDeleted: boolean;
}

interface FolderTreeProps {
  folders: FolderNode[];
  currentFolderId: string | null;
  onFolderClick: (folderId: string | null) => void;
  onFolderRename: (folderId: string, newName: string) => Promise<void>;
  onFolderDelete: (folderId: string) => Promise<void>;
  canEdit: boolean;
}

const FolderTree: React.FC<FolderTreeProps> = ({
  folders,
  currentFolderId,
  onFolderClick,
  onFolderRename,
  onFolderDelete,
  canEdit
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: 'folder' | 'file'; id: string } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleContextMenu = (e: React.MouseEvent, type: 'folder' | 'file', id: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, type, id });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const startRename = (id: string, currentName: string) => {
    setRenamingId(id);
    setRenameValue(currentName);
    closeContextMenu();
  };

  const handleRename = async () => {
    if (renamingId && renameValue.trim()) {
      await onFolderRename(renamingId, renameValue.trim());
      setRenamingId(null);
      setRenameValue('');
    }
  };

  const handleDelete = async (type: 'folder' | 'file', id: string) => {
    if (window.confirm(`Are you sure you want to delete this ${type}?`)) {
      if (type === 'folder') {
        await onFolderDelete(id);
      } else {
        await onFileDelete(id);
      }
    }
    closeContextMenu();
  };


  const renderFolder = (folder: FolderNode, level: number = 0) => {
    const isExpanded = expandedFolders.has(folder._id);
    const isSelected = currentFolderId === folder._id;
    const hasChildren = folder.children && folder.children.length > 0;

    return (
      <div key={folder._id}>
        <div
          className={`group flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer transition-all ${
            isSelected ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-500' : ''
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => onFolderClick(folder._id)}
          onContextMenu={(e) => canEdit && handleContextMenu(e, 'folder', folder._id)}
          title="Click to view folder contents"
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(folder._id);
              }}
              className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3 text-gray-600 dark:text-gray-400" />
              ) : (
                <ChevronRight className="w-3 h-3 text-gray-600 dark:text-gray-400" />
              )}
            </button>
          )}

          {!hasChildren && <div className="w-4" />}

          {isExpanded ? (
            <FolderOpen className="w-4 h-4 text-yellow-500" />
          ) : (
            <Folder className="w-4 h-4 text-yellow-500" />
          )}

          {renamingId === folder._id ? (
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') {
                  setRenamingId(null);
                  setRenameValue('');
                }
              }}
              className="flex-1 px-2 py-0.5 text-sm border border-blue-500 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="flex-1 text-sm text-gray-900 dark:text-white truncate">
              {folder.name}
            </span>
          )}

          <ChevronRight className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        </div>

        {isExpanded && hasChildren && (
          <div>
            {folder.children!.map(child => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    );
  };



  return (
    <div className="relative">
      {/* Root level */}
      <div
        className={`group flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer mb-2 transition-all ${
          currentFolderId === null ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-500' : ''
        }`}
        onClick={() => onFolderClick(null)}
        title="View all files in root"
      >
        <Folder className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">
          All Files
        </span>
        <ChevronRight className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      </div>

      {/* Folder tree */}
      <div className="space-y-0.5">
        {folders.map(folder => renderFolder(folder, 0))}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={closeContextMenu}
          />
          <div
            className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[160px]"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            {contextMenu.type === 'folder' && canEdit && (
              <>
                <button
                  onClick={() => {
                    const folder = folders.find(f => f._id === contextMenu.id);
                    if (folder) startRename(contextMenu.id, folder.name);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Edit2 className="w-4 h-4" />
                  Rename
                </button>
                <button
                  onClick={() => handleDelete('folder', contextMenu.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </>
            )}

            {contextMenu.type === 'file' && (
              <>
                <button
                  onClick={() => {
                    onFileDownload(contextMenu.id);
                    closeContextMenu();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                {canEdit && (
                  <button
                    onClick={() => handleDelete('file', contextMenu.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default FolderTree;
