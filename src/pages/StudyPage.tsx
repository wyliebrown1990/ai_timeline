/**
 * StudyPage - Main Study Center
 *
 * Entry point for the flashcard study system. Displays user's flashcard packs,
 * due card count, streak information, and provides access to study sessions.
 */

import { StudyDashboard } from '../components/Flashcards';

/**
 * Main Study Center page component.
 * Renders the study dashboard where users can view their flashcard packs,
 * see cards due for review, and start study sessions.
 */
function StudyPage() {
  return (
    <div className="container-main py-6 md:py-8">
      <StudyDashboard />
    </div>
  );
}

export { StudyPage };
export default StudyPage;
