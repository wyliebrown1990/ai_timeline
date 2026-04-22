/**
 * AuthorsAdminPage — /admin/authors.
 *
 * Minimal first-class: list + inline create form. Updating existing authors
 * is a simple row click that swaps in an edit form. No modal — authors are
 * few and the form is short, so inline matches the density of other admin
 * surfaces in the project.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { authorsAdminApi } from '../../services/api';
import type { Author as AuthorType } from '../../types/blog';
import { ErrorState } from '../../components/ui';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';

interface Form {
  name: string;
  slug: string;
  role: string;
  bio: string;
  avatarUrl: string;
}

const EMPTY_FORM: Form = { name: '', slug: '', role: '', bio: '', avatarUrl: '' };

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function AuthorsAdminPage() {
  const [authors, setAuthors] = useState<AuthorType[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { authors } = await authorsAdminApi.list();
      setAuthors(authors);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load authors');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onCreate = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      await authorsAdminApi.create({
        name: form.name,
        slug: form.slug || slugify(form.name),
        role: form.role || undefined,
        bio: form.bio || undefined,
        avatarUrl: form.avatarUrl || undefined,
      });
      toast.success('Author created');
      setForm(EMPTY_FORM);
      setShowCreate(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/blog"
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            aria-label="Back to blog"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Authors</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              People who write posts on the blog.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((s) => !s)}
          className="inline-flex items-center gap-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          {showCreate ? 'Cancel' : 'New author'}
        </button>
      </header>

      {showCreate && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Name *</span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                onBlur={(e) => {
                  if (!form.slug) setForm((f) => ({ ...f, slug: slugify(e.target.value) }));
                }}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
              />
            </label>
            <label className="block">
              <span className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Slug</span>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="auto-generated from name"
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
              />
            </label>
            <label className="block">
              <span className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Role</span>
              <input
                type="text"
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                placeholder="Editor, Contributor, …"
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
              />
            </label>
            <label className="block">
              <span className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Avatar URL</span>
              <input
                type="url"
                value={form.avatarUrl}
                onChange={(e) => setForm((f) => ({ ...f, avatarUrl: e.target.value }))}
                placeholder="https://…"
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
              />
            </label>
          </div>
          <label className="block">
            <span className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Bio</span>
            <textarea
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              rows={3}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowCreate(false);
                setForm(EMPTY_FORM);
              }}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void onCreate()}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
            >
              {saving ? 'Creating…' : 'Create author'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <ErrorState title="Couldn't load authors" message={error} onRetry={() => void load()} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <tr>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Slug</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Bio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {(authors ?? []).map((a) => (
                <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    {a.name}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-mono text-xs">
                    {a.slug}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{a.role ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300 line-clamp-1 max-w-md">
                    {a.bio ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
