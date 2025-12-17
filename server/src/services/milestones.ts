import { prisma } from '../db';
import type {
  MilestoneCategory,
  CreateMilestoneDto,
  UpdateMilestoneDto,
  MilestoneResponse,
  Source,
  MilestoneLayeredContent,
} from '../../../src/types/milestone';

/**
 * Pagination options for list queries
 */
interface PaginationOptions {
  skip: number;
  limit: number;
}

/**
 * Paginated response structure
 */
interface PaginatedResult {
  milestones: MilestoneResponse[];
  total: number;
}

/**
 * Raw milestone record from database (arrays stored as JSON strings in SQLite)
 */
interface MilestoneRecord {
  id: string;
  title: string;
  description: string;
  date: Date;
  category: string;
  significance: number;
  era: string | null;
  organization: string | null;
  contributors: string;
  sourceUrl: string | null;
  imageUrl: string | null;
  tags: string;
  sources: string;
  createdAt: Date;
  updatedAt: Date;
  // Layered content fields (Sprint 8.5)
  tldr: string | null;
  simpleExplanation: string | null;
  businessImpact: string | null;
  technicalDepth: string | null;
  historicalContext: string | null;
  whyItMattersToday: string | null;
  commonMisconceptions: string | null;
}

/**
 * Parse JSON string safely, returning default if parsing fails
 */
function parseJsonArray<T>(jsonString: string, defaultValue: T[] = []): T[] {
  try {
    const parsed = JSON.parse(jsonString);
    return Array.isArray(parsed) ? parsed : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Get all milestones with pagination
 */
export async function getAll(options: PaginationOptions): Promise<PaginatedResult> {
  const [milestones, total] = await Promise.all([
    prisma.milestone.findMany({
      skip: options.skip,
      take: options.limit,
      orderBy: { date: 'asc' },
    }),
    prisma.milestone.count(),
  ]);

  return {
    milestones: milestones.map((m) => formatMilestoneResponse(m as MilestoneRecord)),
    total,
  };
}

/**
 * Get a single milestone by ID
 */
export async function getById(id: string): Promise<MilestoneResponse | null> {
  const milestone = await prisma.milestone.findUnique({
    where: { id },
  });

  return milestone ? formatMilestoneResponse(milestone as MilestoneRecord) : null;
}

/**
 * Create a new milestone
 */
export async function create(data: CreateMilestoneDto): Promise<MilestoneResponse> {
  const milestone = await prisma.milestone.create({
    data: {
      title: data.title,
      description: data.description,
      date: new Date(data.date),
      category: data.category,
      significance: data.significance,
      era: data.era || null,
      organization: data.organization || null,
      contributors: JSON.stringify(data.contributors ?? []),
      sourceUrl: data.sourceUrl || null,
      imageUrl: data.imageUrl || null,
      tags: JSON.stringify(data.tags ?? []),
      sources: JSON.stringify(data.sources ?? []),
    },
  });

  return formatMilestoneResponse(milestone as MilestoneRecord);
}

/**
 * Update an existing milestone
 */
export async function update(
  id: string,
  data: UpdateMilestoneDto
): Promise<MilestoneResponse | null> {
  try {
    const updateData: Record<string, unknown> = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.date !== undefined) updateData.date = new Date(data.date);
    if (data.category !== undefined) updateData.category = data.category;
    if (data.significance !== undefined) updateData.significance = data.significance;
    if (data.era !== undefined) updateData.era = data.era || null;
    if (data.organization !== undefined) updateData.organization = data.organization || null;
    if (data.contributors !== undefined) updateData.contributors = JSON.stringify(data.contributors);
    if (data.sourceUrl !== undefined) updateData.sourceUrl = data.sourceUrl || null;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl || null;
    if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags);
    if (data.sources !== undefined) updateData.sources = JSON.stringify(data.sources);

    const milestone = await prisma.milestone.update({
      where: { id },
      data: updateData,
    });

    return formatMilestoneResponse(milestone as MilestoneRecord);
  } catch {
    return null;
  }
}

/**
 * Delete a milestone by ID
 */
