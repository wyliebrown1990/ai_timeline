/**
 * Affiliations Service
 * Sprint KPC-1 - Key People & Companies
 *
 * Database operations for managing affiliations (person-org relationships).
 */

import { prisma } from '../db';
import type { Affiliation, Organization, Person } from '@prisma/client';

/**
 * Create affiliation DTO
 */
export interface CreateAffiliationDto {
  personId: string;
  orgId: string;
  role: string;
  startDate?: Date | string;
  endDate?: Date | string;
  isCurrent?: boolean;
  notes?: string;
}

/**
 * Update affiliation DTO
 */
export interface UpdateAffiliationDto {
  role?: string;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  isCurrent?: boolean;
  notes?: string | null;
}

/**
 * Get all affiliations for a person (career history)
 */
export async function getByPerson(personId: string): Promise<Array<Affiliation & { organization: Organization }>> {
  if (!prisma) throw new Error('Database not available');

  return prisma.affiliation.findMany({
    where: { personId },
    include: {
      organization: true,
    },
    orderBy: [
      { isCurrent: 'desc' },
      { endDate: 'desc' },
      { startDate: 'desc' },
    ],
  });
}

/**
 * Get all affiliations for an organization (people associated)
 */
export async function getByOrg(orgId: string): Promise<Array<Affiliation & { person: Person }>> {
  if (!prisma) throw new Error('Database not available');

  return prisma.affiliation.findMany({
    where: { orgId },
    include: {
      person: true,
    },
    orderBy: [
      { isCurrent: 'desc' },
      { startDate: 'desc' },
    ],
  });
}

/**
 * Get current employees of an organization
 */
export async function getCurrentByOrg(orgId: string): Promise<Array<Affiliation & { person: Person }>> {
  if (!prisma) throw new Error('Database not available');

  return prisma.affiliation.findMany({
    where: { orgId, isCurrent: true },
    include: {
      person: true,
    },
    orderBy: {
      person: {
        canonicalName: 'asc',
      },
    },
  });
}

/**
 * Get a single affiliation by ID
 */
export async function getById(id: string): Promise<Affiliation | null> {
  if (!prisma) throw new Error('Database not available');

  return prisma.affiliation.findUnique({
    where: { id },
    include: {
      person: true,
      organization: true,
    },
  });
}

/**
 * Create a new affiliation
 */
export async function create(data: CreateAffiliationDto): Promise<Affiliation> {
  if (!prisma) throw new Error('Database not available');

  // If this is marked as current, update Person's currentOrgId
  if (data.isCurrent) {
    await prisma.person.update({
      where: { id: data.personId },
      data: {
        currentOrgId: data.orgId,
        currentRole: data.role,
      },
    });
  }

  return prisma.affiliation.create({
    data: {
      personId: data.personId,
      orgId: data.orgId,
      role: data.role,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      isCurrent: data.isCurrent ?? false,
      notes: data.notes ?? null,
    },
    include: {
      person: true,
      organization: true,
    },
  });
}

/**
 * Update an existing affiliation
 */
export async function update(id: string, data: UpdateAffiliationDto): Promise<Affiliation | null> {
  if (!prisma) throw new Error('Database not available');

  // Get current affiliation to check if we need to update Person
  const current = await prisma.affiliation.findUnique({
    where: { id },
  });

  if (!current) return null;

  const updateData: Record<string, unknown> = {};

  if (data.role !== undefined) updateData.role = data.role;
  if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null;
  if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
  if (data.isCurrent !== undefined) updateData.isCurrent = data.isCurrent;
  if (data.notes !== undefined) updateData.notes = data.notes;

  try {
    const updated = await prisma.affiliation.update({
      where: { id },
      data: updateData,
      include: {
        person: true,
        organization: true,
      },
    });

    // If isCurrent changed, update Person's currentOrgId
    if (data.isCurrent !== undefined && data.isCurrent !== current.isCurrent) {
      if (data.isCurrent) {
        // Mark as current - update Person
        await prisma.person.update({
          where: { id: current.personId },
          data: {
            currentOrgId: current.orgId,
            currentRole: data.role ?? current.role,
          },
        });
      } else {
        // No longer current - check if Person's currentOrgId matches this org
        const person = await prisma.person.findUnique({
          where: { id: current.personId },
        });
        if (person?.currentOrgId === current.orgId) {
          // Find another current affiliation, if any
          const otherCurrent = await prisma.affiliation.findFirst({
            where: {
              personId: current.personId,
              isCurrent: true,
              id: { not: id },
            },
          });
          if (otherCurrent) {
            await prisma.person.update({
              where: { id: current.personId },
              data: {
                currentOrgId: otherCurrent.orgId,
                currentRole: otherCurrent.role,
              },
            });
          } else {
            await prisma.person.update({
              where: { id: current.personId },
              data: {
                currentOrgId: null,
                currentRole: null,
              },
            });
          }
        }
      }
    }

    return updated;
  } catch {
    return null;
  }
}

