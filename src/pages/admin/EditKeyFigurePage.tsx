import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Sparkles, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  keyFiguresApi,
  type KeyFigure,
  type UpdateKeyFigureDto,
  type KeyFigureRole,
  type KeyFigureStatus,
} from '../../services/api';

// Role labels
const ROLE_OPTIONS: { value: KeyFigureRole; label: string }[] = [
  { value: 'researcher', label: 'Researcher' },
  { value: 'executive', label: 'Executive' },
  { value: 'founder', label: 'Founder' },
  { value: 'policy_maker', label: 'Policy Maker' },
  { value: 'engineer', label: 'Engineer' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS: { value: KeyFigureStatus; label: string }[] = [
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_review', label: 'Pending Review' },
];

export function EditKeyFigurePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingVariants, setIsGeneratingVariants] = useState(false);
  const [keyFigure, setKeyFigure] = useState<KeyFigure | null>(null);

  const [formData, setFormData] = useState<UpdateKeyFigureDto>({
    canonicalName: '',
    aliases: [],
    shortBio: '',
    fullBio: '',
    primaryOrg: '',
    previousOrgs: [],
    role: 'researcher',
    notableFor: '',
    imageUrl: '',
    wikipediaUrl: '',
    linkedInUrl: '',
    twitterHandle: '',
    status: 'published',
  });

  const [aliasInput, setAliasInput] = useState('');
  const [prevOrgInput, setPrevOrgInput] = useState('');

  const loadKeyFigure = useCallback(async () => {
    if (!id) return;

    try {
      const figure = await keyFiguresApi.getById(id);
      setKeyFigure(figure);
      setFormData({
        canonicalName: figure.canonicalName,
        aliases: figure.aliases,
        shortBio: figure.shortBio,
        fullBio: figure.fullBio || '',
        primaryOrg: figure.primaryOrg || '',
        previousOrgs: figure.previousOrgs,
        role: figure.role,
        notableFor: figure.notableFor,
        imageUrl: figure.imageUrl || '',
        wikipediaUrl: figure.wikipediaUrl || '',
        linkedInUrl: figure.linkedInUrl || '',
        twitterHandle: figure.twitterHandle || '',
        status: figure.status,
      });
    } catch (error) {
      toast.error('Failed to load key figure');
      console.error(error);
      navigate('/admin/key-figures');
    } finally {
      setIsLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadKeyFigure();
  }, [loadKeyFigure]);

  // Auto-generate name variants
  const handleGenerateVariants = async () => {
    if (!formData.canonicalName?.trim()) {
      toast.error('Enter a name first');
      return;
    }

    setIsGeneratingVariants(true);
    try {
      const result = await keyFiguresApi.generateVariants(formData.canonicalName);
      // Merge with existing aliases, avoiding duplicates
      const existingLower = formData.aliases?.map((a) => a.toLowerCase()) || [];
      const newAliases = result.variants.filter(
        (v) => !existingLower.includes(v.toLowerCase())
      );
      setFormData({
        ...formData,
        aliases: [...(formData.aliases || []), ...newAliases],
      });
      if (newAliases.length > 0) {
        toast.success(`Added ${newAliases.length} name variants`);
      } else {
        toast.success('No new variants to add');
      }
    } catch (error) {
      toast.error('Failed to generate variants');
      console.error(error);
    } finally {
      setIsGeneratingVariants(false);
    }
  };

  // Add alias
  const handleAddAlias = () => {
    const trimmed = aliasInput.trim();
    if (trimmed && !formData.aliases?.includes(trimmed)) {
      setFormData({
        ...formData,
        aliases: [...(formData.aliases || []), trimmed],
      });
      setAliasInput('');
    }
  };

  // Remove alias
  const handleRemoveAlias = (alias: string) => {
    setFormData({
      ...formData,
      aliases: formData.aliases?.filter((a) => a !== alias) || [],
    });
  };

  // Add previous org
  const handleAddPrevOrg = () => {
    const trimmed = prevOrgInput.trim();
    if (trimmed && !formData.previousOrgs?.includes(trimmed)) {
      setFormData({
        ...formData,
        previousOrgs: [...(formData.previousOrgs || []), trimmed],
      });
      setPrevOrgInput('');
    }
  };

  // Remove previous org
  const handleRemovePrevOrg = (org: string) => {
    setFormData({
      ...formData,
      previousOrgs: formData.previousOrgs?.filter((o) => o !== org) || [],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!id) return;

    // Validation
    if (!formData.canonicalName?.trim()) {
      toast.error('Canonical name is required');
      return;
    }
    if (!formData.shortBio?.trim()) {
      toast.error('Short bio is required');
      return;
    }
    if (!formData.notableFor?.trim()) {
      toast.error('"Notable for" is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await keyFiguresApi.update(id, formData);
      toast.success(`Updated ${updated.canonicalName}`);
      navigate('/admin/key-figures');
    } catch (error: unknown) {
      const apiError = error as { message?: string };
      toast.error(apiError.message || 'Failed to update key figure');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl animate-pulse">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-gray-200 rounded-lg" />
          <div className="space-y-2">
            <div className="h-6 w-48 bg-gray-200 rounded" />
            <div className="h-4 w-32 bg-gray-100 rounded" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 h-64" />
      </div>
    );
  }

  if (!keyFigure) {
    return null;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/admin/key-figures')}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Key Figure</h1>
          <p className="mt-1 text-sm text-gray-500">
            ID: <code className="bg-gray-100 px-1.5 py-0.5 rounded">{keyFigure.id}</code>
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Canonical Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.canonicalName}
              onChange={(e) => setFormData({ ...formData, canonicalName: e.target.value })}
              placeholder="e.g., Geoffrey Hinton"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              required
            />
            <p className="mt-1 text-xs text-gray-400">
              Note: Changing the name does not change the ID ({keyFigure.id})
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value as KeyFigureRole })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primary Organization
              </label>
              <input
                type="text"
                value={formData.primaryOrg || ''}
                onChange={(e) => setFormData({ ...formData, primaryOrg: e.target.value })}
                placeholder="e.g., Google DeepMind"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value as KeyFigureStatus })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Biography */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Biography</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Short Bio <span className="text-red-500">*</span>
              <span className="font-normal text-gray-400 ml-2">
                ({formData.shortBio?.length || 0}/500)
              </span>
            </label>
            <textarea
              value={formData.shortBio}
              onChange={(e) => setFormData({ ...formData, shortBio: e.target.value })}
              placeholder="Brief one-line bio"
              rows={2}
              maxLength={500}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notable For <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.notableFor}
              onChange={(e) => setFormData({ ...formData, notableFor: e.target.value })}
              placeholder="Key contributions"
              rows={2}
              maxLength={500}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Bio (Optional)
            </label>
            <textarea
              value={formData.fullBio || ''}
              onChange={(e) => setFormData({ ...formData, fullBio: e.target.value })}
              placeholder="Extended biography..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
            />
          </div>
        </div>

        {/* Aliases */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Name Aliases</h2>
            <button
              type="button"
              onClick={handleGenerateVariants}
              disabled={isGeneratingVariants || !formData.canonicalName?.trim()}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className={`h-4 w-4 ${isGeneratingVariants ? 'animate-pulse' : ''}`} />
              Generate Variants
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={aliasInput}
              onChange={(e) => setAliasInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddAlias();
                }
              }}
              placeholder="Add alias"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
            />
            <button
              type="button"
              onClick={handleAddAlias}
              className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {formData.aliases && formData.aliases.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.aliases.map((alias) => (
                <span
                  key={alias}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                >
                  {alias}
                  <button
                    type="button"
                    onClick={() => handleRemoveAlias(alias)}
                    className="p-0.5 hover:bg-gray-200 rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Previous Organizations */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Previous Organizations</h2>

          <div className="flex gap-2">
            <input
              type="text"
              value={prevOrgInput}
              onChange={(e) => setPrevOrgInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddPrevOrg();
                }
              }}
              placeholder="Add organization"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
            />
            <button
              type="button"
              onClick={handleAddPrevOrg}
              className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {formData.previousOrgs && formData.previousOrgs.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.previousOrgs.map((org) => (
                <span
                  key={org}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                >
                  {org}
                  <button
                    type="button"
                    onClick={() => handleRemovePrevOrg(org)}
                    className="p-0.5 hover:bg-gray-200 rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Links */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">External Links</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Wikipedia URL
              </label>
              <input
                type="url"
                value={formData.wikipediaUrl || ''}
                onChange={(e) => setFormData({ ...formData, wikipediaUrl: e.target.value })}
                placeholder="https://en.wikipedia.org/wiki/..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                LinkedIn URL
              </label>
              <input
                type="url"
                value={formData.linkedInUrl || ''}
                onChange={(e) => setFormData({ ...formData, linkedInUrl: e.target.value })}
                placeholder="https://www.linkedin.com/in/..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Image URL
              </label>
              <input
                type="url"
                value={formData.imageUrl || ''}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="https://example.com/photo.jpg"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Twitter/X Handle
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">@</span>
                <input
                  type="text"
                  value={formData.twitterHandle || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, twitterHandle: e.target.value.replace('@', '') })
                  }
                  placeholder="username"
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/key-figures')}
            className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default EditKeyFigurePage;