export async function remove(id: string): Promise<boolean> {
  try {
    await prisma.milestone.delete({
      where: { id },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get milestones by category with pagination
 */
export async function getByCategory(
  category: MilestoneCategory,
  options: PaginationOptions
): Promise<PaginatedResult> {
  const [milestones, total] = await Promise.all([
    prisma.milestone.findMany({
      where: { category },
      skip: options.skip,
      take: options.limit,
      orderBy: { date: 'asc' },
    }),
    prisma.milestone.count({
      where: { category },
    }),
  ]);

  return {
    milestones: milestones.map((m) => formatMilestoneResponse(m as MilestoneRecord)),
    total,
  };
}

/**
 * Get milestones by year with pagination
 */
export async function getByYear(
  year: number,
  options: PaginationOptions
): Promise<PaginatedResult> {
  const startDate = new Date(`${year}-01-01`);
  const endDate = new Date(`${year + 1}-01-01`);

  const [milestones, total] = await Promise.all([
    prisma.milestone.findMany({
      where: {
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
      skip: options.skip,
      take: options.limit,
      orderBy: { date: 'asc' },
    }),
    prisma.milestone.count({
      where: {
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
    }),
  ]);

  return {
    milestones: milestones.map((m) => formatMilestoneResponse(m as MilestoneRecord)),
    total,
  };
}

/**
 * Search query options
 */
interface SearchOptions extends PaginationOptions {
  query: string;
}

/**
 * Filter options for advanced filtering
 */
export interface FilterOptions {
  categories?: MilestoneCategory[];
  significanceLevels?: number[];
  dateStart?: Date;
  dateEnd?: Date;
  tags?: string[];
}

/**
 * Search result with highlighting info
 */
interface SearchResult extends MilestoneResponse {
  matchedFields: string[];
  snippet?: string;
}

/**
 * Search milestones by query string
 * Searches in title, description, organization, tags, and contributors
 */
export async function search(
  options: SearchOptions
): Promise<{ results: SearchResult[]; total: number }> {
  const { query, skip, limit } = options;
  const searchTerm = query.toLowerCase().trim();

  if (!searchTerm) {
    return { results: [], total: 0 };
  }

  // SQLite uses LIKE for text search
  const allMilestones = await prisma.milestone.findMany({
    where: {
      OR: [
        { title: { contains: searchTerm } },
        { description: { contains: searchTerm } },
        { organization: { contains: searchTerm } },
        { tags: { contains: searchTerm } },
        { contributors: { contains: searchTerm } },
      ],
    },
    orderBy: { date: 'desc' },
  });

  // Score and enhance results with match info
  const scoredResults = allMilestones.map((m) => {
    const record = m as MilestoneRecord;
    const formatted = formatMilestoneResponse(record);
    const matchedFields: string[] = [];
    let score = 0;

    // Check which fields matched and assign scores
    if (record.title.toLowerCase().includes(searchTerm)) {
      matchedFields.push('title');
      score += 10; // Title matches are most important
    }
    if (record.description.toLowerCase().includes(searchTerm)) {
      matchedFields.push('description');
      score += 5;
    }
    if (record.organization?.toLowerCase().includes(searchTerm)) {
      matchedFields.push('organization');
      score += 3;
    }
    if (record.tags.toLowerCase().includes(searchTerm)) {
      matchedFields.push('tags');
      score += 2;
    }
    if (record.contributors.toLowerCase().includes(searchTerm)) {
      matchedFields.push('contributors');
      score += 2;
    }

    // Create snippet from description
    let snippet: string | undefined;
    const descLower = record.description.toLowerCase();
    const matchIndex = descLower.indexOf(searchTerm);
    if (matchIndex !== -1) {
      const start = Math.max(0, matchIndex - 50);
      const end = Math.min(record.description.length, matchIndex + searchTerm.length + 50);
      snippet = (start > 0 ? '...' : '') +
        record.description.slice(start, end) +
        (end < record.description.length ? '...' : '');
    }

    return {
      ...formatted,
      matchedFields,
      snippet,
      _score: score,
    };
  });

  // Sort by score (descending)
  scoredResults.sort((a, b) => b._score - a._score);

  // Paginate
  const paginatedResults = scoredResults.slice(skip, skip + limit);

  // Remove internal score field
  const results = paginatedResults.map(({ _score, ...rest }) => rest);

  return {
    results,
    total: scoredResults.length,
  };
}

/**
 * Get milestones with advanced filtering
 */
export async function getFiltered(
  filters: FilterOptions,
  options: PaginationOptions
): Promise<PaginatedResult> {
  const where: Record<string, unknown> = {};

  // Category filter
  if (filters.categories && filters.categories.length > 0) {
    where.category = { in: filters.categories };
  }

  // Significance filter
  if (filters.significanceLevels && filters.significanceLevels.length > 0) {
    where.significance = { in: filters.significanceLevels };
  }

  // Date range filter
  if (filters.dateStart || filters.dateEnd) {
    where.date = {};
    if (filters.dateStart) {
      (where.date as Record<string, Date>).gte = filters.dateStart;
    }
    if (filters.dateEnd) {
      (where.date as Record<string, Date>).lte = filters.dateEnd;
    }
  }

  const [milestones, total] = await Promise.all([
    prisma.milestone.findMany({
      where,
      skip: options.skip,
      take: options.limit,
      orderBy: { date: 'desc' },
    }),
    prisma.milestone.count({ where }),
  ]);

  // Filter by tags in application code (since tags is a JSON string)
  let filteredMilestones = milestones;
  if (filters.tags && filters.tags.length > 0) {
    filteredMilestones = milestones.filter((m) => {
      const milestoneTags = parseJsonArray<string>((m as MilestoneRecord).tags);
      return filters.tags!.some((tag) =>
        milestoneTags.some((t) => t.toLowerCase() === tag.toLowerCase())
      );
    });
  }

  return {
    milestones: filteredMilestones.map((m) => formatMilestoneResponse(m as MilestoneRecord)),
    total: filters.tags && filters.tags.length > 0 ? filteredMilestones.length : total,
  };
}

/**
 * Get all unique tags from milestones
 */
export async function getAllTags(): Promise<{ tag: string; count: number }[]> {
  const milestones = await prisma.milestone.findMany({
    select: { tags: true },
  });

  const tagCounts = new Map<string, number>();

  milestones.forEach((m) => {
    const tags = parseJsonArray<string>(m.tags as string);
    tags.forEach((tag) => {
      const normalizedTag = tag.trim();
      if (normalizedTag) {
        tagCounts.set(normalizedTag, (tagCounts.get(normalizedTag) || 0) + 1);
      }
    });
  });

  return Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Extended milestone response with optional layered content
 */
interface MilestoneResponseWithLayered extends MilestoneResponse {
  layeredContent?: MilestoneLayeredContent;
}

/**
 * Build layered content object if any fields are present
 * Returns undefined if no layered content fields are populated
 */
function buildLayeredContent(milestone: MilestoneRecord): MilestoneLayeredContent | undefined {
  // Check if any layered content field is present
  const hasLayeredContent =
    milestone.tldr ||
    milestone.simpleExplanation ||
    milestone.businessImpact ||
    milestone.technicalDepth ||
    milestone.historicalContext ||
    milestone.whyItMattersToday ||
    milestone.commonMisconceptions;

  if (!hasLayeredContent) {
    return undefined;
  }

  return {
    tldr: milestone.tldr || '',
    simpleExplanation: milestone.simpleExplanation || '',
    businessImpact: milestone.businessImpact || '',
    technicalDepth: milestone.technicalDepth || '',
    historicalContext: milestone.historicalContext || '',
    whyItMattersToday: milestone.whyItMattersToday || '',
    commonMisconceptions: milestone.commonMisconceptions || '',
  };
}

/**
 * Format a Prisma milestone record to API response format
 * Handles JSON string deserialization for array fields
 * Includes layered content if available
 */
function formatMilestoneResponse(milestone: MilestoneRecord): MilestoneResponseWithLayered {
  const response: MilestoneResponseWithLayered = {
    id: milestone.id,
    title: milestone.title,
    description: milestone.description,
    date: milestone.date.toISOString(),
    category: milestone.category as MilestoneCategory,
    significance: milestone.significance,
    era: milestone.era,
    organization: milestone.organization,
    contributors: parseJsonArray<string>(milestone.contributors),
    sourceUrl: milestone.sourceUrl,
    imageUrl: milestone.imageUrl,
    tags: parseJsonArray<string>(milestone.tags),
    sources: parseJsonArray<Source>(milestone.sources),
    createdAt: milestone.createdAt.toISOString(),
    updatedAt: milestone.updatedAt.toISOString(),
  };

  // Add layered content if any fields are populated
  const layeredContent = buildLayeredContent(milestone);
  if (layeredContent) {
    response.layeredContent = layeredContent;
  }

  return response;
}
