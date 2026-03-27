/**
 * QuizShareCard - Generates a shareable image of quiz results
 *
 * Uses Canvas API to draw a styled results card directly,
 * then copies to clipboard or downloads as PNG.
 */

import { useState, useCallback } from 'react';
import { Download, Check, Share2 } from 'lucide-react';
import type { NewsQuiz, QuizResult } from '../../services/api';

interface QuizShareCardProps {
  quiz: NewsQuiz;
  results: QuizResult[];
  score: { score: number; total: number; percentage: number };
  weekStart: string;
  weekEnd: string;
  answers: Map<number, number>;
}

function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getScoreLabel(percentage: number): string {
  if (percentage === 100) return 'Perfect!';
  if (percentage >= 80) return 'Great!';
  if (percentage >= 60) return 'Good!';
  if (percentage >= 40) return 'Not bad!';
  return 'Keep learning!';
}

function getGradientColors(percentage: number): [string, string] {
  if (percentage >= 80) return ['#10b981', '#047857'];
  if (percentage >= 60) return ['#f59e0b', '#b45309'];
  return ['#ef4444', '#b91c1c'];
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawCard(
  quiz: NewsQuiz,
  results: QuizResult[],
  score: { score: number; total: number; percentage: number },
  weekStart: string,
  weekEnd: string,
): HTMLCanvasElement {
  const scale = 2;
  const W = 480;
  const pad = 28;
  const questionRowH = 44;
  const headerH = 160;
  const questionsTopPad = 20;
  const questionsBottomPad = 12;
  const footerH = 48;
  const questionsH = questionsTopPad + quiz.questions.length * questionRowH + questionsBottomPad;
  const H = headerH + questionsH + footerH;

  const canvas = document.createElement('canvas');
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);

  // Background with rounded corners
  const bgRadius = 20;
  roundRect(ctx, 0, 0, W, H, bgRadius);
  ctx.fillStyle = '#0f172a';
  ctx.fill();
  ctx.save();
  ctx.clip();

  // --- Header gradient ---
  const [gradStart, gradEnd] = getGradientColors(score.percentage);
  const headerGrad = ctx.createLinearGradient(0, 0, W, headerH);
  headerGrad.addColorStop(0, gradStart);
  headerGrad.addColorStop(1, gradEnd);
  ctx.fillStyle = headerGrad;
  ctx.fillRect(0, 0, W, headerH);

  // Brain icon box
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  roundRect(ctx, pad, 24, 30, 30, 6);
  ctx.fill();
  ctx.font = '15px sans-serif';
  ctx.fillStyle = 'white';
  ctx.fillText('\u{1F9E0}', pad + 7, 45);

  // "AI News Quiz" label
  ctx.font = '500 14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText('AI News Quiz', pad + 38, 44);

  // Week dates (right-aligned)
  const dateStr = `${formatDateShort(weekStart)} - ${formatDateShort(weekEnd)}`;
  ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  const dateWidth = ctx.measureText(dateStr).width;
  ctx.fillText(dateStr, W - pad - dateWidth, 44);

  // Big score
  ctx.font = '800 52px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillStyle = 'white';
  const scoreStr = `${score.score}/${score.total}`;
  ctx.fillText(scoreStr, pad, 102);

  // Score label
  const scoreWidth = ctx.measureText(scoreStr).width;
  ctx.font = '600 20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(getScoreLabel(score.percentage), pad + scoreWidth + 12, 98);

  // Progress bar
  const barY = 120;
  const barH = 8;
  const barW = W - pad * 2;
  roundRect(ctx, pad, barY, barW, barH, 4);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fill();

  const fillW = Math.max(barH, (score.percentage / 100) * barW);
  roundRect(ctx, pad, barY, fillW, barH, 4);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fill();

  // --- Questions list ---
  let y = headerH + questionsTopPad;
  quiz.questions.forEach((question, index) => {
    const result = results[index];
    if (!result) return;
    const isCorrect = result.correct;

    // Circle indicator
    const circleX = pad + 14;
    const circleY = y + questionRowH / 2;
    ctx.beginPath();
    ctx.arc(circleX, circleY, 13, 0, Math.PI * 2);
    ctx.fillStyle = isCorrect ? '#22c55e' : '#ef4444';
    ctx.fill();

    // Checkmark or X
    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText(isCorrect ? '\u2713' : '\u2717', circleX, circleY + 5);
    ctx.textAlign = 'left';

    // Question number
    const textX = pad + 38;
    ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(`Q${index + 1}`, textX, y + 16);

    // Headline (truncated)
    const maxTextW = W - textX - pad;
    let headline = question.newsHeadline;
    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    while (ctx.measureText(headline).width > maxTextW && headline.length > 3) {
      headline = headline.slice(0, -4) + '...';
    }
    ctx.fillText(headline, textX, y + 34);

    // Divider line
    if (index < quiz.questions.length - 1) {
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad, y + questionRowH);
      ctx.lineTo(W - pad, y + questionRowH);
      ctx.stroke();
    }

    y += questionRowH;
  });

  // --- Footer ---
  const footerY = headerH + questionsH;
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, footerY);
  ctx.lineTo(W - pad, footerY);
  ctx.stroke();

  ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillText('letaiexplainai.com/news/quiz', pad, footerY + 28);

  const ctaText = 'Can you beat my score?';
  const ctaWidth = ctx.measureText(ctaText).width;
  ctx.fillText(ctaText, W - pad - ctaWidth, footerY + 28);

  ctx.restore();
  return canvas;
}

export function QuizShareCard({ quiz, results, score, weekStart, weekEnd }: QuizShareCardProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateImage = useCallback(async (): Promise<Blob | null> => {
    const canvas = drawCard(quiz, results, score, weekStart, weekEnd);
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  }, [quiz, results, score, weekStart, weekEnd]);

  const handleCopyImage = useCallback(async () => {
    setIsGenerating(true);
    try {
      const blob = await generateImage();
      if (!blob) return;

      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('[QuizShareCard] Copy to clipboard failed, downloading instead:', err);
      const blob = await generateImage();
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ai-quiz-${formatDateShort(weekStart).replace(/\s/g, '-')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } finally {
      setIsGenerating(false);
    }
  }, [generateImage, weekStart]);

  const handleDownload = useCallback(async () => {
    setIsGenerating(true);
    try {
      const blob = await generateImage();
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ai-quiz-${formatDateShort(weekStart).replace(/\s/g, '-')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setIsGenerating(false);
    }
  }, [generateImage, weekStart]);

  return (
    <div className="flex gap-3">
      <button
        onClick={handleCopyImage}
        disabled={isGenerating}
        className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 border-2 border-indigo-200 dark:border-indigo-800 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors disabled:opacity-50"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4" />
            Image Copied! Paste to share
          </>
        ) : (
          <>
            <Share2 className="w-4 h-4" />
            {isGenerating ? 'Generating...' : 'Share Results'}
          </>
        )}
      </button>
      <button
        onClick={handleDownload}
        disabled={isGenerating}
        className="inline-flex items-center gap-2 px-4 py-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
        title="Save as image"
      >
        <Download className="w-4 h-4" />
      </button>
    </div>
  );
}
