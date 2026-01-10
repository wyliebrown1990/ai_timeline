/**
 * MergeKeyFiguresPage
 * Sprint 46 - Phase 6: Merge Tool
 *
 * Allows admins to merge multiple key figures into a single record.
 * - Select primary (canonical) record to keep
 * - Preview merged result (combined aliases)
 * - Confirm and execute merge
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  GitMerge,
  Loader2,
  Users,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  keyFiguresApi,
  type KeyFigure,
  type KeyFigureRole,
} from '../../services/api';

// Role labels for display
const ROLE_LABELS: Record<KeyFigureRole, string> = {
  researcher: 'Researcher',
  executive: 'Executive',
  founder: 'Founder',
  policy_maker: 'Policy Maker',
  engineer: 'Engineer',
  other: 'Other',
};

const ROLE_COLORS: Record<KeyFigureRole, string> = {
  researcher: 'bg-blue-100 text-blue-800',
  executive: 'bg-purple-100 text-purple-800',
  founder: 'bg-green-100 text-green-800',
  policy_maker: 'bg-amber-100 text-amber-800',
  engineer: 'bg-cyan-100 text-cyan-800',
  other: 'bg-gray-100 text-gray-800',
};

/**
 * Figure card component for selection
 */
function FigureCard({
  figure,
  isPrimary,
  onSelectPrimary,
}: {
  figure: KeyFigure;
  isPrimary: boolean;
  onSelectPrimary: () => void;
}) {
  return (
    <div
      className={`rounded-lg border-2 p-4 transition-all cursor-pointer ${
        isPrimary
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 hover:border-gray-300 bg-white'
      }`}
      onClick={onSelectPrimary}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        {figure.imageUrl ? (
          <img
            src={figure.imageUrl}
            alt={figure.canonicalName}
            className="h-12 w-12 rounded-full object-cover bg-gray-100"
          />
        ) : (
          <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
            <span className="text-gray-500 text-sm font-medium">
              {figure.canonicalName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)}
            </span>
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 truncate">
              {figure.canonicalName}
            </h3>
            {isPrimary && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-600 text-white">
                <Check className="h-3 w-3 mr-1" />
                Primary
              </span>
            )}
          </div>

          {figure.primaryOrg && (
            <p className="text-sm text-gray-600 truncate">{figure.primaryOrg}</p>
          )}

          <div className="flex items-center gap-2 mt-1">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                ROLE_COLORS[figure.role]
              }`}
            >
              {ROLE_LABELS[figure.role]}
            </span>
          </div>

          {/* Aliases */}
          {figure.aliases.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-gray-500 mb-1">Aliases:</p>
              <div className="flex flex-wrap gap-1">
                {figure.aliases.slice(0, 5).map((alias, i) => (
                  <span
                    key={i}
                    className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded"
                  >
                    {alias}
                  </span>
                ))}
                {figure.aliases.length > 5 && (
                  <span className="text-xs text-gray-500">
                    +{figure.aliases.length - 5} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Selection indicator */}
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
            isPrimary
              ? 'border-blue-500 bg-blue-500'
              : 'border-gray-300'
          }`}
        >
          {isPrimary && <Check className="h-3 w-3 text-white" />}
        </div>
      </div>

      <p className="mt-3 text-sm text-gray-600 line-clamp-2">{figure.shortBio}</p>
    </div>
  );
}

/**
 * Merge preview component
 */
