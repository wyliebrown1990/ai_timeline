import { useState, useEffect, useCallback } from 'react';

interface AnimatedTitleProps {
  className?: string;
  /** Delay before animation starts (ms) */
  startDelay?: number;
  /** Speed of typing (ms per character) */
  typeSpeed?: number;
  /** Callback when animation completes */
  onComplete?: () => void;
}

/**
 * Animated title component for the homepage hero
 *
 * Animation sequence:
 * 1. Types "The History of Intelligence" letter by letter
 * 2. Pauses briefly
 * 3. Inserts "Artificial " before "Intelligence", letter by letter
 *
 * The insertion pushes existing text naturally as each letter appears.
 */
export function AnimatedTitle({
  className = '',
  startDelay = 800,
  typeSpeed = 50,
  onComplete,
}: AnimatedTitleProps) {
  // Phase 1: "The History of Intelligence"
  // Phase 2: Insert "Artificial " before "Intelligence"
  const [phase, setPhase] = useState<0 | 1 | 2>(0); // 0 = waiting, 1 = typing initial, 2 = inserting "Artificial "
  const [charIndex, setCharIndex] = useState(0);
  const [artificialIndex, setArtificialIndex] = useState(0);

  const initialText = 'The History of Intelligence';
  const artificialWord = 'Artificial ';
  const insertPosition = 15; // After "The History of "

  // Start animation after delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setPhase(1);
    }, startDelay);
    return () => clearTimeout(timer);
  }, [startDelay]);

  // Phase 1: Type initial text
  useEffect(() => {
    if (phase !== 1) return;

    if (charIndex < initialText.length) {
      const timer = setTimeout(() => {
        setCharIndex((prev) => prev + 1);
      }, typeSpeed);
      return () => clearTimeout(timer);
    } else {
      // Done typing initial text, pause then start phase 2
      const timer = setTimeout(() => {
        setPhase(2);
      }, 500); // Pause before inserting "Artificial"
      return () => clearTimeout(timer);
    }
  }, [phase, charIndex, typeSpeed]);

  // Phase 2: Insert "Artificial "
  useEffect(() => {
    if (phase !== 2) return;

    if (artificialIndex < artificialWord.length) {
      const timer = setTimeout(() => {
        setArtificialIndex((prev) => prev + 1);
      }, typeSpeed);
      return () => clearTimeout(timer);
    } else {
      // Animation complete
      onComplete?.();
    }
  }, [phase, artificialIndex, typeSpeed, onComplete]);

  // Build the displayed text
  const buildText = useCallback(() => {
    if (phase === 0) {
      // Show cursor only
      return { before: '', artificial: '', after: '', showCursor: true };
    }

    if (phase === 1) {
      // Typing "The History of Intelligence"
      const visibleText = initialText.slice(0, charIndex);
      return {
        before: visibleText,
        artificial: '',
        after: '',
        showCursor: true,
      };
    }

    // Phase 2: Inserting "Artificial " into the middle
    const beforeInsert = initialText.slice(0, insertPosition); // "The History of "
    const afterInsert = initialText.slice(insertPosition); // "Intelligence"
    const visibleArtificial = artificialWord.slice(0, artificialIndex);

    return {
      before: beforeInsert,
      artificial: visibleArtificial,
      after: afterInsert,
      showCursor: artificialIndex < artificialWord.length,
    };
  }, [phase, charIndex, artificialIndex]);

  const { before, artificial, after, showCursor } = buildText();

  return (
    <h1 className={className}>
      <span className="text-gray-900 dark:text-white">{before}</span>
      {artificial && (
        <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
          {artificial}
        </span>
      )}
      {showCursor && phase === 2 && (
        <span
          className="inline-block w-[3px] h-[1em] bg-orange-500 ml-[1px] animate-pulse align-middle"
          style={{ verticalAlign: 'text-bottom' }}
        />
      )}
      <span className="text-gray-900 dark:text-white">{after}</span>
      {showCursor && phase === 1 && (
        <span
          className="inline-block w-[3px] h-[1em] bg-gray-900 dark:bg-white ml-[1px] animate-pulse"
          style={{ verticalAlign: 'text-bottom' }}
        />
      )}
    </h1>
  );
}
