import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EntityPreviewBody } from '../../../../src/components/Blog/EntityPreviewBody';
import { clearEntityPreviewCache } from '../../../../src/hooks/useEntityPreview';

jest.mock('../../../../src/services/api', () => ({
  personsApi: { getBySlug: jest.fn() },
  organizationsApi: { getBySlug: jest.fn() },
  glossaryApi: { getBySlug: jest.fn() },
  eventsApi: { getById: jest.fn() },
  subjectsApi: { getBySlug: jest.fn() },
}));

import {
  personsApi,
  organizationsApi,
  glossaryApi,
  eventsApi,
  subjectsApi,
} from '../../../../src/services/api';

const PERSON = {
  id: 'sam-altman',
  canonicalName: 'Sam Altman',
  slug: 'sam-altman',
  shortBio: 'CEO of OpenAI.',
  currentRole: 'CEO',
  imageUrl: null,
  currentOrg: { id: 'openai', name: 'OpenAI', slug: 'openai', type: 'company' },
};

const ORG = {
  id: 'openai',
  name: 'OpenAI',
  slug: 'openai',
  type: 'company',
  shortDescription: 'Research lab building beneficial AGI.',
  focusAreas: ['LLMs', 'Alignment', 'Multimodal'],
  logoUrl: null,
};

const GLOSSARY = {
  id: 'transformer',
  term: 'Transformer',
  slug: 'transformer',
  shortDefinition: 'A neural network architecture using attention.',
};

const EVENT = {
  id: 'E2017_TRANSFORMER',
  title: 'Attention Is All You Need',
  description: 'Original transformer paper.',
  date: '2017-06-12',
  tldr: 'Transformer architecture introduced.',
};

const SUBJECT = {
  id: 'sub-1',
  slug: 'business-technology-semiconductors',
  name: 'Semiconductors',
  description: 'AI chips and hardware.',
  level: 2,
  parentId: null,
  path: 'business > Technology > Semiconductors',
  domainSlug: 'business',
  defaultDifficulty: null,
  learningObjectives: [],
  color: null,
  icon: null,
};

beforeEach(() => {
  clearEntityPreviewCache();
  jest.clearAllMocks();
});

function renderBody(props: Parameters<typeof EntityPreviewBody>[0]) {
  return render(
    <MemoryRouter>
      <EntityPreviewBody {...props} />
    </MemoryRouter>
  );
}

describe('EntityPreviewBody', () => {
  it('renders skeleton then person content', async () => {
    (personsApi.getBySlug as jest.Mock).mockResolvedValueOnce(PERSON);
    renderBody({ type: 'person', slug: 'sam-altman', href: '/people/sam-altman' });
    await waitFor(() => expect(screen.getByText('Sam Altman')).toBeInTheDocument());
    expect(screen.getByText(/CEO · OpenAI/)).toBeInTheDocument();
    expect(screen.getByText('CEO of OpenAI.')).toBeInTheDocument();
    expect(screen.getByText('View profile →')).toBeInTheDocument();
  });

  it('renders organization content with focus-area chips', async () => {
    (organizationsApi.getBySlug as jest.Mock).mockResolvedValueOnce(ORG);
    renderBody({ type: 'organization', slug: 'openai', href: '/organizations/openai' });
    await waitFor(() => expect(screen.getByText('OpenAI')).toBeInTheDocument());
    expect(screen.getByText(/Research lab building beneficial AGI/)).toBeInTheDocument();
    expect(screen.getByText('LLMs')).toBeInTheDocument();
    expect(screen.getByText('Alignment')).toBeInTheDocument();
    expect(screen.getByText('Multimodal')).toBeInTheDocument();
    expect(screen.getByText('View organization →')).toBeInTheDocument();
  });

  it('renders glossary term', async () => {
    (glossaryApi.getBySlug as jest.Mock).mockResolvedValueOnce(GLOSSARY);
    renderBody({ type: 'glossary', slug: 'transformer', href: '/glossary/transformer' });
    await waitFor(() => expect(screen.getByText('Transformer')).toBeInTheDocument());
    expect(screen.getByText('A neural network architecture using attention.')).toBeInTheDocument();
    expect(screen.getByText('View glossary entry →')).toBeInTheDocument();
  });

  it('renders milestone with formatted date and tldr', async () => {
    (eventsApi.getById as jest.Mock).mockResolvedValueOnce(EVENT);
    renderBody({ type: 'milestone', slug: 'E2017_TRANSFORMER', href: '/events/E2017_TRANSFORMER' });
    await waitFor(() => expect(screen.getByText('Attention Is All You Need')).toBeInTheDocument());
    expect(screen.getByText('Transformer architecture introduced.')).toBeInTheDocument();
    expect(screen.getByText('View event →')).toBeInTheDocument();
  });

  it('renders subject with breadcrumb, name, description', async () => {
    (subjectsApi.getBySlug as jest.Mock).mockResolvedValueOnce(SUBJECT);
    renderBody({
      type: 'subject',
      slug: 'business-technology-semiconductors',
      href: '/subjects/business-technology-semiconductors',
    });
    await waitFor(() => expect(screen.getByText('Semiconductors')).toBeInTheDocument());
    // Breadcrumb drops the leaf and capitalizes the domain.
    expect(screen.getByText('Business › Technology')).toBeInTheDocument();
    expect(screen.getByText('AI chips and hardware.')).toBeInTheDocument();
    expect(screen.getByText('Explore subject →')).toBeInTheDocument();
  });

  it('falls back to a compact inline error message on fetch failure', async () => {
    (personsApi.getBySlug as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    renderBody({ type: 'person', slug: 'unknown', href: '/people/unknown' });
    await waitFor(() => expect(screen.getByText("Couldn't load preview.")).toBeInTheDocument());
    // Footer CTA still renders so users can navigate to the full page.
    expect(screen.getByText('View profile →')).toBeInTheDocument();
  });
});
