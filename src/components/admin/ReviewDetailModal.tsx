import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ExternalLink,
  CheckCircle,
  XCircle,
  Save,
  Loader2,
  Newspaper,
  Trophy,
  BookOpen,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { reviewApi, type DraftWithArticle } from '../../services/api';

interface ReviewDetailModalProps {
  draft: DraftWithArticle;
  onClose: () => void;
  onSave: () => void;
}

/**
 * Modal for viewing and editing draft content before approval
 */
export function ReviewDetailModal({ draft, onClose, onSave }: ReviewDetailModalProps) {
  const [draftData, setDraftData] = useState<Record<string, unknown>>(
    draft.draftData as Record<string, unknown>
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleFieldChange = (field: string, value: unknown) => {
    setDraftData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleArrayFieldChange = (field: string, value: string) => {
    // Split by comma and trim whitespace
    const items = value.split(',').map((s) => s.trim()).filter(Boolean);
    handleFieldChange(field, items);
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      await reviewApi.updateDraft(draft.id, draftData);
      toast.success('Draft saved');
    } catch (error) {
      console.error('Failed to save draft:', error);
      toast.error('Failed to save draft');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      // Save first if there are changes
      await reviewApi.updateDraft(draft.id, draftData);
      const result = await reviewApi.approve(draft.id);
      toast.success(`Published successfully! ID: ${result.publishedId}`);
      onSave();
    } catch (error) {
      console.error('Failed to approve draft:', error);
      toast.error('Failed to publish draft');
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    setIsRejecting(true);
    try {
      await reviewApi.reject(draft.id, rejectionReason || undefined);
      toast.success('Draft rejected');
      onSave();
    } catch (error) {
      console.error('Failed to reject draft:', error);
      toast.error('Failed to reject draft');
    } finally {
      setIsRejecting(false);
    }
  };

  const getContentTypeIcon = () => {
    switch (draft.contentType) {
      case 'news_event':
        return <Newspaper className="h-5 w-5 text-blue-500" />;
      case 'milestone':
        return <Trophy className="h-5 w-5 text-purple-500" />;
      case 'glossary_term':
        return <BookOpen className="h-5 w-5 text-green-500" />;
      default:
        return null;
    }
  };

  const renderNewsEventFields = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Headline</label>
        <input
          type="text"
          value={(draftData.headline as string) || ''}
          onChange={(e) => handleFieldChange('headline', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
        <textarea
          value={(draftData.summary as string) || ''}
          onChange={(e) => handleFieldChange('summary', e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Prerequisite Milestones (comma-separated IDs)
        </label>
        <input
          type="text"
          value={((draftData.prerequisiteMilestoneIds as string[]) || []).join(', ')}
          onChange={(e) => handleArrayFieldChange('prerequisiteMilestoneIds', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="E2017_TRANSFORMER, E2022_CHATGPT"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Connection Explanation</label>
        <textarea
          value={(draftData.connectionExplanation as string) || ''}
          onChange={(e) => handleFieldChange('connectionExplanation', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="featured"
          checked={(draftData.featured as boolean) || false}
          onChange={(e) => handleFieldChange('featured', e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="featured" className="text-sm font-medium text-gray-700">
          Featured (highlight on news page)
        </label>
      </div>
    </div>
  );

  const renderMilestoneFields = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
        <input
          type="text"
          value={(draftData.title as string) || ''}
          onChange={(e) => handleFieldChange('title', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={(draftData.description as string) || ''}
          onChange={(e) => handleFieldChange('description', e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            value={(draftData.date as string) || ''}
            onChange={(e) => handleFieldChange('date', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            value={(draftData.category as string) || ''}
            onChange={(e) => handleFieldChange('category', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="research">Research</option>
            <option value="model_release">Model Release</option>
            <option value="breakthrough">Breakthrough</option>
            <option value="product">Product</option>
            <option value="regulation">Regulation</option>
            <option value="industry">Industry</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Significance</label>
          <select
            value={String((draftData.significance as number) || 2)}
            onChange={(e) => handleFieldChange('significance', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="1">1 - Minor</option>
            <option value="2">2 - Moderate</option>
            <option value="3">3 - Major</option>
            <option value="4">4 - Groundbreaking</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
          <input
            type="text"
            value={(draftData.organization as string) || ''}
            onChange={(e) => handleFieldChange('organization', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
        <input
          type="text"
          value={((draftData.tags as string[]) || []).join(', ')}
          onChange={(e) => handleArrayFieldChange('tags', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="llm, transformer, openai"
        />
      </div>
    </div>
  );

  const renderGlossaryFields = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
        <input
          type="text"
          value={(draftData.term as string) || ''}
          onChange={(e) => handleFieldChange('term', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Short Definition</label>
        <input
          type="text"
          value={(draftData.shortDefinition as string) || ''}
          onChange={(e) => handleFieldChange('shortDefinition', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Full Definition</label>
        <textarea
          value={(draftData.fullDefinition as string) || ''}
          onChange={(e) => handleFieldChange('fullDefinition', e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
        <input
          type="text"
          value={(draftData.category as string) || ''}
          onChange={(e) => handleFieldChange('category', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
    </div>
  );

  const renderFields = () => {
    switch (draft.contentType) {
      case 'news_event':
        return renderNewsEventFields();
      case 'milestone':
        return renderMilestoneFields();
      case 'glossary_term':
        return renderGlossaryFields();
      default:
        return <p className="text-gray-500">Unknown content type</p>;
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-xl shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {getContentTypeIcon()}
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Review: {draft.contentType === 'news_event' ? 'News Event' :
                        draft.contentType === 'milestone' ? 'Milestone' : 'Glossary Term'}
              </h2>
              <p className="text-sm text-gray-500">{draft.article.source.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
            {/* Original Article */}
            <div className="p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                Original Article
              </h3>
              <h4 className="text-lg font-medium text-gray-900 mb-2">{draft.article.title}</h4>
              <p className="text-sm text-gray-500 mb-4">
                {new Date(draft.article.publishedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              <div className="prose prose-sm max-w-none text-gray-700 max-h-[400px] overflow-y-auto pr-2">
                {draft.article.content.split('\n').map((paragraph, i) => (
                  <p key={i} className="mb-2">{paragraph}</p>
                ))}
              </div>
              <a
                href={draft.article.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-4 text-sm text-blue-600 hover:text-blue-700"
              >
                <ExternalLink className="h-4 w-4" />
                Read full article
              </a>
            </div>

            {/* Draft Content */}
            <div className="p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                Draft Content
              </h3>
              {renderFields()}
            </div>
          </div>

          {/* AI Rationale */}
          {draft.article.milestoneRationale && (
            <div className="px-6 py-4 bg-blue-50 border-t border-blue-100">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-700">AI Rationale</p>
                  <p className="text-sm text-blue-600">{draft.article.milestoneRationale}</p>
                </div>
              </div>
            </div>
          )}

          {/* Rejection Reason Input */}
          <div className="px-6 py-4 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rejection Note (optional)
            </label>
            <input
              type="text"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Reason for rejecting this draft..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={handleReject}
              disabled={isRejecting}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                isRejecting
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'text-red-600 bg-red-50 hover:bg-red-100'
              }`}
            >
              {isRejecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              Reject
            </button>
            <button
              onClick={handleSaveDraft}
              disabled={isSaving}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                isSaving
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Draft
            </button>
            <button
              onClick={handleApprove}
              disabled={isApproving}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                isApproving
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isApproving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Approve & Publish
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ReviewDetailModal;
