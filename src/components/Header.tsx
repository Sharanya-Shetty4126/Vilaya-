import React from 'react';
import { Plus, PanelRight, Shield, Download } from 'lucide-react';

interface HeaderProps {
  onAddGroup: () => void;
  onOpenSidePanel?: () => void;
  onOpenBackup: () => void;
  showSidePanelButton?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onAddGroup,
  onOpenSidePanel,
  onOpenBackup,
  showSidePanelButton = true,
}) => {
  return (
    <header className="border-b border-ivory-200 bg-forest-800 text-ivory-50 px-4 py-3 shadow-luxury sticky top-0 z-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-forest-700 border border-gold-400 flex items-center justify-center text-gold-300 font-serif font-bold text-sm shadow-inner">
            वि
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h1 className="font-serif font-semibold tracking-wide text-base text-ivory-50">
                VILAYA
              </h1>
              <span className="text-gold-400 font-serif text-xs font-normal">
                (विलयः)
              </span>
            </div>
            <p className="text-[11px] text-ivory-200 font-light tracking-wide -mt-0.5">
              Temporary WhatsApp Groups Companion
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={onOpenBackup}
            title="Settings & Backup"
            className="p-1.5 text-ivory-200 hover:text-gold-300 hover:bg-forest-700 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>

          {showSidePanelButton && onOpenSidePanel && (
            <button
              onClick={onOpenSidePanel}
              title="Open Side Panel Companion"
              className="p-1.5 text-ivory-200 hover:text-gold-300 hover:bg-forest-700 rounded-lg transition-colors"
            >
              <PanelRight className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onAddGroup}
            className="flex items-center space-x-1 px-2.5 py-1.5 bg-gold-500 hover:bg-gold-400 text-forest-900 font-medium text-xs rounded-lg shadow-sm transition-all transform active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Group</span>
          </button>
        </div>
      </div>
    </header>
  );
};

