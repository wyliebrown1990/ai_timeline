/**
 * PackDetailPage - Flashcard Pack Management
 *
 * Displays all cards in a specific pack and provides management options
 * like editing pack name, deleting cards, and starting a study session.
 */

import { useParams, Navigate } from 'react-router-dom';
import { PackManager } from '../components/Flashcards';

/**
 * Pack detail and management page component.
 * Shows all cards in the pack with options to manage them.
 */
function PackDetailPage() {
  const { packId } = useParams<{ packId: string }>();

  // Redirect to study center if no packId provided
  if (!packId) {
    return <Navigate to="/study" replace />;
  }

  return (
    <div className="container-main py-6 md:py-8">
      <PackManager packId={packId} />
    </div>
  );
}

export { PackDetailPage };
export default PackDetailPage;
