import React, { useState, useEffect, useMemo } from 'react';
import { VilayaStorage, GroupEntity } from '../core/types';
import { getStorage, subscribeToStorageChanges, deleteGroup, reopenGroup, updateMeta } from '../core/storage';
import { getGroupStatus } from '../core/status';
import { Header } from '../components/Header';
import { AttentionBanner } from '../components/AttentionBanner';
import { GroupCard } from '../components/GroupCard';
import { AddGroupModal } from '../components/AddGroupModal';
import { ClosureGuideModal } from '../components/ClosureGuideModal';
import { ExtendModal } from '../components/ExtendModal';
import { BackupModal } from '../components/BackupModal';
import { Search, Clock, CheckCircle, ShieldAlert } from 'lucide-react';

export const PopupApp: React.FC = () => {
  const [storage, setStorage] = useState<VilayaStorage | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'ATTENTION' | 'CLOSED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [selectedClosureGroup, setSelectedClosureGroup] = useState<GroupEntity | null>(null);
  const [selectedExtendGroup, setSelectedExtendGroup] = useState<GroupEntity | null>(null);

  const [dismissedCatchUp, setDismissedCatchUp] = useState(false);

  const loadData = async () => {
    try {
      const data = await getStorage();
      setStorage(data);
    } catch (err) {
      console.error('Failed to load storage:', err);
    }
  };

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToStorageChanges((updated) => {
      setStorage(updated);
    });
    return () => unsubscribe();
  }, []);

  const now = Date.now();
  const allGroups = useMemo(() => {
    if (!storage) return [];
    return Object.values(storage.groups);
  }, [storage]);

  // Compute overdue count for Attention Banner
  const overdueGroups = useMemo(() => {
    return allGroups.filter((g) => {
      const s = getGroupStatus(g, now);
      return s === 'EXPIRED' || s === 'GRACE_PERIOD';
    });
  }, [allGroups, now]);

  // Filter & Search
  const filteredGroups = useMemo(() => {
    return allGroups.filter((g) => {
      const status = getGroupStatus(g, now);

      // Search matching
      const matchesSearch =
        g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (g.purpose && g.purpose.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      // Status tab matching
      if (filter === 'ACTIVE') {
        return status === 'ACTIVE' || status === 'PERMANENT';
      }
      if (filter === 'ATTENTION') {
        return status === 'EXPIRING_SOON' || status === 'GRACE_PERIOD' || status === 'EXPIRED';
      }
      if (filter === 'CLOSED') {
        return status === 'CLOSED';
      }
      return true; // ALL
    });
  }, [allGroups, filter, searchQuery, now]);

  const handleOpenSidePanel = () => {
    if (typeof chrome !== 'undefined' && chrome.sidePanel && chrome.windows) {
      chrome.windows.getCurrent((win) => {
        if (win?.id) {
          chrome.sidePanel.open({ windowId: win.id }).catch(() => {});
        }
      });
    }
  };

  const handleDeleteGroup = async (group: GroupEntity) => {
    if (confirm(`Delete record for "${group.name}" from VILAYA?`)) {
      await deleteGroup(group.id);
      loadData();
    }
  };

  const handleReopenGroup = async (group: GroupEntity) => {
    await reopenGroup(group.id, Date.now());
    loadData();
  };

  const handleDismissBanner = async () => {
    setDismissedCatchUp(true);
    await updateMeta({ catchUpDismissedAt: Date.now() });
  };

  if (!storage) {
    return (
      <div className="w-[380px] h-[520px] flex items-center justify-center bg-ivory-50 text-forest-800 text-xs">
        Loading VILAYA...
      </div>
    );
  }

  return (
    <div className="w-[380px] h-[560px] flex flex-col bg-ivory-50 overflow-hidden font-sans">
      <Header
        onAddGroup={() => setIsAddOpen(true)}
        onOpenSidePanel={handleOpenSidePanel}
        onOpenBackup={() => setIsBackupOpen(true)}
      />

      {/* Durable Attention Banner */}
      {!dismissedCatchUp && overdueGroups.length > 0 && (
        <AttentionBanner
          overdueCount={overdueGroups.length}
          onReview={() => setFilter('ATTENTION')}
          onDismiss={handleDismissBanner}
        />
      )}

      {/* Search & Filter Bar */}
      <div className="p-3 border-b border-ivory-200 bg-white/70 space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-ivory-600 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search temporary groups..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-ivory-100/60 border border-ivory-200 rounded-lg focus:outline-none focus:border-forest-600 text-forest-900 placeholder:text-ivory-600"
          />
        </div>

        <div className="flex items-center space-x-1 text-xs">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              filter === 'ALL'
                ? 'bg-forest-800 text-white'
                : 'text-ivory-700 hover:bg-ivory-100'
            }`}
          >
            All ({allGroups.length})
          </button>
          <button
            onClick={() => setFilter('ACTIVE')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              filter === 'ACTIVE'
                ? 'bg-forest-800 text-white'
                : 'text-ivory-700 hover:bg-ivory-100'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter('ATTENTION')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center space-x-1 ${
              filter === 'ATTENTION'
                ? 'bg-forest-800 text-white'
                : 'text-ivory-700 hover:bg-ivory-100'
            }`}
          >
            <span>Expiring</span>
            {overdueGroups.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-gold-500 text-forest-900 text-[10px] font-bold flex items-center justify-center">
                {overdueGroups.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilter('CLOSED')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              filter === 'CLOSED'
                ? 'bg-forest-800 text-white'
                : 'text-ivory-700 hover:bg-ivory-100'
            }`}
          >
            Closed
          </button>
        </div>
      </div>

      {/* Group List Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {filteredGroups.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
            <div className="w-12 h-12 rounded-full bg-forest-100/50 flex items-center justify-center text-forest-700">
              <Clock className="w-6 h-6" />
            </div>
            <h4 className="font-semibold text-xs text-forest-900">
              {searchQuery ? 'No matching groups found' : 'No groups in this view'}
            </h4>
            <p className="text-[11px] text-ivory-600 max-w-[220px]">
              {searchQuery
                ? 'Try a different search keyword.'
                : 'Every temporary group has a purpose. Tap "+ New Group" to begin tracking.'}
            </p>
          </div>
        ) : (
          filteredGroups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              onInitiateClosure={(g) => setSelectedClosureGroup(g)}
              onExtend={(g) => setSelectedExtendGroup(g)}
              onReopen={(g) => handleReopenGroup(g)}
              onDelete={(g) => handleDeleteGroup(g)}
            />
          ))
        )}
      </div>

      {/* Modals */}
      <AddGroupModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onGroupAdded={loadData}
        settings={storage.settings}
      />

      <ClosureGuideModal
        group={selectedClosureGroup}
        isOpen={!!selectedClosureGroup}
        onClose={() => setSelectedClosureGroup(null)}
        onClosedConfirmed={loadData}
      />

      <ExtendModal
        group={selectedExtendGroup}
        isOpen={!!selectedExtendGroup}
        onClose={() => setSelectedExtendGroup(null)}
        onExtended={loadData}
      />

      <BackupModal
        storage={storage}
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        onSettingsUpdated={loadData}
      />
    </div>
  );
};

