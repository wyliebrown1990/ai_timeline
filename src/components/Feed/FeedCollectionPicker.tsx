/**
 * FeedCollectionPicker Component (Sprint Feed-5)
 *
 * Slide-up picker for adding items to collections.
 * Shows checkboxes for each collection and option to create new.
 */

import { memo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Check, Folder, FolderOpen } from 'lucide-react';
import type { Collection } from '../../hooks/useCollections';
import { useCollections } from '../../hooks/useCollections';

interface FeedCollectionPickerProps {
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

function FeedCollectionPickerComponent({
  eventId,
  isOpen,
  onClose,
  onSaved,
}: FeedCollectionPickerProps) {
  const {
    collections,
    isLoading,
    createCollection,
    addToCollection,
    removeFromCollection,
    isInCollection,
  } = useCollections();

  const [isCreating, setIsCreating] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [pendingChanges, setPendingChanges] = useState<Map<string, boolean>>(
    new Map()
  );

  // Get effective state (pending changes override actual state)
  const getEffectiveState = useCallback(
    (collectionId: string): boolean => {
      if (pendingChanges.has(collectionId)) {
        return pendingChanges.get(collectionId)!;
      }
      return isInCollection(collectionId, eventId);
    },
    [pendingChanges, isInCollection, eventId]
  );

  // Toggle collection membership
  const handleToggle = useCallback(
    async (collection: Collection) => {
      const currentState = getEffectiveState(collection.id);
      const newState = !currentState;

      // Set pending state
      setPendingChanges((prev) => new Map(prev).set(collection.id, newState));

      try {
        if (newState) {
          await addToCollection(collection.id, eventId);
        } else {
          await removeFromCollection(collection.id, eventId);
        }
        onSaved?.();
      } catch {
        // Revert on error
        setPendingChanges((prev) => {
          const next = new Map(prev);
          next.delete(collection.id);
          return next;
        });
      }
    },
    [getEffectiveState, addToCollection, removeFromCollection, eventId, onSaved]
  );

  // Create new collection
  const handleCreateCollection = useCallback(async () => {
    if (!newCollectionName.trim()) return;

    const collection = await createCollection(newCollectionName.trim());
    if (collection) {
      // Auto-add current item to new collection
      await addToCollection(collection.id, eventId);
      setNewCollectionName('');
      setIsCreating(false);
      onSaved?.();
    }
  }, [newCollectionName, createCollection, addToCollection, eventId, onSaved]);

  const handleClose = useCallback(() => {
    setPendingChanges(new Map());
    setIsCreating(false);
    setNewCollectionName('');
    onClose();
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Picker */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 rounded-t-2xl max-h-[60vh] overflow-hidden flex flex-col"
            style={{
              paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
            }}
          >
            {/* Drag Handle */}
            <div className="flex justify-center py-3">
              <div className="w-10 h-1 bg-gray-700 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-4">
              <h2 className="text-lg font-semibold text-white">
                Save to Collection
              </h2>
              <button
                onClick={handleClose}
                className="p-2 rounded-full hover:bg-gray-800 text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Collections List */}
            <div className="flex-1 overflow-y-auto px-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-2">
                  {collections.map((collection) => {
                    const isChecked = getEffectiveState(collection.id);

                    return (
                      <button
                        key={collection.id}
                        onClick={() => handleToggle(collection)}
                        className={`
                          w-full flex items-center gap-3 p-3 rounded-xl transition-colors
                          ${isChecked ? 'bg-emerald-600/20' : 'bg-gray-800/50 hover:bg-gray-800'}
                        `}
                      >
                        {/* Checkbox */}
                        <div
                          className={`
                            w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors
                            ${
                              isChecked
                                ? 'bg-emerald-500 border-emerald-500'
                                : 'border-gray-600'
                            }
                          `}
                        >
                          {isChecked && <Check className="w-4 h-4 text-white" />}
                        </div>

                        {/* Icon */}
                        {isChecked ? (
                          <FolderOpen className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <Folder className="w-5 h-5 text-gray-400" />
                        )}

                        {/* Name */}
                        <span
                          className={`flex-1 text-left ${
                            isChecked ? 'text-white' : 'text-gray-300'
                          }`}
                        >
                          {collection.name}
                          {collection.isDefault && (
                            <span className="ml-2 text-xs text-gray-500">
                              (Default)
                            </span>
                          )}
                        </span>

                        {/* Item count */}
                        <span className="text-sm text-gray-500">
                          {collection.items.length}
                        </span>
                      </button>
                    );
                  })}

                  {collections.length === 0 && !isLoading && (
                    <p className="text-center text-gray-500 py-4">
                      No collections yet. Create one below!
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Create New Collection */}
            <div className="px-4 pt-4 border-t border-gray-800">
              {isCreating ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    placeholder="Collection name..."
                    maxLength={50}
                    autoFocus
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateCollection();
                      if (e.key === 'Escape') setIsCreating(false);
                    }}
                  />
                  <button
                    onClick={handleCreateCollection}
                    disabled={!newCollectionName.trim()}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      setNewCollectionName('');
                    }}
                    className="px-3 py-2 text-gray-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsCreating(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span className="font-medium">New Collection</span>
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export const FeedCollectionPicker = memo(FeedCollectionPickerComponent);

export default FeedCollectionPicker;
