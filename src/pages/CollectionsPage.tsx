/**
 * CollectionsPage Component (Sprint Feed-5)
 *
 * Page for viewing and managing saved collections.
 * Shows grid of collections at /collections and single collection at /collections/:id
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  Folder,
  FolderOpen,
  Trash2,
  Edit3,
  Check,
  X,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { useCollections, Collection } from '../hooks/useCollections';
import type { FeedItem } from '../types/feed';

const API_URL = import.meta.env.VITE_DYNAMIC_API_URL || '/api';

interface CollectionItemWithData {
  eventId: string;
  event?: FeedItem;
}

export function CollectionsPage() {
  const { id } = useParams<{ id: string }>();

  // If id is present, show single collection view
  if (id) {
    return <SingleCollectionView collectionId={id} />;
  }

  return <CollectionsGridView />;
}

/**
 * Grid view showing all collections
 */
function CollectionsGridView() {
  const navigate = useNavigate();
  const {
    collections,
    isLoading,
    createCollection,
    deleteCollection,
  } = useCollections();

  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'My Collections | AI Timeline';
    return () => {
      document.title = 'AI Timeline';
    };
  }, []);

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) return;
    const collection = await createCollection(newName.trim());
    if (collection) {
      setNewName('');
      setIsCreating(false);
    }
  }, [newName, createCollection]);

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteCollection(id);
      setDeletingId(null);
    },
    [deleteCollection]
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gray-950/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/feed"
              className="p-2 rounded-full hover:bg-gray-800 text-gray-400"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-semibold text-white">My Collections</h1>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-500 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
          </div>
        ) : collections.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-400 mb-2">
              No collections yet
            </h2>
            <p className="text-gray-500 mb-6">
              Save news items to collections to read later
            </p>
            <button
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-500 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Your First Collection
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {collections.map((collection) => (
              <CollectionCard
                key={collection.id}
                collection={collection}
                onClick={() => navigate(`/collections/${collection.id}`)}
                onDelete={() => setDeletingId(collection.id)}
                formatDate={formatDate}
              />
            ))}

            {/* New Collection Card */}
            <button
              onClick={() => setIsCreating(true)}
              className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed border-gray-700 hover:border-emerald-500 hover:bg-gray-900/50 transition-colors min-h-[180px]"
            >
              <Plus className="w-8 h-8 text-gray-500" />
              <span className="text-gray-500 font-medium">New Collection</span>
            </button>
          </div>
        )}
      </main>

      {/* Create Modal */}
      <AnimatePresence>
        {isCreating && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreating(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md p-6 bg-gray-900 rounded-xl shadow-xl"
            >
              <h2 className="text-lg font-semibold text-white mb-4">
                Create New Collection
              </h2>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Collection name..."
                maxLength={50}
                autoFocus
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') setIsCreating(false);
                }}
              />
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setNewName('');
                  }}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim()}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Create
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingId && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingId(null)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm p-6 bg-gray-900 rounded-xl shadow-xl"
            >
              <h2 className="text-lg font-semibold text-white mb-2">
                Delete Collection?
              </h2>
              <p className="text-gray-400 mb-4">
                This will remove all saved items from this collection. This
                action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeletingId(null)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deletingId)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-500 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Collection card in the grid
 */
