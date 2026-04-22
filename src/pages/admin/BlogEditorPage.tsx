/**
 * BlogEditorPage — admin authoring surface for /admin/blog/new and /admin/blog/:id/edit.
 *
 * Desktop-first 3-pane split (≥1280px: metadata / editor / preview). At `md`
 * we collapse to tabbed Write/Preview/Meta. Autosave runs on a 1s debounce,
 * announces state changes via an aria-live region, and shows a retry affordance
 * when the network fails.
 *
 * Scope cuts vs sprint spec (documented in Sprint-Blog-3 file):
 *  - coverImageAlt + targetKeyword require DB migrations — deferred to SEO
 *    polish sprint.
 *  - Inline paste/drag-drop image upload in the textarea — deferred; you can
 *    still upload via the Cover slot and reference the URL in body by hand.
 *  - Character-counter warnings wired as soft warnings, don't block publish.
 */

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, Upload, X as XIcon, Image as ImageIcon, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  blogAdminApi,
  authorsAdminApi,
  type AdminBlogPost,
} from '../../services/api';
import type { Author as AuthorType } from '../../types/blog';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { ErrorState } from '../../components/ui';

const BlogMarkdown = lazy(() =>
  import('../../components/Blog/BlogMarkdown').then((m) => ({ default: m.BlogMarkdown }))
);

const STATUS_CHIP: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  scheduled: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  published: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  archived: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500 line-through',
};

type Mode = 'new' | 'edit';
type MobileTab = 'write' | 'preview' | 'meta';

interface EditorForm {
  title: string;
  subtitle: string;
  excerpt: string;
  bodyMarkdown: string;
  coverImageUrl: string;
  tags: string; // comma-separated in the UI
  seoTitle: string;
  seoDescription: string;
  featured: boolean;
}

const BLANK_FORM: EditorForm = {
  title: '',
  subtitle: '',
  excerpt: '',
  bodyMarkdown: '',
  coverImageUrl: '',
  tags: '',
  seoTitle: '',
  seoDescription: '',
  featured: false,
};

type UploadState =
  | { kind: 'idle' }
  | { kind: 'uploading' }
  | { kind: 'error'; message: string };

