/**
 * Transcript Service - Extracts and formats YouTube video transcripts
 *
 * Uses the youtube-transcript package to fetch auto-generated or manual captions.
 * Cleans and formats transcripts for AI analysis.
 */

import type { TranscriptResponse } from 'youtube-transcript';
import { YoutubeTranscript } from 'youtube-transcript';

/**
 * Transcript segment with timing
 */
export interface TranscriptSegment {
  text: string;
  offset: number; // Start time in ms
  duration: number; // Duration in ms
}

/**
 * Full transcript with metadata
 */
export interface Transcript {
  videoId: string;
  language: string;
  segments: TranscriptSegment[];
  fullText: string;
  wordCount: number;
}

/**
 * Transcript extraction result
 */
export interface TranscriptResult {
  success: boolean;
  transcript?: Transcript;
  error?: string;
}

/**
 * Maximum transcript length in characters (about 50k words)
 * Longer transcripts will be truncated intelligently
 */
const MAX_TRANSCRIPT_LENGTH = 200000;

/**
 * Transcript Service
 */
class TranscriptService {
  /**
   * Get transcript for a video
   */
  async getTranscript(videoId: string, preferredLang = 'en'): Promise<TranscriptResult> {
    try {
      // Fetch transcript segments
      const segments = await YoutubeTranscript.fetchTranscript(videoId, {
        lang: preferredLang,
      });

      if (!segments || segments.length === 0) {
        return {
          success: false,
          error: 'No transcript available for this video',
        };
      }

      // Convert to our format
      const transcriptSegments: TranscriptSegment[] = segments.map((seg: TranscriptResponse) => ({
        text: seg.text,
        offset: seg.offset,
        duration: seg.duration,
      }));

      // Format the full text
      const fullText = this.formatTranscript(transcriptSegments);
      const wordCount = fullText.split(/\s+/).length;

      return {
        success: true,
        transcript: {
          videoId,
          language: preferredLang,
          segments: transcriptSegments,
          fullText,
          wordCount,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      // Common error cases
      if (message.includes('Could not find captions')) {
        return {
          success: false,
          error: 'No captions available for this video',
        };
      }

      if (message.includes('Video unavailable')) {
        return {
          success: false,
          error: 'Video is unavailable or private',
        };
      }

      return {
        success: false,
        error: `Failed to fetch transcript: ${message}`,
      };
    }
  }

  /**
   * Check if transcript is available for a video
   */
  async hasTranscript(videoId: string): Promise<boolean> {
    const result = await this.getTranscript(videoId);
    return result.success;
  }

  /**
   * Format transcript segments into readable text
   * Cleans up auto-generated artifacts and normalizes spacing
   */
  formatTranscript(segments: TranscriptSegment[]): string {
    let text = segments
      .map((seg) => seg.text)
      .join(' ')
      // Remove common transcript artifacts
      .replace(/\[Music\]/gi, '')
      .replace(/\[Applause\]/gi, '')
      .replace(/\[Laughter\]/gi, '')
      .replace(/\[.*?\]/g, '') // Remove any [bracketed] text
      .replace(/♪.*?♪/g, '') // Remove music notes
      // Clean up whitespace
      .replace(/\s+/g, ' ')
      .trim();

    // Truncate if too long
    if (text.length > MAX_TRANSCRIPT_LENGTH) {
      text = this.truncateIntelligently(text, MAX_TRANSCRIPT_LENGTH);
    }

    // Add paragraph breaks at natural points for readability
    text = this.addParagraphBreaks(text);

    return text;
  }

  /**
   * Truncate text at a sentence boundary
   */
  private truncateIntelligently(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;

    // Find last sentence boundary before maxLength
    const truncated = text.substring(0, maxLength);
    const lastPeriod = truncated.lastIndexOf('.');
    const lastQuestion = truncated.lastIndexOf('?');
    const lastExclaim = truncated.lastIndexOf('!');

    const lastSentence = Math.max(lastPeriod, lastQuestion, lastExclaim);

    if (lastSentence > maxLength * 0.8) {
      return truncated.substring(0, lastSentence + 1) + '\n\n[Transcript truncated...]';
    }

    return truncated + '... [Transcript truncated]';
  }

  /**
   * Add paragraph breaks at natural points
   */
  private addParagraphBreaks(text: string): string {
    // Split on multiple sentence-ending punctuation followed by space
    const sentences = text.split(/(?<=[.!?])\s+/);
    const paragraphs: string[] = [];
    let currentParagraph: string[] = [];

    for (const sentence of sentences) {
      currentParagraph.push(sentence);

      // Create paragraph every 5-7 sentences or at topic shifts
      if (currentParagraph.length >= 6) {
        paragraphs.push(currentParagraph.join(' '));
        currentParagraph = [];
      }
    }

    // Don't forget remaining sentences
    if (currentParagraph.length > 0) {
      paragraphs.push(currentParagraph.join(' '));
    }

    return paragraphs.join('\n\n');
  }

  /**
   * Get a short preview of the transcript (first ~500 words)
   */
  getPreview(transcript: Transcript, maxWords = 500): string {
    const words = transcript.fullText.split(/\s+/);
    if (words.length <= maxWords) {
      return transcript.fullText;
    }

    return words.slice(0, maxWords).join(' ') + '...';
  }
}

// Export singleton
export const transcriptService = new TranscriptService();
