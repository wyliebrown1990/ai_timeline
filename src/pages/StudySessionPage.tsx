/**
 * StudySessionPage - Active Study Session
 *
 * The page where users actively study their flashcards.
 * Accepts an optional packId parameter to study a specific pack,
 * or studies all due cards when no packId is provided.
 */

import { useParams } from 'react-router-dom';
import { StudySession } from '../components/Flashcards';

/**
 * Study session page component.
 * Displays the active flashcard review interface with card flipping
 * and rating buttons.
 */
function StudySessionPage() {
  const { packId } = useParams<{ packId?: string }>();

  return (
    <div className="container-main py-6 md:py-8">
      <StudySession packId={packId} />
    </div>
  );
}

export { StudySessionPage };
export default StudySessionPage;
