/**
 * Pipeline Settings Service
 *
 * Manages global pipeline control settings like pause/resume states.
 * Sprint 32.12 - Admin Controls
 */

import { prisma } from '../db';

/**
 * Pipeline settings structure
 */
export interface PipelineSettingsData {
  ingestionPaused: boolean;
  analysisPaused: boolean;
  lastIngestionRun: Date | null;
  lastAnalysisRun: Date | null;
  updatedAt: Date;
}

/**
 * Default settings ID (singleton pattern)
 */
const SETTINGS_ID = 'default';

/**
 * Get current pipeline settings
 * Creates default settings if they don't exist
 */
export async function getSettings(): Promise<PipelineSettingsData> {
  let settings = await prisma.pipelineSettings.findUnique({
    where: { id: SETTINGS_ID },
  });

  // Create default settings if they don't exist
  if (!settings) {
    settings = await prisma.pipelineSettings.create({
      data: {
        id: SETTINGS_ID,
        ingestionPaused: false,
        analysisPaused: false,
      },
    });
  }

  return {
    ingestionPaused: settings.ingestionPaused,
    analysisPaused: settings.analysisPaused,
    lastIngestionRun: settings.lastIngestionRun,
    lastAnalysisRun: settings.lastAnalysisRun,
    updatedAt: settings.updatedAt,
  };
}

/**
 * Check if ingestion is paused
 */
export async function isIngestionPaused(): Promise<boolean> {
  const settings = await getSettings();
  return settings.ingestionPaused;
}

/**
 * Check if analysis is paused
 */
export async function isAnalysisPaused(): Promise<boolean> {
  const settings = await getSettings();
  return settings.analysisPaused;
}

/**
 * Set ingestion pause state
 */
export async function setIngestionPaused(paused: boolean): Promise<PipelineSettingsData> {
  const settings = await prisma.pipelineSettings.upsert({
    where: { id: SETTINGS_ID },
    create: {
      id: SETTINGS_ID,
      ingestionPaused: paused,
      analysisPaused: false,
    },
    update: {
      ingestionPaused: paused,
    },
  });

  console.log(`[PipelineSettings] Ingestion ${paused ? 'paused' : 'resumed'}`);

  return {
    ingestionPaused: settings.ingestionPaused,
    analysisPaused: settings.analysisPaused,
    lastIngestionRun: settings.lastIngestionRun,
    lastAnalysisRun: settings.lastAnalysisRun,
    updatedAt: settings.updatedAt,
  };
}

/**
 * Set analysis pause state
 */
export async function setAnalysisPaused(paused: boolean): Promise<PipelineSettingsData> {
  const settings = await prisma.pipelineSettings.upsert({
    where: { id: SETTINGS_ID },
    create: {
      id: SETTINGS_ID,
      ingestionPaused: false,
      analysisPaused: paused,
    },
    update: {
      analysisPaused: paused,
    },
  });

  console.log(`[PipelineSettings] Analysis ${paused ? 'paused' : 'resumed'}`);

  return {
    ingestionPaused: settings.ingestionPaused,
    analysisPaused: settings.analysisPaused,
    lastIngestionRun: settings.lastIngestionRun,
    lastAnalysisRun: settings.lastAnalysisRun,
    updatedAt: settings.updatedAt,
  };
}

/**
 * Record when ingestion was last run
 */
export async function recordIngestionRun(): Promise<void> {
  await prisma.pipelineSettings.upsert({
    where: { id: SETTINGS_ID },
    create: {
      id: SETTINGS_ID,
      ingestionPaused: false,
      analysisPaused: false,
      lastIngestionRun: new Date(),
    },
    update: {
      lastIngestionRun: new Date(),
    },
  });
}

/**
 * Record when analysis was last run
 */
export async function recordAnalysisRun(): Promise<void> {
  await prisma.pipelineSettings.upsert({
    where: { id: SETTINGS_ID },
    create: {
      id: SETTINGS_ID,
      ingestionPaused: false,
      analysisPaused: false,
      lastAnalysisRun: new Date(),
    },
    update: {
      lastAnalysisRun: new Date(),
    },
  });
}
