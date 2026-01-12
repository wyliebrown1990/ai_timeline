import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { useNavigate } from 'react-router-dom';
import { useConceptProgress } from '../../hooks/useConceptProgress';
import type { GlossaryTerm } from '../../services/api';

/**
 * Graph node representing a glossary concept
 */
interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  term: string;
  shortDefinition: string;
  difficulty: number;
  conceptType: string;
  category: string;
  prerequisiteIds: string[];
  isSeen: boolean;
}

/**
 * Graph edge representing a prerequisite relationship
 */
interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
}

/**
 * Difficulty level colors (green to red gradient)
 */
const DIFFICULTY_COLORS: { [key: number]: string } = {
  1: '#22c55e', // Green - Beginner
  2: '#84cc16', // Lime - Intermediate
  3: '#eab308', // Yellow - Advanced
  4: '#f97316', // Orange - Expert
  5: '#ef4444', // Red - Specialist
};

const DEFAULT_COLOR = '#22c55e';

/**
 * Get color for difficulty level, with fallback
 */
function getDifficultyColor(level: number): string {
  return DIFFICULTY_COLORS[level] ?? DEFAULT_COLOR;
}

/**
 * Difficulty level labels
 */
const DIFFICULTY_LABELS: { [key: number]: string } = {
  1: 'Beginner',
  2: 'Intermediate',
  3: 'Advanced',
  4: 'Expert',
  5: 'Specialist',
};

function getDifficultyLabel(level: number): string {
  return DIFFICULTY_LABELS[level] ?? 'Beginner';
}

interface ConceptGraphProps {
  terms: GlossaryTerm[];
  width?: number;
  height?: number;
  filterDifficulty?: number | null;
  filterCategory?: string | null;
  showOnlyWithPrerequisites?: boolean;
  highlightTermId?: string | null;
}

/**
 * Interactive force-directed graph showing concept relationships
 * Nodes = concepts, Edges = prerequisite relationships
 * Colors indicate difficulty level, checkmarks show learned concepts
 */
