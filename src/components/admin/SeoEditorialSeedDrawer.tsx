import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
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

type EditorialSeedFormField =
  | 'seedQuery'
  | 'targetUrl'
  | 'demandProxy'
  | 'competitionProxy'
  | 'laeaFitScore'
  | 'rationale';

type EditorialSeedFormErrors = Partial<Record<EditorialSeedFormField, string>>;

function normalizeTargetUrl(value?: string | null): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

function getEditorialSeedFormErrors(form: CreateSeoEditorialSeedInput): EditorialSeedFormErrors {
  const errors: EditorialSeedFormErrors = {};
  const keyword = form.seedQuery.trim();
  const rationale = form.rationale.trim();
  const targetUrl = normalizeTargetUrl(form.targetUrl);

  if (keyword.length === 0) {
    errors.seedQuery = 'Keyword is required.';
  } else if (keyword.length > 100) {
    errors.seedQuery = 'Keyword must be 100 characters or fewer.';
  }

  if (targetUrl) {
    const isRelativePath = targetUrl.startsWith('/');
    let isAllowedAbsoluteUrl = false;

    if (!isRelativePath) {
      try {
        const parsed = new URL(targetUrl);
        isAllowedAbsoluteUrl = parsed.hostname === 'letaiexplainai.com';
      } catch {
        isAllowedAbsoluteUrl = false;
      }
    }

    if (!isRelativePath && !isAllowedAbsoluteUrl) {
      errors.targetUrl = 'Use a relative path like /blog/ai-agent-memory or a letaiexplainai.com URL.';
    }
  }

  if (!Number.isFinite(form.demandProxy) || form.demandProxy < 0 || form.demandProxy > 100) {
    errors.demandProxy = 'Demand must be between 0 and 100.';
  }

  if (!Number.isFinite(form.competitionProxy) || form.competitionProxy < 0 || form.competitionProxy > 100) {
    errors.competitionProxy = 'Competition must be between 0 and 100.';
  }

  if (!Number.isFinite(form.laeaFitScore) || form.laeaFitScore < 0 || form.laeaFitScore > 100) {
    errors.laeaFitScore = 'LAEA fit must be between 0 and 100.';
  }

  if (rationale.length === 0) {
    errors.rationale = 'Rationale is required.';
  }

  return errors;
}

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
  const [touched, setTouched] = useState<Partial<Record<EditorialSeedFormField, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const errors = useMemo(() => getEditorialSeedFormErrors(form), [form]);
  const isValid = Object.keys(errors).length === 0;

  useEffect(() => {
    if (!open) {
      setForm(INITIAL_FORM);
      setTouched({});
      setSubmitAttempted(false);
    }
  }, [open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitAttempted(true);
    if (!isValid) {
      return;
    }

    await onSubmit({
      ...form,
      seedQuery: form.seedQuery.trim(),
      targetUrl: normalizeTargetUrl(form.targetUrl),
      rationale: form.rationale.trim(),
    });
  }

  function updateField<K extends keyof CreateSeoEditorialSeedInput>(key: K, value: CreateSeoEditorialSeedInput[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function markTouched(field: EditorialSeedFormField) {
    setTouched((current) => ({
      ...current,
      [field]: true,
    }));
  }

  function getFieldError(field: EditorialSeedFormField): string | undefined {
    if (!submitAttempted && !touched[field]) {
      return undefined;
    }

    return errors[field];
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Add editorial seed"
      description="Manually score a keyword idea so it joins the SEO discovery backlog without waiting for external providers."
    >
      <form className="space-y-5 p-5" onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="editorial-seed-keyword" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Keyword
          </label>
          <input
            id="editorial-seed-keyword"
            type="text"
            value={form.seedQuery}
            onChange={(event) => updateField('seedQuery', event.target.value)}
            onBlur={() => markTouched('seedQuery')}
            placeholder="e.g. ai agent memory"
            aria-invalid={Boolean(getFieldError('seedQuery'))}
            aria-describedby={getFieldError('seedQuery') ? 'editorial-seed-keyword-error' : undefined}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
          {getFieldError('seedQuery') ? (
            <p id="editorial-seed-keyword-error" className="mt-2 text-sm text-rose-600 dark:text-rose-300">
              {getFieldError('seedQuery')}
            </p>
          ) : null}
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
              onBlur={() => markTouched('targetUrl')}
              placeholder="/blog/ai-agent-memory"
              aria-invalid={Boolean(getFieldError('targetUrl'))}
              aria-describedby={getFieldError('targetUrl') ? 'editorial-seed-target-url-error' : undefined}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
            {getFieldError('targetUrl') ? (
              <p id="editorial-seed-target-url-error" className="mt-2 text-sm text-rose-600 dark:text-rose-300">
                {getFieldError('targetUrl')}
              </p>
            ) : null}
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
              value={Number.isFinite(form.demandProxy) ? form.demandProxy : ''}
              onChange={(event) => updateField('demandProxy', event.target.value === '' ? Number.NaN : Number(event.target.value))}
              onBlur={() => markTouched('demandProxy')}
              aria-invalid={Boolean(getFieldError('demandProxy'))}
              aria-describedby={getFieldError('demandProxy') ? 'editorial-seed-demand-error' : undefined}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
            {getFieldError('demandProxy') ? (
              <p id="editorial-seed-demand-error" className="mt-2 text-sm text-rose-600 dark:text-rose-300">
                {getFieldError('demandProxy')}
              </p>
            ) : null}
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
              value={Number.isFinite(form.competitionProxy) ? form.competitionProxy : ''}
              onChange={(event) => updateField('competitionProxy', event.target.value === '' ? Number.NaN : Number(event.target.value))}
              onBlur={() => markTouched('competitionProxy')}
              aria-invalid={Boolean(getFieldError('competitionProxy'))}
              aria-describedby={getFieldError('competitionProxy') ? 'editorial-seed-competition-error' : undefined}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
            {getFieldError('competitionProxy') ? (
              <p id="editorial-seed-competition-error" className="mt-2 text-sm text-rose-600 dark:text-rose-300">
                {getFieldError('competitionProxy')}
              </p>
            ) : null}
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
              value={Number.isFinite(form.laeaFitScore) ? form.laeaFitScore : ''}
              onChange={(event) => updateField('laeaFitScore', event.target.value === '' ? Number.NaN : Number(event.target.value))}
              onBlur={() => markTouched('laeaFitScore')}
              aria-invalid={Boolean(getFieldError('laeaFitScore'))}
              aria-describedby={getFieldError('laeaFitScore') ? 'editorial-seed-fit-error' : undefined}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
            {getFieldError('laeaFitScore') ? (
              <p id="editorial-seed-fit-error" className="mt-2 text-sm text-rose-600 dark:text-rose-300">
                {getFieldError('laeaFitScore')}
              </p>
            ) : null}
          </div>
        </div>

        <div>
          <label htmlFor="editorial-seed-rationale" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Why this belongs in the backlog
          </label>
          <textarea
            id="editorial-seed-rationale"
            rows={5}
            value={form.rationale}
            onChange={(event) => updateField('rationale', event.target.value)}
            onBlur={() => markTouched('rationale')}
            placeholder="Explain the opportunity, the expected page shape, and why this fits LAEA."
            aria-invalid={Boolean(getFieldError('rationale'))}
            aria-describedby={getFieldError('rationale') ? 'editorial-seed-rationale-error' : undefined}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
          {getFieldError('rationale') ? (
            <p id="editorial-seed-rationale-error" className="mt-2 text-sm text-rose-600 dark:text-rose-300">
              {getFieldError('rationale')}
            </p>
          ) : null}
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
            disabled={isSubmitting || !isValid}
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