/**
 * Delete an affiliation by ID
 */
export async function remove(id: string): Promise<boolean> {
  if (!prisma) throw new Error('Database not available');

  try {
    // Get affiliation before deleting to potentially update Person
    const affiliation = await prisma.affiliation.findUnique({
      where: { id },
    });

    if (!affiliation) return false;

    await prisma.affiliation.delete({
      where: { id },
    });

    // If this was the current affiliation, update Person
    if (affiliation.isCurrent) {
      const person = await prisma.person.findUnique({
        where: { id: affiliation.personId },
      });
      if (person?.currentOrgId === affiliation.orgId) {
        // Find another current affiliation, if any
        const otherCurrent = await prisma.affiliation.findFirst({
          where: {
            personId: affiliation.personId,
            isCurrent: true,
          },
        });
        if (otherCurrent) {
          await prisma.person.update({
            where: { id: affiliation.personId },
            data: {
              currentOrgId: otherCurrent.orgId,
              currentRole: otherCurrent.role,
            },
          });
        } else {
          await prisma.person.update({
            where: { id: affiliation.personId },
            data: {
              currentOrgId: null,
              currentRole: null,
            },
          });
        }
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Set an affiliation as the current one (and unset any others)
 */
export async function setAsCurrent(id: string): Promise<Affiliation | null> {
  if (!prisma) throw new Error('Database not available');

  const affiliation = await prisma.affiliation.findUnique({
    where: { id },
  });

  if (!affiliation) return null;

  // Unset any other current affiliations for this person
  await prisma.affiliation.updateMany({
    where: {
      personId: affiliation.personId,
      isCurrent: true,
      id: { not: id },
    },
    data: {
      isCurrent: false,
    },
  });

  // Set this one as current
  const updated = await prisma.affiliation.update({
    where: { id },
    data: { isCurrent: true },
    include: {
      person: true,
      organization: true,
    },
  });

  // Update Person's currentOrgId
  await prisma.person.update({
    where: { id: affiliation.personId },
    data: {
      currentOrgId: affiliation.orgId,
      currentRole: affiliation.role,
    },
  });

  return updated;
}

/**
 * Bulk create affiliations from career history data
 */
export async function createBulk(
  personId: string,
  affiliations: Array<Omit<CreateAffiliationDto, 'personId'>>
): Promise<{ created: number; errors: string[] }> {
  if (!prisma) throw new Error('Database not available');

  let created = 0;
  const errors: string[] = [];

  for (const affData of affiliations) {
    try {
      await create({ ...affData, personId });
      created++;
    } catch (error) {
      errors.push(`Failed to create affiliation for org ${affData.orgId}: ${error}`);
    }
  }

  return { created, errors };
}

/**
 * Get count of affiliations
 */
export async function getCount(): Promise<number> {
  if (!prisma) throw new Error('Database not available');

  return prisma.affiliation.count();
}

/**
 * Get count of current affiliations by organization
 */
export async function getCurrentCountByOrg(): Promise<Array<{ orgId: string; orgName: string; count: number }>> {
  if (!prisma) throw new Error('Database not available');

  const orgs = await prisma.organization.findMany({
    where: { status: 'published' },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          affiliations: {
            where: { isCurrent: true },
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  return orgs.map((org) => ({
    orgId: org.id,
    orgName: org.name,
    count: org._count.affiliations,
  }));
}