function MergePreview({
  primary,
  secondaries,
}: {
  primary: KeyFigure;
  secondaries: KeyFigure[];
}) {
  // Compute combined aliases
  const allAliases = new Set<string>(primary.aliases);

  for (const secondary of secondaries) {
    // Add secondary's canonical name as alias
    if (secondary.canonicalName.toLowerCase() !== primary.canonicalName.toLowerCase()) {
      allAliases.add(secondary.canonicalName);
    }
    // Add secondary's aliases
    for (const alias of secondary.aliases) {
      allAliases.add(alias);
    }
  }

  const combinedAliases = Array.from(allAliases);
  const newAliasCount = combinedAliases.length - primary.aliases.length;

  return (
    <div className="bg-green-50 rounded-lg border border-green-200 p-4">
      <h3 className="font-semibold text-green-900 flex items-center gap-2 mb-3">
        <GitMerge className="h-5 w-5" />
        Merge Preview
      </h3>

      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium text-green-800">Resulting Record:</p>
          <p className="text-lg font-semibold text-green-900">{primary.canonicalName}</p>
        </div>

        <div>
          <p className="text-sm font-medium text-green-800">
            Combined Aliases ({combinedAliases.length} total, +{newAliasCount} new):
          </p>
          <div className="flex flex-wrap gap-1 mt-1">
            {combinedAliases.map((alias, i) => {
              const isNew = !primary.aliases.includes(alias);
              return (
                <span
                  key={i}
                  className={`inline-block px-2 py-0.5 text-xs rounded ${
                    isNew
                      ? 'bg-green-200 text-green-800 font-medium'
                      : 'bg-green-100 text-green-700'
                  }`}
                >
                  {alias}
                  {isNew && ' (new)'}
                </span>
              );
            })}
          </div>
        </div>

        <div className="text-sm text-green-700">
          <p className="flex items-center gap-2">
            <ArrowRight className="h-4 w-4" />
            {secondaries.length} figure(s) will be deleted
          </p>
          <p className="flex items-center gap-2">
            <ArrowRight className="h-4 w-4" />
            Milestone links will be transferred to primary
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Main merge page component
 */
export function MergeKeyFiguresPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Get figure IDs from URL
  const idsParam = searchParams.get('ids');
  const figureIds = idsParam ? idsParam.split(',').filter(Boolean) : [];

  const [figures, setFigures] = useState<KeyFigure[]>([]);
  const [primaryId, setPrimaryId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMerging, setIsMerging] = useState(false);

  // Load figures
  const loadFigures = useCallback(async () => {
    if (figureIds.length < 2) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Fetch each figure
      const figurePromises = figureIds.map((id) => keyFiguresApi.getById(id));
      const loadedFigures = await Promise.all(figurePromises);
      setFigures(loadedFigures);

      // Default primary to first figure
      const firstFigure = loadedFigures[0];
      if (loadedFigures.length > 0 && !primaryId && firstFigure) {
        setPrimaryId(firstFigure.id);
      }
    } catch (error) {
      toast.error('Failed to load key figures');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [figureIds.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadFigures();
  }, [loadFigures]);

  // Compute primary and secondaries
  const primary = figures.find((f) => f.id === primaryId);
  const secondaries = figures.filter((f) => f.id !== primaryId);

  // Handle merge
  const handleMerge = async () => {
    if (!primaryId || secondaries.length === 0) return;

    setIsMerging(true);
    try {
      const result = await keyFiguresApi.merge(
        primaryId,
        secondaries.map((f) => f.id)
      );

      toast.success(
        `Merged ${result.stats.figuresDeleted} figure(s) into ${result.mergedFigure.canonicalName}`
      );

      // Navigate back to key figures list
      navigate('/admin/key-figures');
    } catch (error) {
      toast.error('Failed to merge key figures');
      console.error(error);
    } finally {
      setIsMerging(false);
    }
  };

  // Invalid state: not enough figures
  if (!isLoading && figureIds.length < 2) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/key-figures')}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Merge Key Figures</h1>
        </div>

        <div className="bg-amber-50 rounded-xl border border-amber-200 p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-amber-900 mb-2">
            Select Figures to Merge
          </h3>
          <p className="text-amber-700 mb-4">
            You need to select at least 2 key figures to merge. Go to the Key Figures
            list, select the figures you want to merge using checkboxes, and click
            "Merge Selected".
          </p>
          <button
            onClick={() => navigate('/admin/key-figures')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-700 border border-amber-300 rounded-lg hover:bg-amber-100 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Key Figures
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/admin/key-figures')}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Merge Key Figures</h1>
          <p className="text-sm text-gray-500 mt-1">
            Select the primary record and merge {figures.length} figures
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading figures...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Figure selection */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-400" />
                Select Primary Record
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Click a figure to make it the primary record. All others will be merged
                into it.
              </p>

              <div className="space-y-3">
                {figures.map((figure) => (
                  <FigureCard
                    key={figure.id}
                    figure={figure}
                    isPrimary={figure.id === primaryId}
                    onSelectPrimary={() => setPrimaryId(figure.id)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right: Preview and confirm */}
          <div className="space-y-4">
            {/* Preview */}
            {primary && secondaries.length > 0 && (
              <MergePreview primary={primary} secondaries={secondaries} />
            )}

            {/* Warning */}
            <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">This action cannot be undone</p>
                  <p>
                    The secondary figures will be permanently deleted. Their aliases
                    and milestone links will be transferred to the primary record.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/admin/key-figures')}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleMerge}
                disabled={!primary || secondaries.length === 0 || isMerging}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isMerging ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Merging...
                  </>
                ) : (
                  <>
                    <GitMerge className="h-4 w-4" />
                    Merge Figures
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MergeKeyFiguresPage;
