import React, { useState } from 'react';
import {
  Bookmark,
  Folder,
  Plus,
  Search,
  Trash2,
  ExternalLink,
  Check,
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { ExtractedSite, LibraryFolder, SavedLibraryItem } from '../../types';
import { PRESET_SITES } from '../../data/presets';

interface LibraryTabProps {
  savedItems: SavedLibraryItem[];
  folders: LibraryFolder[];
  onSelectSite: (site: ExtractedSite) => void;
  onRemoveItem: (id: string) => void;
  onAddFolder: (name: string) => void;
  currentSiteId: string;
}

export const LibraryTab: React.FC<LibraryTabProps> = ({
  savedItems,
  folders,
  onSelectSite,
  onRemoveItem,
  onAddFolder,
  currentSiteId,
}) => {
  const [activeFolderId, setActiveFolderId] = useState<string>('f-all');
  const [searchQuery, setSearchQuery] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [showAddFolder, setShowAddFolder] = useState(false);

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      onAddFolder(newFolderName.trim());
      setNewFolderName('');
      setShowAddFolder(false);
    }
  };

  const filteredItems = savedItems.filter(item => {
    if (activeFolderId !== 'f-all' && item.folderId !== activeFolderId) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.url.toLowerCase().includes(q) ||
        item.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleOpenSavedSite = (item: SavedLibraryItem) => {
    const found = PRESET_SITES.find(p => p.id === item.siteId);
    if (found) {
      onSelectSite(found);
    }
  };

  return (
    <div className="tool-tab library-tab space-y-6 pb-8">
      {/* Top Banner */}
      <div className="p-3.5 bg-neutral-900/90 border border-neutral-800 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Bookmark className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-neutral-200">
              Design Library & Bookmarks
            </h3>
            <p className="text-[11px] text-neutral-400">
              Save sites, organize into searchable folders, audit side-by-side
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddFolder(!showAddFolder)}
          className="tool-action tool-action-primary"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{showAddFolder ? 'Close folder form' : 'New folder'}</span>
        </button>
      </div>

      {/* New Folder Modal / Inline Form */}
      {showAddFolder && (
        <form
          onSubmit={handleCreateFolder}
          className="p-3 bg-neutral-900 border border-indigo-500/40 rounded-xl flex items-center gap-2"
        >
          <Folder className="w-4 h-4 text-indigo-400 shrink-0" />
          <input
            type="text"
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            placeholder="Folder name (e.g. Fintech, Inspo)..."
            className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500"
            autoFocus
          />
          <button
            type="submit"
            className="h-7 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium"
          >
            Create
          </button>
        </form>
      )}

      {/* Folder Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1">
        {folders.map(folder => (
          <button
            key={folder.id}
            onClick={() => setActiveFolderId(folder.id)}
            className={`px-3 py-1.5 rounded-lg font-medium shrink-0 transition-all flex items-center gap-1.5 ${
              activeFolderId === folder.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
            }`}
          >
            <Folder className="w-3 h-3" />
            <span>{folder.name}</span>
          </button>
        ))}
      </div>

      {/* Search Filter */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search saved sites or tags..."
          className="w-full h-8 pl-8 pr-3 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Saved Sites List */}
      {filteredItems.length === 0 ? (
        <div className="p-8 text-center bg-neutral-900/40 border border-neutral-800 rounded-xl space-y-2">
          <p className="text-xs text-neutral-400">No saved sites found in this folder.</p>
          <p className="text-[11px] text-neutral-500">
            Click "Save" in the top bar to bookmark any extracted website into your library.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map(item => {
            const isCurrentlyActive = currentSiteId === item.siteId;
            return (
              <div
                key={item.id}
                className={`p-3.5 rounded-xl border transition-all flex flex-wrap items-center justify-between gap-3 ${
                  isCurrentlyActive
                    ? 'bg-indigo-950/20 border-indigo-500/50'
                    : 'bg-neutral-900/80 hover:bg-neutral-900 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-4 h-4 rounded-full ring-2 ring-white/20 shrink-0"
                    style={{ backgroundColor: item.themeColor }}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-white">{item.name}</h4>
                      {isCurrentlyActive && (
                        <span className="text-[9px] uppercase font-semibold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          Active
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-neutral-400 font-mono">{item.url}</span>

                    {/* Tag list */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {item.tags.map(tag => (
                        <span
                          key={tag}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-950 text-neutral-400 border border-neutral-800"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenSavedSite(item)}
                    className="h-7 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <span>Inspect</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>

                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="p-1.5 text-neutral-500 hover:text-rose-400 transition-colors"
                    title="Delete from library"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
