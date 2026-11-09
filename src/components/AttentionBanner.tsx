import React from 'react';
import { AlertCircle, X, ArrowRight } from 'lucide-react';

interface AttentionBannerProps {
  overdueCount: number;
  onReview: () => void;
  onDismiss: () => void;
}

export const AttentionBanner: React.FC<AttentionBannerProps> = ({
  overdueCount,
  onReview,
  onDismiss,
}) => {
  if (overdueCount <= 0) return null;

  return (
    <div className="bg-gold-50 border-b border-gold-300 px-4 py-2.5 flex items-center justify-between text-xs text-forest-900 shadow-sm animate-fadeIn">
      <div className="flex items-center space-x-2">
        <AlertCircle className="w-4 h-4 text-gold-600 flex-shrink-0" />
        <div>
          <span className="font-semibold text-forest-900">
            {overdueCount === 1
              ? '1 group reached its endpoint'
              : `${overdueCount} groups reached their endpoint`}
          </span>
          <span className="text-ivory-600 hidden sm:inline ml-1">
            — review and assist closure.
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-1.5 ml-2">
        <button
          onClick={onReview}
          className="flex items-center space-x-1 px-2 py-1 bg-gold-500 hover:bg-gold-400 text-forest-900 font-medium rounded text-[11px] transition-colors"
        >
          <span>Review</span>
          <ArrowRight className="w-3 h-3" />
        </button>
        <button
          onClick={onDismiss}
          title="Dismiss notification banner"
          className="p-1 text-ivory-600 hover:text-forest-900 rounded transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

