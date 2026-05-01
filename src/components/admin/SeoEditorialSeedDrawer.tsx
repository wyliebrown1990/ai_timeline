import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import type { CreateSeoEditorialSeedInput } from '../../services/api';
import { Drawer } from '../ui';

const PAGE_TYPE_OPTIONS = [
  { value: 'blog_post', label: 'Blog post' },
  { value: 'explainer_page', label: 'Explainer page' },
  { value: 'glossary_term', label: 'Glossary term' },
  { value: 'timeline_page', label: 'Timeline page' },
  { value: 'who_invented_page', label: 'Who invented page' },
  { value: 'person_page', label: 'Person page' },
  { value: 'organization_page', label: 'Organization page' },
];

const INITIAL_FORM: CreateSeoEditorialSeedInput = {
  seedQuery: '',
  pageTypeRecommendation: 'blog_post',
  targetUrl: '',
  demandProxy: 55,
  competitionProxy: 45,
  laeaFitScore: 75,
  rationale: '',
};

interface SeoEditorialSeedDrawerProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: CreateSeoEditorialSeedInput) => Promise<void>;
  isSubmitting: boolean;
}

export function SeoEditorialSeedDrawer({
  open,
  onClose,
  onSubmit,
  isSubmitting,
}: SeoEditorialSeedDrawerProps) {
  const [form, setForm] = useState<CreateSeoEditorialSeedInput>(INITIAL_FORM);

  useEffect(() => {
    if (!open) {
      setForm(INITIAL_FORM);
    }
  }, [open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(form);
  }

  function updateField<K extends keyof CreateSeoEditorialSeedInput>(key: K, value: CreateSeoEditorialSeedInput[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Add editorial seed"
      description="Manually score a keyword idea so it joins the SEO discovery backlog without waiting for external providers."
    >
      <form className="space-y-5 p-5" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="editorial-seed-keyword" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Keyword
          </label>
          <input
            id="editorial-seed-keyword"
            type="text"
            required
            value={form.seedQuery}
            onChange={(event) => updateField('seedQuery', event.target.value)}
            placeholder="e.g. ai agent memory"
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="editorial-seed-page-type" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Recommended page type
            </label>
            <select
              id="editorial-seed-page-type"
              value={form.pageTypeRecommendation}
              onChange={(event) => updateField('pageTypeRecommendation', event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              {PAGE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="editorial-seed-target-url" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Target URL
            </label>
            <input
              id="editorial-seed-target-url"
              type="text"
              value={form.targetUrl ?? ''}
              onChange={(event) => updateField('targetUrl', event.target.value)}
              placeholder="/blog/ai-agent-memory"
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="editorial-seed-demand" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Demand
            </label>
            <input
              id="editorial-seed-demand"
              type="number"
              min={0}
              max={100}
              required
              value={form.demandProxy}
              onChange={(event) => updateField('demandProxy', Number(event.target.value))}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="editorial-seed-competition" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Competition
            </label>
            <input
              id="editorial-seed-competition"
              type="number"
              min={0}
              max={100}
              required
              value={form.competitionProxy}
              onChange={(event) => updateField('competitionProxy', Number(event.target.value))}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="editorial-seed-fit" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              LAEA fit
            </label>
            <input
              id="editorial-seed-fit"
              type="number"
              min={0}
              max={100}
              required
              value={form.laeaFitScore}
              onChange={(event) => updateField('laeaFitScore', Number(event.target.value))}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label htmlFor="editorial-seed-rationale" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Why this belongs in the backlog
          </label>
          <textarea
            id="editorial-seed-rationale"
            rows={5}
            required
            value={form.rationale}
            onChange={(event) => updateField('rationale', event.target.value)}
            placeholder="Explain the opportunity, the expected page shape, and why this fits LAEA."
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            {isSubmitting ? 'Adding…' : 'Add seed'}
          </button>
        </div>
      </form>
    </Drawer>
  );
}

export default SeoEditorialSeedDrawer;