export function ConceptGraph({
  terms,
  width = 900,
  height = 600,
  filterDifficulty = null,
  filterCategory = null,
  showOnlyWithPrerequisites = false,
  highlightTermId = null,
}: ConceptGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const navigate = useNavigate();
  const { hasSeenConcept } = useConceptProgress();
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    node: GraphNode | null;
  }>({ visible: false, x: 0, y: 0, node: null });

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      navigate(`/glossary?term=${nodeId}`);
    },
    [navigate]
  );

  useEffect(() => {
    if (!svgRef.current || terms.length === 0) return;

    // Clear previous graph
    d3.select(svgRef.current).selectAll('*').remove();

    // Filter terms based on props
    let filteredTerms = terms;
    if (filterDifficulty !== null) {
      filteredTerms = filteredTerms.filter((t) => t.difficulty === filterDifficulty);
    }
    if (filterCategory !== null) {
      filteredTerms = filteredTerms.filter((t) => t.category === filterCategory);
    }
    if (showOnlyWithPrerequisites) {
      filteredTerms = filteredTerms.filter(
        (t) => t.prerequisiteIds.length > 0 || terms.some((other) => other.prerequisiteIds.includes(t.id))
      );
    }

    // Build valid term IDs set for edge filtering
    const validIds = new Set(filteredTerms.map((t) => t.id));

    // Create nodes
    const nodes: GraphNode[] = filteredTerms.map((term) => ({
      id: term.id,
      term: term.term,
      shortDefinition: term.shortDefinition,
      difficulty: term.difficulty || 1,
      conceptType: term.conceptType || 'foundational',
      category: term.category,
      prerequisiteIds: term.prerequisiteIds || [],
      isSeen: hasSeenConcept(term.id),
    }));

    // Create links (prerequisite -> concept)
    const links: GraphLink[] = [];
    filteredTerms.forEach((term) => {
      (term.prerequisiteIds || []).forEach((prereqId) => {
        if (validIds.has(prereqId)) {
          links.push({
            source: prereqId,
            target: term.id,
          });
        }
      });
    });

    // Setup SVG
    const svg = d3
      .select(svgRef.current)
      .attr('viewBox', [0, 0, width, height])
      .attr('width', '100%')
      .attr('height', height);

    // Add zoom behavior
    const g = svg.append('g');
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    svg.call(zoom);

    // Arrow marker for directed edges
    svg
      .append('defs')
      .append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .append('path')
      .attr('d', 'M 0,-5 L 10,0 L 0,5')
      .attr('fill', '#9ca3af');

    // Create force simulation
    const simulation = d3
      .forceSimulation<GraphNode>(nodes)
      .force(
        'link',
        d3
          .forceLink<GraphNode, GraphLink>(links)
          .id((d) => d.id)
          .distance(100)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(35));

    // Draw links
    const link = g
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#9ca3af')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 1.5)
      .attr('marker-end', 'url(#arrowhead)');

    // Create drag behavior
    const dragBehavior = d3
      .drag<SVGGElement, GraphNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    // Draw nodes
    const node = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll<SVGGElement, GraphNode>('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(dragBehavior);

    // Node circles
    node
      .append('circle')
      .attr('r', (d) => (d.id === highlightTermId ? 18 : 14))
      .attr('fill', (d) => getDifficultyColor(d.difficulty))
      .attr('stroke', (d) => {
        if (d.id === highlightTermId) return '#3b82f6';
        if (d.isSeen) return '#22c55e';
        return '#ffffff';
      })
      .attr('stroke-width', (d) => {
        if (d.id === highlightTermId) return 4;
        if (d.isSeen) return 3;
        return 2;
      });

    // Seen checkmark indicator
    node
      .filter((d) => d.isSeen)
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', '10px')
      .attr('fill', 'white')
      .attr('font-weight', 'bold')
      .text('\u2713');

    // Node labels
    node
      .append('text')
      .attr('dy', 28)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('fill', '#374151')
      .attr('class', 'dark:fill-gray-300')
      .text((d) => (d.term.length > 18 ? d.term.slice(0, 16) + '...' : d.term));

    // Node interactions
    node
      .on('click', (_, d) => {
        handleNodeClick(d.id);
      })
      .on('mouseenter', function (event, d) {
        // Get SVG bounding box for proper positioning
        const svgRect = svgRef.current?.getBoundingClientRect();
        if (svgRect) {
          setTooltip({
            visible: true,
            x: event.clientX - svgRect.left + 10,
            y: event.clientY - svgRect.top - 10,
            node: d,
          });
        }
        // Highlight connected nodes
        d3.select(this).select('circle').attr('stroke-width', 4);
      })
      .on('mousemove', function (event) {
        const svgRect = svgRef.current?.getBoundingClientRect();
        if (svgRect) {
          setTooltip((prev) => ({
            ...prev,
            x: event.clientX - svgRect.left + 10,
            y: event.clientY - svgRect.top - 10,
          }));
        }
      })
      .on('mouseleave', function (_, d) {
        setTooltip({ visible: false, x: 0, y: 0, node: null });
        d3.select(this)
          .select('circle')
          .attr('stroke-width', d.id === highlightTermId ? 4 : d.isSeen ? 3 : 2);
      });

    // Simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as GraphNode).x!)
        .attr('y1', (d) => (d.source as GraphNode).y!)
        .attr('x2', (d) => (d.target as GraphNode).x!)
        .attr('y2', (d) => (d.target as GraphNode).y!);

      node.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [terms, width, height, filterDifficulty, filterCategory, showOnlyWithPrerequisites, highlightTermId, hasSeenConcept, handleNodeClick]);

  return (
    <div className="relative w-full">
      <svg
        ref={svgRef}
        className="w-full bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
        style={{ minHeight: height }}
      />

      {/* Tooltip */}
      {tooltip.visible && tooltip.node && (
        <div
          className="absolute z-50 max-w-xs p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="font-semibold text-gray-900 dark:text-white mb-1">{tooltip.node.term}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            <span
              className="inline-block px-2 py-0.5 rounded text-white mr-2"
              style={{ backgroundColor: getDifficultyColor(tooltip.node.difficulty) }}
            >
              {getDifficultyLabel(tooltip.node.difficulty)}
            </span>
            {tooltip.node.isSeen && (
              <span className="inline-block px-2 py-0.5 rounded bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                Learned
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">{tooltip.node.shortDefinition}</p>
          <p className="text-xs text-blue-500 mt-2">Click to view details</p>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
        <div className="font-medium text-gray-700 dark:text-gray-300">Difficulty:</div>
        {Object.entries(DIFFICULTY_LABELS).map(([level, label]) => (
          <div key={level} className="flex items-center gap-1">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: getDifficultyColor(Number(level)) }}
            />
            <span className="text-gray-600 dark:text-gray-400">{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1 ml-4">
          <span className="w-3 h-3 rounded-full bg-gray-400 border-2 border-green-500" />
          <span className="text-gray-600 dark:text-gray-400">Learned</span>
        </div>
      </div>
    </div>
  );
}

export default ConceptGraph;
