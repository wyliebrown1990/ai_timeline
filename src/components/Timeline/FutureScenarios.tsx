import { useState } from 'react';
import {
  Sun,
  Cloud,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Quote,
  Calendar,
  CheckCircle,
  Shield,
  BookOpen,
} from 'lucide-react';
import type {
  FutureScenarios as FutureScenariosType,
  FutureScenario,
  ScenarioReference,
} from '../../types/milestone';

type ScenarioKey = 'optimistic' | 'neutral' | 'concerning';

interface FutureScenariosProps {
  scenarios: FutureScenariosType;
  references?: ScenarioReference[];
}

const SCENARIO_CONFIG: Record<
  ScenarioKey,
  {
    icon: typeof Sun;
    color: string;
    bgColor: string;
    borderColor: string;
    textColor: string;
  }
> = {
  optimistic: {
    icon: Sun,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    textColor: 'text-emerald-700 dark:text-emerald-300',
  },
  neutral: {
    icon: Cloud,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    textColor: 'text-blue-700 dark:text-blue-300',
  },
  concerning: {
    icon: AlertTriangle,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    borderColor: 'border-amber-200 dark:border-amber-800',
    textColor: 'text-amber-700 dark:text-amber-300',
  },
};

/**
 * Renders a single scenario with its timeline, voices, and requirements
 */
function ScenarioContent({ scenario, scenarioKey }: { scenario: FutureScenario; scenarioKey: ScenarioKey }) {
  const [showTimeline, setShowTimeline] = useState(true);
  const [showVoices, setShowVoices] = useState(true);
  const [showRequirements, setShowRequirements] = useState(false);
  const config = SCENARIO_CONFIG[scenarioKey];

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className={`${config.bgColor} rounded-lg p-4 border ${config.borderColor}`}>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{scenario.summary}</p>
        <p className={`mt-2 text-sm font-medium ${config.textColor}`}>{scenario.probability}</p>
      </div>

      {/* Timeline */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowTimeline(!showTimeline)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Calendar className={`w-5 h-5 ${config.color}`} />
            <span className="font-medium text-gray-900 dark:text-white">Timeline</span>
          </div>
          {showTimeline ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>
        {showTimeline && (
          <div className="p-4 space-y-4">
            {scenario.timeline.map((event, index) => (
              <div key={index} className="flex gap-4">
                <div className={`font-bold ${config.color} w-16 flex-shrink-0`}>{event.year}</div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">{event.event}</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{event.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Key Voices */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowVoices(!showVoices)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Quote className={`w-5 h-5 ${config.color}`} />
            <span className="font-medium text-gray-900 dark:text-white">Key Voices</span>
          </div>
          {showVoices ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>
        {showVoices && (
          <div className="p-4 space-y-6">
            {scenario.keyVoices.map((voice, index) => (
              <div key={index} className={`${config.bgColor} rounded-lg p-4 border ${config.borderColor}`}>
                <blockquote className="text-gray-700 dark:text-gray-300 italic leading-relaxed mb-3">
                  "{voice.quote}"
                </blockquote>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{voice.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{voice.role}</div>
                  </div>
                  <a
                    href={voice.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-1 text-sm ${config.color} hover:underline`}
                  >
                    {voice.source}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-3">
                  {voice.context}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Requirements / What Would Make This Happen */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowRequirements(!showRequirements)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center gap-2">
            <CheckCircle className={`w-5 h-5 ${config.color}`} />
            <span className="font-medium text-gray-900 dark:text-white">
              {scenarioKey === 'concerning' ? 'What Would Lead to This' : 'Requirements for This Scenario'}
            </span>
          </div>
          {showRequirements ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>
        {showRequirements && (
          <div className="p-4">
            <ul className="space-y-2">
              {scenario.requirements.map((req, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                  <span className={`${config.color} mt-1`}>•</span>
                  <span>{req}</span>
                </li>
              ))}
            </ul>

            {/* Mitigations for concerning scenario */}
            {scenarioKey === 'concerning' && scenario.mitigations && scenario.mitigations.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-medium text-gray-900 dark:text-white">Potential Mitigations</span>
                </div>
                <ul className="space-y-2">
                  {scenario.mitigations.map((mitigation, index) => (
                    <li key={index} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                      <span className="text-emerald-600 dark:text-emerald-400 mt-1">•</span>
                      <span>{mitigation}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * FutureScenarios component displays three AI future scenarios with tabs
 * Used for the special "Where Do We Go Next?" milestone
 */
export function FutureScenarios({ scenarios, references }: FutureScenariosProps) {
  const [activeScenario, setActiveScenario] = useState<ScenarioKey>('optimistic');
  const [showReferences, setShowReferences] = useState(false);

  const scenarioKeys: ScenarioKey[] = ['optimistic', 'neutral', 'concerning'];

  return (
    <div className="space-y-6" data-testid="future-scenarios">
      {/* Scenario Tabs */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Future scenarios">
        {scenarioKeys.map((key) => {
          const config = SCENARIO_CONFIG[key];
          const Icon = config.icon;
          const scenario = scenarios[key];
          const isActive = activeScenario === key;

          return (
            <button
              key={key}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveScenario(key)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-200 ease-out
                ${
                  isActive
                    ? `${config.bgColor} ${config.color} border-2 ${config.borderColor} shadow-sm`
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border-2 border-transparent'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              <span>{scenario.title}</span>
            </button>
          );
        })}
      </div>

      {/* Scenario Subtitle */}
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          {scenarios[activeScenario].title}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {scenarios[activeScenario].subtitle}
        </p>
      </div>

      {/* Active Scenario Content */}
      <ScenarioContent scenario={scenarios[activeScenario]} scenarioKey={activeScenario} />

      {/* References Section */}
      {references && references.length > 0 && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mt-8">
          <button
            onClick={() => setShowReferences(!showReferences)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="font-medium text-gray-900 dark:text-white">
                References & Further Reading ({references.length})
              </span>
            </div>
            {showReferences ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>
          {showReferences && (
            <div className="p-4 space-y-4">
              {references.map((ref, index) => (
                <a
                  key={index}
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1">
                        {ref.title}
                        <ExternalLink className="w-3 h-3" />
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                        {ref.author} • {ref.date}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{ref.description}</p>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default FutureScenarios;
