import React, { useState, useMemo } from 'react';
import { UserSession } from '../types';
import { Network, Sparkles, Filter, ExternalLink, Calendar, Layers } from 'lucide-react';

interface MemoryGraphProps {
  sessions: UserSession[];
  onNavigateToSession: (sessionId: string) => void;
}

interface GraphNode {
  id: string;
  label: string;
  type: 'topic' | 'session';
  category: string;
  count: number;
  sessionIds: string[];
  x: number;
  y: number;
  color: string;
}

interface GraphLink {
  source: string;
  target: string;
  weight: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  career: '#3b82f6', // blue
  health: '#10b981', // emerald
  travel: '#f59e0b', // amber
  ideas: '#8b5cf6', // purple
  relationships: '#ec4899', // pink
  mindfulness: '#06b6d4', // cyan
  finance: '#14b8a6', // teal
  personal: '#64748b', // slate
  general: '#78716c', // stone
};

export const MemoryGraph: React.FC<MemoryGraphProps> = ({
  sessions,
  onNavigateToSession,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Extract topics and compute connected graph structure
  const { nodes, links, topicCategories } = useMemo(() => {
    const topicMap = new Map<string, { count: number; sessionIds: string[]; category: string }>();

    // Common default topic recognizer based on theme strings or keywords
    const categorizeTopic = (topic: string): string => {
      const lower = topic.toLowerCase();
      if (lower.includes('work') || lower.includes('career') || lower.includes('job') || lower.includes('project') || lower.includes('leadership')) return 'career';
      if (lower.includes('health') || lower.includes('fitness') || lower.includes('sleep') || lower.includes('nutrition') || lower.includes('workout')) return 'health';
      if (lower.includes('travel') || lower.includes('trip') || lower.includes('vacation') || lower.includes('city')) return 'travel';
      if (lower.includes('idea') || lower.includes('create') || lower.includes('writing') || lower.includes('design')) return 'ideas';
      if (lower.includes('relationship') || lower.includes('family') || lower.includes('friend') || lower.includes('partner')) return 'relationships';
      if (lower.includes('mindful') || lower.includes('peace') || lower.includes('meditation') || lower.includes('calm') || lower.includes('stress')) return 'mindfulness';
      if (lower.includes('money') || lower.includes('finance') || lower.includes('budget') || lower.includes('invest')) return 'finance';
      return 'personal';
    };

    // Aggregate themes across all sessions
    sessions.forEach((s) => {
      const themes = s.themes && s.themes.length > 0 ? s.themes : ['Personal Reflection'];
      themes.forEach((t) => {
        const normalized = t.trim();
        if (!normalized) return;
        const current = topicMap.get(normalized) || { count: 0, sessionIds: [], category: categorizeTopic(normalized) };
        current.count += 1;
        if (!current.sessionIds.includes(s.id)) {
          current.sessionIds.push(s.id);
        }
        topicMap.set(normalized, current);
      });
    });

    const topicList = Array.from(topicMap.entries()).map(([label, data]) => ({
      id: `topic-${label}`,
      label,
      type: 'topic' as const,
      category: data.category,
      count: data.count,
      sessionIds: data.sessionIds,
    }));

    // Find co-occurrences (edges)
    const linkMap = new Map<string, number>();
    sessions.forEach((s) => {
      const themes = (s.themes && s.themes.length > 0 ? s.themes : ['Personal Reflection']).map((t) => t.trim());
      for (let i = 0; i < themes.length; i++) {
        for (let j = i + 1; j < themes.length; j++) {
          const idA = `topic-${themes[i]}`;
          const idB = `topic-${themes[j]}`;
          const key = idA < idB ? `${idA}__${idB}` : `${idB}__${idA}`;
          linkMap.set(key, (linkMap.get(key) || 0) + 1);
        }
      }
    });

    const linkList: GraphLink[] = Array.from(linkMap.entries()).map(([key, weight]) => {
      const [source, target] = key.split('__');
      return { source, target, weight };
    });

    // Layout algorithms in an SVG viewport (width: 700, height: 480)
    const width = 700;
    const height = 480;
    const centerX = width / 2;
    const centerY = height / 2;

    const positionedNodes: GraphNode[] = topicList.map((node, index) => {
      const total = topicList.length || 1;
      const angle = (index / total) * 2 * Math.PI;
      // Stagger radius based on count and index
      const radius = 130 + (index % 2 === 0 ? 55 : -35) + Math.min(node.count * 15, 60);
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      const color = CATEGORY_COLORS[node.category] || CATEGORY_COLORS.personal;

      return {
        ...node,
        x,
        y,
        color,
      };
    });

    const categories = Array.from(new Set(positionedNodes.map((n) => n.category)));

    return { nodes: positionedNodes, links: linkList, topicCategories: categories };
  }, [sessions]);

  // Selected node inspection
  const selectedNode = useMemo(() => {
    return nodes.find((n) => n.id === selectedNodeId) || null;
  }, [nodes, selectedNodeId]);

  // Connected nodes & links for highlighting
  const { connectedNodeIds, connectedLinks } = useMemo(() => {
    const targetId = hoveredNodeId || selectedNodeId;
    if (!targetId) return { connectedNodeIds: new Set<string>(), connectedLinks: new Set<string>() };

    const nodeIds = new Set<string>([targetId]);
    const linkKeys = new Set<string>();

    links.forEach((l) => {
      if (l.source === targetId) {
        nodeIds.add(l.target);
        linkKeys.add(`${l.source}__${l.target}`);
      } else if (l.target === targetId) {
        nodeIds.add(l.source);
        linkKeys.add(`${l.source}__${l.target}`);
      }
    });

    return { connectedNodeIds: nodeIds, connectedLinks: linkKeys };
  }, [hoveredNodeId, selectedNodeId, links]);

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    if (filterCategory === 'all') return nodes;
    return nodes.filter((n) => n.category === filterCategory);
  }, [nodes, filterCategory]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);

  // Related sessions for selected node
  const relatedSessions = useMemo(() => {
    if (!selectedNode) return [];
    return sessions.filter((s) => selectedNode.sessionIds.includes(s.id));
  }, [selectedNode, sessions]);

  return (
    <div className="flex-1 flex flex-col bg-transparent overflow-y-auto">
      {/* Header banner */}
      <div className="border-b border-amber-900/10 bg-white/70 backdrop-blur-md px-6 py-6 sm:px-8">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                <Network className="h-4 w-4" />
              </span>
              <h1 className="font-serif text-2xl font-bold text-stone-900">
                Private Memory Graph
              </h1>
            </div>
            <p className="mt-1 text-xs text-stone-500">
              Visualizes how your journal entries, career thoughts, health goals, and reflections connect across sessions.
            </p>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-3.5 w-3.5 text-stone-400" />
            <button
              onClick={() => setFilterCategory('all')}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                filterCategory === 'all'
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              All Topics ({nodes.length})
            </button>
            {topicCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium capitalize transition-colors flex items-center gap-1.5 ${
                  filterCategory === cat
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: CATEGORY_COLORS[cat] || '#78716c' }}
                />
                <span>{cat}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="mx-auto max-w-6xl w-full p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* Left 2 Cols: Interactive Graph SVG Canvas */}
        <div className="lg:col-span-2 rounded-2xl border border-amber-900/10 bg-white/80 backdrop-blur-md p-4 shadow-sm flex flex-col items-center justify-center relative min-h-[460px]">
          {nodes.length === 0 ? (
            <div className="text-center p-8 space-y-3">
              <Sparkles className="h-8 w-8 text-stone-300 mx-auto" />
              <p className="text-sm font-medium text-stone-700">No topic nodes mapped yet</p>
              <p className="text-xs text-stone-500 max-w-md">
                Reflect in your journal and extract insights with Gemini to populate connected memory topics.
              </p>
            </div>
          ) : (
            <>
              {/* Instructions Pill */}
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2 rounded-full bg-stone-100/90 px-3 py-1 text-[11px] text-stone-600 backdrop-blur-xs">
                <Layers className="h-3 w-3 text-stone-500" />
                <span>Click a topic node to explore connected journal sessions</span>
              </div>

              {/* Responsive SVG Graph */}
              <svg
                viewBox="0 0 700 480"
                className="w-full h-auto max-h-[500px] select-none"
              >
                {/* Background grid subtle dots */}
                <defs>
                  <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="0.8" fill="#e7e5e4" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />

                {/* Edges */}
                <g className="links">
                  {links.map((link) => {
                    const src = nodes.find((n) => n.id === link.source);
                    const tgt = nodes.find((n) => n.id === link.target);
                    if (!src || !tgt) return null;
                    if (!filteredNodeIds.has(src.id) && !filteredNodeIds.has(tgt.id)) return null;

                    const isHighlight =
                      connectedLinks.has(`${link.source}__${link.target}`) ||
                      connectedLinks.has(`${link.target}__${link.source}`);

                    return (
                      <line
                        key={`${link.source}__${link.target}`}
                        x1={src.x}
                        y1={src.y}
                        x2={tgt.x}
                        y2={tgt.y}
                        stroke={isHighlight ? '#4f46e5' : '#e2e8f0'}
                        strokeWidth={isHighlight ? 2.5 : Math.min(link.weight * 1.2, 3)}
                        strokeOpacity={isHighlight ? 0.9 : 0.6}
                      />
                    );
                  })}
                </g>

                {/* Nodes */}
                <g className="nodes">
                  {filteredNodes.map((node) => {
                    const isSelected = selectedNodeId === node.id;
                    const isHovered = hoveredNodeId === node.id;
                    const isConnected = connectedNodeIds.has(node.id);
                    const radius = Math.min(18 + node.count * 4, 34);

                    return (
                      <g
                        key={node.id}
                        transform={`translate(${node.x}, ${node.y})`}
                        onClick={() => setSelectedNodeId(node.id)}
                        onMouseEnter={() => setHoveredNodeId(node.id)}
                        onMouseLeave={() => setHoveredNodeId(null)}
                        className="cursor-pointer transition-transform"
                      >
                        {/* Glow halo on active or connected */}
                        {(isSelected || isHovered || isConnected) && (
                          <circle
                            r={radius + 6}
                            fill={node.color}
                            fillOpacity={isSelected ? 0.25 : 0.15}
                          />
                        )}

                        {/* Main Node Circle */}
                        <circle
                          r={radius}
                          fill={node.color}
                          stroke={isSelected ? '#18181b' : '#ffffff'}
                          strokeWidth={isSelected ? 3 : 2}
                          className="transition-all hover:scale-110"
                        />

                        {/* Occurrence count badge */}
                        <text
                          textAnchor="middle"
                          dy="0.35em"
                          fill="#ffffff"
                          fontSize="11"
                          fontWeight="700"
                        >
                          {node.count}
                        </text>

                        {/* Text Label Below */}
                        <text
                          textAnchor="middle"
                          y={radius + 14}
                          fill={isSelected ? '#18181b' : '#44403c'}
                          fontSize="11"
                          fontWeight={isSelected ? '700' : '500'}
                          className="pointer-events-none"
                        >
                          {node.label}
                        </text>
                      </g>
                    );
                  })}
                </g>
              </svg>
            </>
          )}
        </div>

        {/* Right Col: Topic Inspector & Connected Sessions */}
        <div className="rounded-2xl border border-amber-900/10 bg-white/80 backdrop-blur-md p-5 shadow-sm flex flex-col">
          {selectedNode ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between border-b border-stone-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: selectedNode.color }}
                    />
                    <h3 className="font-serif text-lg font-bold text-stone-900">
                      {selectedNode.label}
                    </h3>
                  </div>
                  <p className="text-xs text-stone-500 capitalize mt-0.5">
                    Category: {selectedNode.category} • Recorded in {selectedNode.count} session{selectedNode.count > 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Connected Sessions List */}
              <div>
                <h4 className="text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
                  Connected Journal Sessions
                </h4>
                {relatedSessions.length === 0 ? (
                  <p className="text-xs text-stone-500">No session links found.</p>
                ) : (
                  <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                    {relatedSessions.map((session) => (
                      <div
                        key={session.id}
                        className="rounded-xl border border-stone-200 bg-stone-50 p-3 hover:bg-stone-100/80 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h5 className="font-medium text-xs text-stone-900 line-clamp-1">
                            {session.title}
                          </h5>
                          <button
                            onClick={() => onNavigateToSession(session.id)}
                            className="text-stone-400 hover:text-stone-800 p-0.5"
                            title="Open reflection session"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {session.summary && (
                          <p className="mt-1 text-[11px] text-stone-600 line-clamp-2 leading-relaxed">
                            {session.summary}
                          </p>
                        )}

                        <div className="mt-2 flex items-center justify-between text-[10px] text-stone-400 pt-1 border-t border-stone-200/60">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(session.updatedAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                          <span className="font-medium text-stone-600">
                            {session.messageCount} exchanges
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
              <Network className="h-10 w-10 text-stone-300" />
              <h3 className="text-sm font-semibold text-stone-800">
                Inspect Memory Connections
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed max-w-xs">
                Select any topic node in the graph to inspect how it connects with your other reflections and view corresponding journal entries.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