export default function BlogEditorPage({ mode }: { mode: Mode }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [post, setPost] = useState<AdminBlogPost | null>(null);
  const [form, setForm] = useState<EditorForm>(BLANK_FORM);
  const [authors, setAuthors] = useState<AuthorType[]>([]);
  const [loading, setLoading] = useState(mode === 'edit');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>('write');

  const [uploadState, setUploadState] = useState<UploadState>({ kind: 'idle' });
  const [publishOpen, setPublishOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleFor, setScheduleFor] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);

  // Load post (edit mode) + authors list on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const authorsRes = await authorsAdminApi.list().catch(() => ({ authors: [] }));
        if (!cancelled) setAuthors(authorsRes.authors);

        if (mode === 'edit' && id) {
          const { post } = await blogAdminApi.get(id);
          if (cancelled) return;
          setPost(post);
          setForm({
            title: post.title,
            subtitle: post.subtitle ?? '',
            excerpt: post.excerpt,
            bodyMarkdown: post.bodyMarkdown,
            coverImageUrl: post.coverImageUrl ?? '',
            tags: parseTags(post.tags).join(', '),
            seoTitle: post.seoTitle ?? '',
            seoDescription: post.seoDescription ?? '',
            featured: post.featured,
          });
          setLoading(false);
        }
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Failed to load post';
        setLoadError(message);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, id]);

  // Autosave — 1s debounce on form changes (edit mode only; new mode has
  // nothing to save against yet until first "create").
  const lastSavedFormRef = useRef<string | null>(null);
  useEffect(() => {
    if (mode !== 'edit' || !post) return;
    const serialised = JSON.stringify(form);
    if (lastSavedFormRef.current === serialised) return;
    if (lastSavedFormRef.current === null) {
      // Seed the baseline from initial load so we don't autosave on hydration.
      lastSavedFormRef.current = serialised;
      return;
    }
    const timer = window.setTimeout(() => {
      void autosave();
    }, 1000);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, post, mode]);

  // Tick the "Saved Ns ago" readout every 10 seconds.
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (saveStatus !== 'saved') return;
    const id = window.setInterval(() => forceTick((n) => n + 1), 10_000);
    return () => window.clearInterval(id);
  }, [saveStatus]);

  async function autosave() {
    if (!post) return;
    setSaveStatus('saving');
    setSaveError(null);
    try {
      const { post: updated } = await blogAdminApi.update(post.id, {
        title: form.title,
        subtitle: form.subtitle || undefined,
        excerpt: form.excerpt,
        bodyMarkdown: form.bodyMarkdown,
        coverImageUrl: form.coverImageUrl || undefined,
        tags: splitTags(form.tags),
        seoTitle: form.seoTitle || undefined,
        seoDescription: form.seoDescription || undefined,
        featured: form.featured,
      });
      setPost(updated);
      lastSavedFormRef.current = JSON.stringify(form);
      setSaveStatus('saved');
      setLastSavedAt(Date.now());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Autosave failed';
      setSaveStatus('error');
      setSaveError(message);
    }
  }

  const handleCreate = useCallback(async () => {
    if (!form.title.trim() || !form.excerpt.trim() || !form.bodyMarkdown.trim()) {
      toast.error('Title, excerpt, and body are required to create a draft.');
      return;
    }
    setSaveStatus('saving');
    try {
      const { post: created } = await blogAdminApi.create({
        title: form.title,
        subtitle: form.subtitle || undefined,
        excerpt: form.excerpt,
        bodyMarkdown: form.bodyMarkdown,
        coverImageUrl: form.coverImageUrl || undefined,
        tags: splitTags(form.tags),
        seoTitle: form.seoTitle || undefined,
        seoDescription: form.seoDescription || undefined,
        featured: form.featured,
        subjectIds: [],
        relations: [],
      });
      toast.success('Draft created');
      navigate(`/admin/blog/${created.id}/edit`, { replace: true });
    } catch (err) {
      setSaveStatus('error');
      const message = err instanceof Error ? err.message : 'Create failed';
      toast.error(message);
    }
  }, [form, navigate]);

  const handleUploadCover = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        toast.error('Only image files are accepted');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be under 5MB');
        return;
      }
      setUploadState({ kind: 'uploading' });
      try {
        const { uploadUrl, publicUrl } = await blogAdminApi.getUploadUrl({
          filename: file.name,
          contentType: file.type,
        });
        const res = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        });
        if (!res.ok) throw new Error(`S3 upload failed (${res.status})`);
        setForm((f) => ({ ...f, coverImageUrl: publicUrl }));
        setUploadState({ kind: 'idle' });
        toast.success('Cover uploaded');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        setUploadState({ kind: 'error', message });
        toast.error(message);
      }
    },
    []
  );

  const handlePreview = useCallback(async () => {
    if (!post) {
      toast.error('Save as draft first to preview');
      return;
    }
    try {
      const { previewUrl } = await blogAdminApi.getPreviewToken(post.id);
      window.open(previewUrl, '_blank', 'noopener');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Preview failed';
      toast.error(message);
    }
  }, [post]);

  const handlePublish = useCallback(async () => {
    if (!post) return;
    setActionLoading(true);
    try {
      if (saveStatus !== 'saved') await autosave();
      await blogAdminApi.publish(post.id);
      toast.success('Published');
      setPublishOpen(false);
      navigate(`/blog/${post.slug}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Publish failed';
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post, saveStatus, navigate]);

  const handleSchedule = useCallback(async () => {
    if (!post) return;
    const target = new Date(scheduleFor);
    if (Number.isNaN(target.getTime()) || target.getTime() < Date.now() + 5 * 60_000) {
      toast.error('Pick a time at least 5 minutes in the future');
      return;
    }
    setActionLoading(true);
    try {
      if (saveStatus !== 'saved') await autosave();
      await blogAdminApi.schedule(post.id, target);
      toast.success(`Scheduled for ${target.toLocaleString()}`);
      setScheduleOpen(false);
      navigate('/admin/blog');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Schedule failed';
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post, saveStatus, scheduleFor, navigate]);

  const handleArchive = useCallback(async () => {
    if (!post) return;
    setActionLoading(true);
    try {
      await blogAdminApi.archive(post.id);
      toast.success('Archived');
      navigate('/admin/blog');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Archive failed';
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  }, [post, navigate]);

  const saveReadout = useMemo(() => {
    if (saveStatus === 'saving') return 'Saving…';
    if (saveStatus === 'error') return `Couldn't save${saveError ? ` — ${saveError}` : ''}`;
    if (saveStatus === 'saved' && lastSavedAt) {
      const s = Math.max(0, Math.round((Date.now() - lastSavedAt) / 1000));
      if (s < 60) return `Saved ✓ ${s}s ago`;
      const m = Math.floor(s / 60);
      return `Saved ✓ ${m}m ago`;
    }
    return '';
  }, [saveStatus, lastSavedAt, saveError]);

  const canPublishOrSchedule = !!post && form.title.trim() && form.excerpt.trim() && form.bodyMarkdown.trim();
  const status = post?.status ?? 'draft';

  if (loading) {
    return (
      <div className="py-16 text-center text-gray-600 dark:text-gray-400">Loading post…</div>
    );
  }
  if (loadError) {
    return (
      <div className="py-16">
        <ErrorState title="Couldn't load this post" message={loadError} />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between gap-4 flex-wrap bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Link
            to="/admin/blog"
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            aria-label="Back to blog list"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Post title"
            className="text-2xl font-semibold bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-0 border-0 flex-1 min-w-0"
          />
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CHIP[status] ?? STATUS_CHIP.draft}`}
          >
            {status}
          </span>
        </div>
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="text-xs text-gray-500 dark:text-gray-400 min-w-[120px] text-right"
        >
          {saveReadout}
        </div>
        <div className="flex items-center gap-2">
          {mode === 'new' ? (
            <button
              type="button"
              onClick={() => void handleCreate()}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 text-sm font-medium"
            >
              Save as draft
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => void handlePreview()}
                className="inline-flex items-center gap-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Eye className="h-4 w-4" />
                Preview
              </button>
              {status !== 'published' && (
                <button
                  type="button"
                  onClick={() => setScheduleOpen(true)}
                  disabled={!canPublishOrSchedule}
                  className="inline-flex items-center gap-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  Schedule
                </button>
              )}
              {status !== 'published' && (
                <button
                  type="button"
                  onClick={() => setPublishOpen(true)}
                  disabled={!canPublishOrSchedule}
                  className="inline-flex items-center gap-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  Publish
                </button>
              )}
              {status !== 'archived' && (
                <button
                  type="button"
                  onClick={() => setArchiveOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 px-4 py-2 text-sm font-medium"
                >
                  Archive
                </button>
              )}
            </>
          )}
        </div>
      </header>

      {/* Mobile tabs */}
      <div className="md:hidden flex items-center gap-1 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-4">
        {(['write', 'preview', 'meta'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setMobileTab(t)}
            className={
              mobileTab === t
                ? 'px-3 py-2 text-sm font-medium border-b-2 border-orange-500 text-orange-600 dark:text-orange-400 -mb-px capitalize'
                : 'px-3 py-2 text-sm text-gray-600 dark:text-gray-400 capitalize'
            }
          >
            {t}
          </button>
        ))}
      </div>

      {/* Body: 3-pane on xl, 2-pane on md+, tabbed on sm */}
      <div className="flex-1 grid gap-0 md:grid-cols-2 xl:grid-cols-[320px_minmax(0,1fr)_480px]">
        {/* Meta pane */}
        <aside
          className={`${mobileTab === 'meta' ? 'block' : 'hidden'} md:hidden xl:block border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-4 space-y-4 overflow-y-auto`}
        >
          <MetaFields
            form={form}
            setForm={setForm}
            authors={authors}
            post={post}
            uploadState={uploadState}
            onUploadCover={handleUploadCover}
            setUploadState={setUploadState}
          />
        </aside>

        {/* Editor pane */}
        <main
          className={`${mobileTab === 'write' ? 'block' : 'hidden'} md:block bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700`}
        >
          <label htmlFor="blog-body-md" className="sr-only">
            Body (Markdown)
          </label>
          <textarea
            id="blog-body-md"
            value={form.bodyMarkdown}
            onChange={(e) => setForm((f) => ({ ...f, bodyMarkdown: e.target.value }))}
            placeholder="Write your post in markdown…"
            className="w-full h-[calc(100vh-12rem)] min-h-[400px] p-6 font-mono text-sm leading-relaxed bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none resize-none"
          />
          <div className="px-6 pb-4 space-y-2">
            <label className="block">
              <span className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Excerpt ({form.excerpt.length}/300)
              </span>
              <textarea
                value={form.excerpt}
                onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                rows={2}
                placeholder="One-paragraph summary for cards + OG description (140–160 chars ideal)."
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </label>
          </div>
        </main>

        {/* Preview pane */}
        <aside
          className={`${mobileTab === 'preview' ? 'block' : 'hidden'} md:block bg-white dark:bg-gray-900 overflow-y-auto`}
        >
          <div className="p-6 max-w-2xl mx-auto">
            <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">
              Live preview
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white leading-tight">
              {form.title || 'Untitled post'}
            </h1>
            {form.subtitle && (
              <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">{form.subtitle}</p>
            )}
            <div className="mt-8">
              <Suspense
                fallback={<div className="text-sm text-gray-500">Loading preview…</div>}
              >
                <BlogMarkdown markdown={form.bodyMarkdown} />
              </Suspense>
            </div>
          </div>
        </aside>
      </div>

      {/* Dialogs */}
      <ConfirmDialog
        isOpen={publishOpen}
        title="Publish this post?"
        message="This will make it publicly visible at letaiexplainai.com and include it in the sitemap + RSS."
        onConfirm={() => void handlePublish()}
        onCancel={() => setPublishOpen(false)}
        confirmLabel="Publish"
        isLoading={actionLoading}
      />
      <ConfirmDialog
        isOpen={archiveOpen}
        title="Archive this post?"
        message="It will disappear from the public blog. You can unarchive it later from the admin list."
        onConfirm={() => void handleArchive()}
        onCancel={() => setArchiveOpen(false)}
        confirmLabel="Archive"
        destructive
        isLoading={actionLoading}
      />

      {scheduleOpen && (
        <ScheduleModal
          value={scheduleFor}
          onChange={setScheduleFor}
          onCancel={() => setScheduleOpen(false)}
          onConfirm={() => void handleSchedule()}
          isLoading={actionLoading}
        />
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Meta pane (author, cover, tags, SEO)
// -----------------------------------------------------------------------------

function MetaFields({
  form,
  setForm,
  authors,
  post,
  uploadState,
  onUploadCover,
  setUploadState,
}: {
  form: EditorForm;
  setForm: React.Dispatch<React.SetStateAction<EditorForm>>;
  authors: AuthorType[];
  post: AdminBlogPost | null;
  uploadState: UploadState;
  onUploadCover: (file: File) => void;
  setUploadState: React.Dispatch<React.SetStateAction<UploadState>>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleLen = form.title.length;
  const titleWarn = titleLen > 60;
  const titleBlock = titleLen > 110;

  return (
    <>
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
          Cover image
        </h3>
        {form.coverImageUrl ? (
          <div className="space-y-2">
            <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 aspect-[1200/630] bg-gray-100 dark:bg-gray-800">
              <img src={form.coverImageUrl} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, coverImageUrl: '' }))}
                className="text-xs text-red-600 dark:text-red-400"
              >
                Remove
              </button>
            </div>
          </div>
        ) : uploadState.kind === 'uploading' ? (
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-4 text-sm text-gray-600 dark:text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading…
          </div>
        ) : uploadState.kind === 'error' ? (
          <div className="space-y-2">
            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300">
              {uploadState.message}
            </div>
            <button
              type="button"
              onClick={() => {
                setUploadState({ kind: 'idle' });
                fileInputRef.current?.click();
              }}
              className="text-xs text-orange-600 dark:text-orange-400"
            >
              Try again
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-6 text-sm text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800"
          >
            <ImageIcon className="h-6 w-6" />
            <span>
              <Upload className="h-3 w-3 inline mr-1" />
              Upload cover
            </span>
            <span className="text-xs text-gray-400">PNG / JPG, &lt;5MB, 1200×630 ideal</span>
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUploadCover(f);
            e.target.value = '';
          }}
        />
      </section>

      <section>
        <label className="block">
          <span className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
            Subtitle
          </span>
          <input
            type="text"
            value={form.subtitle}
            onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </label>
      </section>

      <section>
        <label className="block">
          <span className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
            Tags
          </span>
          <input
            type="text"
            value={form.tags}
            onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
            placeholder="editorial, atlas, intro"
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <span className="block text-xs text-gray-500 dark:text-gray-500 mt-1">
            Comma-separated. Shown on post cards + tag archive.
          </span>
        </label>
      </section>

      <section>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
            className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
          />
          <span className="text-sm text-gray-900 dark:text-gray-100">Feature on homepage hero</span>
        </label>
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
          SEO
        </h3>
        <label className="block">
          <span className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
            SEO title override{' '}
            <span
              className={titleBlock ? 'text-red-600 dark:text-red-400' : titleWarn ? 'text-amber-600 dark:text-amber-400' : ''}
            >
              ({form.seoTitle.length || titleLen}/110)
            </span>
          </span>
          <input
            type="text"
            value={form.seoTitle}
            onChange={(e) => setForm((f) => ({ ...f, seoTitle: e.target.value }))}
            placeholder="Defaults to title if blank"
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </label>
        <label className="block mt-3">
          <span className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
            Meta description ({form.seoDescription.length}/160)
          </span>
          <textarea
            value={form.seoDescription}
            onChange={(e) => setForm((f) => ({ ...f, seoDescription: e.target.value }))}
            rows={2}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </label>
      </section>

      {authors.length > 0 && post && (
        <section>
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
            Author
          </div>
          <div className="text-sm text-gray-900 dark:text-gray-100">{post.author.name}</div>
          <Link
            to="/admin/authors"
            className="text-xs text-orange-600 dark:text-orange-400 hover:underline"
          >
            Manage authors →
          </Link>
        </section>
      )}
    </>
  );
}

// -----------------------------------------------------------------------------
// Schedule modal — input dialog (not ConfirmDialog, which is for pure confirms).
// -----------------------------------------------------------------------------

function ScheduleModal({
  value,
  onChange,
  onCancel,
  onConfirm,
  isLoading,
}: {
  value: string;
  onChange: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-warm-lg max-w-md w-full mx-4 p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Schedule post</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Pick a time at least 5 minutes from now.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close dialog"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        <label className="block">
          <span className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Publish at</span>
          <input
            type="datetime-local"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </label>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading || !value}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
          >
            {isLoading ? 'Scheduling…' : 'Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function parseTags(stringified: string): string[] {
  try {
    const parsed = JSON.parse(stringified);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function splitTags(input: string): string[] {
  return input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
