import { Link } from 'react-router-dom';
import { LoadingSkeleton } from '../ui/LoadingSkeleton';
import { useEntityPreview, type EntityType, type EntityPayload } from '../../hooks/useEntityPreview';

interface Props {
  type: EntityType;
  slug: string;
  href: string;
}

const CTA_COPY: Record<EntityType, string> = {
  person: 'View profile →',
  organization: 'View organization →',
  glossary: 'View glossary entry →',
  milestone: 'View event →',
  subject: 'Explore subject →',
};

const CTA_CLASS =
  'block w-full min-h-[44px] flex items-center justify-center px-4 py-3 text-sm font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 rounded-b-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatEventDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(d);
}

export function EntityPreviewBody({ type, slug, href }: Props) {
  const { data, isLoading, error } = useEntityPreview(type, slug, true);

  if (isLoading) {
    return (
      <>
        <div className="p-4">
          <PerTypeSkeleton type={type} />
        </div>
        <CtaFooter type={type} href={href} />
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <div className="p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Couldn't load preview.</p>
        </div>
        <CtaFooter type={type} href={href} />
      </>
    );
  }

  return (
    <>
      <div className="p-4">
        <EntityBody payload={data} />
      </div>
      <CtaFooter type={type} href={href} />
    </>
  );
}

function CtaFooter({ type, href }: { type: EntityType; href: string }) {
  return (
    <Link to={href} className={CTA_CLASS}>
      {CTA_COPY[type]}
    </Link>
  );
}

function PerTypeSkeleton({ type }: { type: EntityType }) {
  if (type === 'person' || type === 'organization') {
    const avatarSize = type === 'person' ? 48 : 40;
    return (
      <div className="flex items-start gap-3">
        <LoadingSkeleton variant="circular" width={avatarSize} height={avatarSize} />
        <div className="flex-1 min-w-0">
          <LoadingSkeleton className="mb-2 h-5 w-3/4" />
          <LoadingSkeleton lines={3} />
        </div>
      </div>
    );
  }
  if (type === 'milestone') {
    return (
      <div>
        <LoadingSkeleton className="mb-2 h-3 w-1/3" />
        <LoadingSkeleton className="mb-3 h-5 w-3/4" />
        <LoadingSkeleton lines={3} />
      </div>
    );
  }
  if (type === 'subject') {
    return (
      <div>
        <LoadingSkeleton className="mb-2 h-3 w-2/3" />
        <LoadingSkeleton className="mb-3 h-5 w-1/2" />
        <LoadingSkeleton lines={2} />
      </div>
    );
  }
  // glossary
  return (
    <div>
      <LoadingSkeleton className="mb-3 h-5 w-1/2" />
      <LoadingSkeleton lines={3} />
    </div>
  );
}

function EntityBody({ payload }: { payload: EntityPayload }) {
  if (payload.type === 'person') {
    const p = payload.data;
    const orgName = p.currentOrg?.name ?? null;
    const role = p.currentRole ?? null;
    const roleLine =
      role && orgName ? `${role} · ${orgName}` : role ?? orgName ?? null;

    return (
      <div className="flex items-start gap-3">
        <div className="shrink-0">
          {p.imageUrl ? (
            <img
              src={p.imageUrl}
              alt={p.canonicalName}
              loading="lazy"
              width={48}
              height={48}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div
              aria-hidden="true"
              className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center"
            >
              <span className="text-sm font-semibold text-orange-700 dark:text-orange-300">
                {getInitials(p.canonicalName)}
              </span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
            {p.canonicalName}
          </h4>
          {roleLine ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              {roleLine}
            </p>
          ) : null}
          {p.shortBio ? (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
              {p.shortBio}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  if (payload.type === 'organization') {
    const o = payload.data;
    const focus = (o.focusAreas ?? []).slice(0, 3);
    return (
      <div>
        <div className="flex items-start gap-3">
          <div className="shrink-0">
            {o.logoUrl ? (
              <img
                src={o.logoUrl}
                alt={o.name}
                loading="lazy"
                width={40}
                height={40}
                className="w-10 h-10 rounded object-cover bg-white"
              />
            ) : (
              <div
                aria-hidden="true"
                className="w-10 h-10 rounded bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center"
              >
                <span className="text-sm font-semibold text-orange-700 dark:text-orange-300">
                  {o.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
              {o.name}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate capitalize">
              {o.type.replace(/_/g, ' ')}
            </p>
          </div>
        </div>
        {o.shortDescription ? (
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
            {o.shortDescription}
          </p>
        ) : null}
        {focus.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1">
            {focus.map((f) => (
              <span
                key={f}
                className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                {f}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  if (payload.type === 'glossary') {
    const g = payload.data;
    return (
      <div>
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{g.term}</h4>
        {g.shortDefinition ? (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
            {g.shortDefinition}
          </p>
        ) : null}
      </div>
    );
  }

  if (payload.type === 'subject') {
    const s = payload.data;
    // path is `domain > Category > Subcategory`. Drop the leaf (= s.name) and
    // capitalize the domain so the breadcrumb reads naturally.
    const breadcrumb = s.path
      .split(' > ')
      .slice(0, -1)
      .map((seg, i) => (i === 0 ? seg.charAt(0).toUpperCase() + seg.slice(1) : seg))
      .join(' › ');
    return (
      <div>
        {breadcrumb ? (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 truncate">{breadcrumb}</p>
        ) : null}
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{s.name}</h4>
        {s.description ? (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
            {s.description}
          </p>
        ) : null}
      </div>
    );
  }

  // milestone
  const m = payload.data;
  const dateLine = formatEventDate(m.date);
  const summary =
    m.tldr ??
    (m.description.length > 200
      ? `${m.description.slice(0, 200)}…`
      : m.description);

  return (
    <div>
      {dateLine ? (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{dateLine}</p>
      ) : null}
      <h4 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">
        {m.title}
      </h4>
      {summary ? (
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-3">{summary}</p>
      ) : null}
    </div>
  );
}
