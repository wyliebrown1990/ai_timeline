import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { glossaryApi, type GlossaryCategory } from '../../services/api';
import { Loader2, Save, X, BookOpen } from 'lucide-react';

const CATEGORIES: Array<{ value: GlossaryCategory; label: string }> = [
  { value: 'core_concept', label: 'Core Concept' },
  { value: 'technical_term', label: 'Technical Term' },
  { value: 'business_term', label: 'Business Term' },
  { value: 'model_architecture', label: 'Model Architecture' },
  { value: 'company_product', label: 'Company/Product' },
];

/**
 * Admin page for creating glossary terms directly (bypassing AI pipeline)
 * Sprint 42: Quick Create Forms
 */
export function CreateGlossaryTermPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [term, setTerm] = useState('');
  const [shortDefinition, setShortDefinition] = useState('');
  const [fullDefinition, setFullDefinition] = useState('');
  const [businessContext, setBusinessContext] = useState('');
  const [category, setCategory] = useState<GlossaryCategory>('core_concept');
  const [relatedTermIds, setRelatedTermIds] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!term.trim()) {
      toast.error('Term is required');
      return;
    }
    if (!shortDefinition.trim()) {
      toast.error('Short definition is required');
      return;
    }
    if (shortDefinition.length > 200) {
      toast.error('Short definition must be under 200 characters');
      return;
    }
    if (!fullDefinition.trim()) {
      toast.error('Full definition is required');
      return;
    }
    if (fullDefinition.length > 2000) {
      toast.error('Full definition must be under 2000 characters');
      return;
    }
    if (businessContext && businessContext.length > 1000) {
      toast.error('Business context must be under 1000 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      // Parse related term IDs (comma-separated)
      const relatedIds = relatedTermIds
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);

      const newTerm = await glossaryApi.create({
        term: term.trim(),
        shortDefinition: shortDefinition.trim(),
        fullDefinition: fullDefinition.trim(),
        businessContext: businessContext.trim() || undefined,
        category,
        relatedTermIds: relatedIds.length > 0 ? relatedIds : undefined,
      });

      toast.success(`Glossary term "${newTerm.term}" created!`);
      navigate('/admin/glossary');
    } catch (error) {
      console.error('Create error:', error);
      if (error instanceof Error && error.message.includes('already exists')) {
        toast.error('A term with this name already exists');
      } else {
        toast.error('Failed to create glossary term');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div data-testid="create-glossary-term-page" className="max-w-3xl">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create Glossary Term</h1>
        <p className="mt-1 text-sm text-gray-500">
          Create a glossary term directly without AI analysis. For quick manual entries.
        </p>
      </div>

      {/* Form card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Term */}
          <div>
            <label htmlFor="term" className="block text-sm font-medium text-gray-700 mb-1">
              <BookOpen className="w-4 h-4 inline mr-1" />
              Term <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="term"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="e.g., Transformer, RLHF, Chain-of-Thought"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
              maxLength={100}
              required
              disabled={isSubmitting}
            />
            <p className="mt-1 text-xs text-gray-500">
              {term.length}/100 characters - Must be unique
            </p>
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as GlossaryCategory)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
              disabled={isSubmitting}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Short Definition */}
          <div>
            <label htmlFor="shortDefinition" className="block text-sm font-medium text-gray-700 mb-1">
              Short Definition <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="shortDefinition"
              value={shortDefinition}
              onChange={(e) => setShortDefinition(e.target.value)}
              placeholder="One-line definition for tooltips and quick reference"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
              maxLength={200}
              required
              disabled={isSubmitting}
            />
            <p className={`mt-1 text-xs ${shortDefinition.length > 180 ? 'text-orange-500' : 'text-gray-500'}`}>
              {shortDefinition.length}/200 characters
            </p>
          </div>

          {/* Full Definition */}
          <div>
            <label htmlFor="fullDefinition" className="block text-sm font-medium text-gray-700 mb-1">
              Full Definition <span className="text-red-500">*</span>
            </label>
            <textarea
              id="fullDefinition"
              value={fullDefinition}
              onChange={(e) => setFullDefinition(e.target.value)}
              placeholder="Detailed explanation of the term (2-3 sentences)..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
              maxLength={2000}
              required
              disabled={isSubmitting}
            />
            <p className={`mt-1 text-xs ${fullDefinition.length > 1800 ? 'text-orange-500' : 'text-gray-500'}`}>
              {fullDefinition.length}/2000 characters
            </p>
          </div>

          {/* Business Context */}
          <div>
            <label htmlFor="businessContext" className="block text-sm font-medium text-gray-700 mb-1">
              Business Context <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              id="businessContext"
              value={businessContext}
              onChange={(e) => setBusinessContext(e.target.value)}
              placeholder="Why this matters for business professionals..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
              maxLength={1000}
              disabled={isSubmitting}
            />
            <p className={`mt-1 text-xs ${businessContext.length > 900 ? 'text-orange-500' : 'text-gray-500'}`}>
              {businessContext.length}/1000 characters
            </p>
          </div>

          {/* Related Term IDs */}
          <div>
            <label htmlFor="relatedTermIds" className="block text-sm font-medium text-gray-700 mb-1">
              Related Term IDs <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              id="relatedTermIds"
              value={relatedTermIds}
              onChange={(e) => setRelatedTermIds(e.target.value)}
              placeholder="e.g., transformer, attention-mechanism, bert"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
              disabled={isSubmitting}
            />
            <p className="mt-1 text-xs text-gray-500">
              Comma-separated list of related term IDs (kebab-case)
            </p>
          </div>

          {/* Submit buttons */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Create Term
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate(-1)}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </form>
      </div>

      {/* Help text */}
      <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-100">
        <h3 className="text-sm font-medium text-green-900 mb-2">Tips</h3>
        <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
          <li>Term should be AI-specific (not general tech terms like "API")</li>
          <li>Short definition is shown in tooltips - keep it concise</li>
          <li>Full definition should explain the term in 2-3 clear sentences</li>
          <li>Business context helps non-technical readers understand relevance</li>
        </ul>
      </div>
    </div>
  );
}

export default CreateGlossaryTermPage;