function CollectionCard({
  collection,
  onClick,
  onDelete,
  formatDate,
}: {
  collection: Collection;
  onClick: () => void;
  onDelete: () => void;
  formatDate: (date: string) => string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="relative group"
    >
      <button
        onClick={onClick}
        className="w-full text-left p-4 bg-gray-900/50 rounded-xl border border-gray-800 hover:border-gray-700 transition-colors"
      >
        {/* Thumbnail placeholder - in future could show collage of saved items */}
        <div className="aspect-video rounded-lg bg-gray-800/50 flex items-center justify-center mb-3">
          {collection.items.length > 0 ? (
            <div className="grid grid-cols-2 gap-1 w-full h-full p-2">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`rounded bg-gray-700/50 ${
                    i >= collection.items.length ? 'opacity-30' : ''
                  }`}
                />
              ))}
            </div>
          ) : (
            <Folder className="w-12 h-12 text-gray-700" />
          )}
        </div>

        {/* Info */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-medium text-white truncate">
              {collection.name}
              {collection.isDefault && (
                <span className="ml-2 text-xs text-gray-500">(Default)</span>
              )}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
              <span>
                {collection.items.length}{' '}
                {collection.items.length === 1 ? 'item' : 'items'}
              </span>
              <span>•</span>
              <span>{formatDate(collection.updatedAt)}</span>
            </div>
          </div>
        </div>
      </button>

      {/* Delete button (not for default) */}
      {!collection.isDefault && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute top-3 right-3 p-2 rounded-full bg-gray-800/80 text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
}

/**
 * Single collection view showing saved items
 */
function SingleCollectionView({ collectionId }: { collectionId: string }) {
  const navigate = useNavigate();
  const {
    collections,
    isLoading: collectionsLoading,
    updateCollection,
    deleteCollection,
    removeFromCollection,
  } = useCollections();

  const [items, setItems] = useState<CollectionItemWithData[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const collection = collections.find((c) => c.id === collectionId);

  // Fetch event data for collection items
  useEffect(() => {
    if (!collection) return;

    const fetchItems = async () => {
      setIsLoadingItems(true);
      try {
        const eventPromises = collection.items.map(async (eventId) => {
          try {
            const response = await fetch(`${API_URL}/news/${eventId}`);
            if (response.ok) {
              const data = await response.json();
              return { eventId, event: data.event };
            }
          } catch {
            // Item might have been deleted
          }
          return { eventId, event: undefined };
        });

        const results = await Promise.all(eventPromises);
        setItems(results.filter((item) => item.event));
      } catch (err) {
        console.error('Error fetching collection items:', err);
      } finally {
        setIsLoadingItems(false);
      }
    };

    fetchItems();
  }, [collection]);

  useEffect(() => {
    if (collection) {
      document.title = `${collection.name} | Collections`;
      setEditName(collection.name);
    }
    return () => {
      document.title = 'AI Timeline';
    };
  }, [collection]);

  const handleSaveName = useCallback(async () => {
    if (!editName.trim() || !collection) return;
    await updateCollection(collection.id, { name: editName.trim() });
    setIsEditing(false);
  }, [editName, collection, updateCollection]);

  const handleDeleteCollection = useCallback(async () => {
    if (!collection) return;
    await deleteCollection(collection.id);
    navigate('/collections');
  }, [collection, deleteCollection, navigate]);

  const handleRemoveItem = useCallback(
    async (eventId: string) => {
      if (!collection) return;
      await removeFromCollection(collection.id, eventId);
      setItems((prev) => prev.filter((item) => item.eventId !== eventId));
    },
    [collection, removeFromCollection]
  );

  if (collectionsLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center">
        <FolderOpen className="w-16 h-16 text-gray-700 mb-4" />
        <h2 className="text-xl font-semibold text-gray-400 mb-2">
          Collection not found
        </h2>
        <Link
          to="/collections"
          className="text-emerald-400 hover:text-emerald-300"
        >
          Go back to collections
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gray-950/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Link
                to="/collections"
                className="p-2 rounded-full hover:bg-gray-800 text-gray-400 flex-shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>

              {isEditing ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    maxLength={50}
                    autoFocus
                    className="flex-1 px-3 py-1 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName();
                      if (e.key === 'Escape') setIsEditing(false);
                    }}
                  />
                  <button
                    onClick={handleSaveName}
                    className="p-2 rounded-full hover:bg-gray-800 text-emerald-400"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditName(collection.name);
                    }}
                    className="p-2 rounded-full hover:bg-gray-800 text-gray-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 min-w-0">
                  <h1 className="text-xl font-semibold text-white truncate">
                    {collection.name}
                  </h1>
                  {!collection.isDefault && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-2 rounded-full hover:bg-gray-800 text-gray-400 flex-shrink-0"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {!collection.isDefault && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 rounded-full hover:bg-gray-800 text-gray-400 hover:text-red-400 flex-shrink-0"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="mt-2 text-sm text-gray-500 ml-12">
            {collection.items.length}{' '}
            {collection.items.length === 1 ? 'item' : 'items'}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {isLoadingItems ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-400 mb-2">
              This collection is empty
            </h2>
            <p className="text-gray-500 mb-6">
              Save items from the feed to add them here
            </p>
            <Link
              to="/feed"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-500 transition-colors"
            >
              <ExternalLink className="w-5 h-5" />
              Go to Feed
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map(({ eventId, event }) =>
              event ? (
                <CollectionItem
                  key={eventId}
                  event={event}
                  onRemove={() => handleRemoveItem(eventId)}
                />
              ) : null
            )}
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm p-6 bg-gray-900 rounded-xl shadow-xl"
            >
              <h2 className="text-lg font-semibold text-white mb-2">
                Delete Collection?
              </h2>
              <p className="text-gray-400 mb-4">
                This will remove all saved items from this collection. This
                action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteCollection}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-500 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Single item in a collection list
 */
function CollectionItem({
  event,
  onRemove,
}: {
  event: FeedItem;
  onRemove: () => void;
}) {
  const navigate = useNavigate();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <motion.div
      layout
      className="flex gap-4 p-4 bg-gray-900/50 rounded-xl border border-gray-800 group"
    >
      {/* Thumbnail */}
      {event.thumbnailUrl && (
        <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-gray-800">
          <img
            src={event.thumbnailUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-white line-clamp-2 mb-1">
          {event.headline}
        </h3>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          {event.sourcePublisher && <span>{event.sourcePublisher}</span>}
          {event.sourcePublisher && <span>•</span>}
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDate(event.publishedDate)}
          </span>
        </div>
        {event.summary && (
          <p className="text-sm text-gray-400 mt-2 line-clamp-2">
            {event.summary}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => navigate(`/feed?event=${event.id}`)}
          className="p-2 rounded-full bg-gray-800 text-gray-400 hover:text-white"
          title="View in feed"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
        <button
          onClick={onRemove}
          className="p-2 rounded-full bg-gray-800 text-gray-400 hover:text-red-400"
          title="Remove from collection"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

export default CollectionsPage;
