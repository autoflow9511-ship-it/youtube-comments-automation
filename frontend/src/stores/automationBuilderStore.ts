import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { NODE_DEFINITIONS } from '@types/automation';
import type {
  FlowNode,
  FlowEdge,
  VisualFlow,
  NodeData,
  NodeType,
  TriggerNodeData,
  ConditionNodeData,
  ActionNodeData,
  DelayNodeData,
  EndNodeData,
} from '@types/automation';

interface AutomationBuilderState {
  // Flow state
  nodes: FlowNode[];
  edges: FlowEdge[];
  viewport: { x: number; y: number; zoom: number };
  
  // Selection state
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  
  // History for undo/redo
  history: { nodes: FlowNode[]; edges: FlowEdge[] }[];
  historyIndex: number;
  
  // Validation
  validationErrors: Record<string, string[]>;
  
  // Automation metadata
  automationId: string | null;
  automationName: string;
  automationDescription: string;
  isDirty: boolean;
  isSaving: boolean;
  lastSaved: string | null;
  
  // UI state
  sidebarOpen: boolean;
  rightSidebarTab: 'settings' | 'validation';
  showMinimap: boolean;
  showGrid: boolean;
  snapToGrid: boolean;
  
  // Actions
  // Node actions
  addNode: (node: Omit<FlowNode, 'id'>) => string;
  updateNode: (id: string, data: Partial<FlowNode>) => void;
  updateNodeData: (id: string, data: Partial<NodeData>) => void;
  deleteNode: (id: string) => void;
  duplicateNode: (id: string) => void;
  selectNode: (id: string | null) => void;
  
  // Edge actions
  addEdge: (edge: Omit<FlowEdge, 'id'>) => string;
  updateEdge: (id: string, data: Partial<FlowEdge>) => void;
  deleteEdge: (id: string) => void;
  selectEdge: (id: string | null) => void;
  
  // Bulk actions
  setNodes: (nodes: FlowNode[]) => void;
  setEdges: (edges: FlowEdge[]) => void;
  setViewport: (viewport: { x: number; y: number; zoom: number }) => void;
  
  // Flow loading/saving
  loadFlow: (flow: VisualFlow) => void;
  getFlow: () => VisualFlow;
  clearFlow: () => void;
  
  // History (undo/redo)
  saveToHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // Validation
  setValidationErrors: (errors: Record<string, string[]>) => void;
  clearValidationErrors: () => void;
  validateFlow: () => boolean;
  
  // Automation metadata
  setAutomationId: (id: string | null) => void;
  setAutomationName: (name: string) => void;
  setAutomationDescription: (description: string) => void;
  setDirty: (dirty: boolean) => void;
  setSaving: (saving: boolean) => void;
  setLastSaved: (date: string | null) => void;
  
  // UI state
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setRightSidebarTab: (tab: 'settings' | 'validation') => void;
  toggleMinimap: () => void;
  toggleGrid: () => void;
  toggleSnapToGrid: () => void;
  
  // Utility
  getNode: (id: string) => FlowNode | undefined;
  getEdge: (id: string) => FlowEdge | undefined;
  getConnectedNodes: (nodeId: string) => { incoming: FlowNode[]; outgoing: FlowNode[] };
  isValidConnection: (sourceId: string, targetId: string, sourceHandle?: string, targetHandle?: string) => boolean;
}

const MAX_HISTORY_SIZE = 50;

const createInitialNode = (data: Omit<FlowNode, 'id'>): FlowNode => ({
  ...data,
  id: uuidv4(),
});

const createInitialEdge = (data: Omit<FlowEdge, 'id'>): FlowEdge => ({
  ...data,
  id: `edge-${uuidv4()}`,
  type: 'smoothstep',
  animated: true,
  markerEnd: { type: 'arrowclosed', width: 20, height: 20 },
});

export const useAutomationBuilderStore = create<AutomationBuilderState>()(
  persist(
    (set, get) => ({
      // Initial state
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      selectedNodeId: null,
      selectedEdgeId: null,
      history: [],
      historyIndex: -1,
      validationErrors: {},
      automationId: null,
      automationName: '',
      automationDescription: '',
      isDirty: false,
      isSaving: false,
      lastSaved: null,
      sidebarOpen: true,
      rightSidebarTab: 'settings',
      showMinimap: true,
      showGrid: true,
      snapToGrid: true,
      
      // Node actions
      addNode: (nodeData) => {
        const node = createInitialNode(nodeData);
        set((state) => {
          const newNodes = [...state.nodes, node];
          return { nodes: newNodes, isDirty: true };
        });
        get().saveToHistory();
        return node.id;
      },
      
      updateNode: (id, data) => {
        set((state) => ({
          nodes: state.nodes.map((n) => (n.id === id ? { ...n, ...data } : n)),
          isDirty: true,
        }));
      },
      
      updateNodeData: (id, data) => {
        set((state) => ({
          nodes: state.nodes.map((n) => 
            n.id === id ? { ...n, data: { ...n.data, ...data } } : n
          ),
          isDirty: true,
        }));
      },
      
      deleteNode: (id) => {
        set((state) => {
          // Also delete connected edges
          const newEdges = state.edges.filter(
            (e) => e.source !== id && e.target !== id
          );
          return {
            nodes: state.nodes.filter((n) => n.id !== id),
            edges: newEdges,
            selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
            isDirty: true,
          };
        });
        get().saveToHistory();
      },
      
      duplicateNode: (id) => {
        const node = get().nodes.find((n) => n.id === id);
        if (!node) return;
        
        const newNode = createInitialNode({
          ...node,
          position: { x: node.position.x + 50, y: node.position.y + 50 },
          data: { ...node.data, label: `${node.data.label} (Copy)` },
          selected: false,
        });
        
        set((state) => ({
          nodes: [...state.nodes, newNode],
          isDirty: true,
        }));
        get().saveToHistory();
      },
      
      selectNode: (id) => {
        set({ selectedNodeId: id, selectedEdgeId: null });
      },
      
      // Edge actions
      addEdge: (edgeData) => {
        const edge = createInitialEdge(edgeData);
        set((state) => ({ edges: [...state.edges, edge], isDirty: true }));
        get().saveToHistory();
        return edge.id;
      },
      
      updateEdge: (id, data) => {
        set((state) => ({
          edges: state.edges.map((e) => (e.id === id ? { ...e, ...data } : e)),
          isDirty: true,
        }));
      },
      
      deleteEdge: (id) => {
        set((state) => ({
          edges: state.edges.filter((e) => e.id !== id),
          selectedEdgeId: state.selectedEdgeId === id ? null : state.selectedEdgeId,
          isDirty: true,
        }));
        get().saveToHistory();
      },
      
      selectEdge: (id) => {
        set({ selectedEdgeId: id, selectedNodeId: null });
      },
      
      // Bulk actions
      setNodes: (nodes) => set({ nodes, isDirty: true }),
      setEdges: (edges) => set({ edges, isDirty: true }),
      setViewport: (viewport) => set({ viewport }),
      
      // Flow loading/saving
      loadFlow: (flow) => {
        set({
          nodes: flow.nodes || [],
          edges: flow.edges || [],
          viewport: flow.viewport || { x: 0, y: 0, zoom: 1 },
          isDirty: false,
          history: [],
          historyIndex: -1,
        });
        get().saveToHistory();
      },
      
      getFlow: () => ({
        nodes: get().nodes,
        edges: get().edges,
        viewport: get().viewport,
      }),
      
      clearFlow: () => {
        set({
          nodes: [],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 },
          selectedNodeId: null,
          selectedEdgeId: null,
          history: [],
          historyIndex: -1,
          validationErrors: {},
          automationId: null,
          automationName: '',
          automationDescription: '',
          isDirty: false,
        });
      },
      
      // History
      saveToHistory: () => {
        set((state) => {
          const newHistory = state.history.slice(0, state.historyIndex + 1);
          newHistory.push({ nodes: state.nodes, edges: state.edges });
          if (newHistory.length > MAX_HISTORY_SIZE) {
            newHistory.shift();
          }
          return { history: newHistory, historyIndex: newHistory.length - 1 };
        });
      },
      
      undo: () => {
        const { history, historyIndex } = get();
        if (historyIndex <= 0) return;
        
        const newIndex = historyIndex - 1;
        const snapshot = history[newIndex];
        set({
          nodes: snapshot.nodes,
          edges: snapshot.edges,
          historyIndex: newIndex,
          isDirty: true,
        });
      },
      
      redo: () => {
        const { history, historyIndex } = get();
        if (historyIndex >= history.length - 1) return;
        
        const newIndex = historyIndex + 1;
        const snapshot = history[newIndex];
        set({
          nodes: snapshot.nodes,
          edges: snapshot.edges,
          historyIndex: newIndex,
          isDirty: true,
        });
      },
      
      canUndo: () => get().historyIndex > 0,
      canRedo: () => get().historyIndex < get().history.length - 1,
      
      // Validation
      setValidationErrors: (errors) => set({ validationErrors: errors }),
      clearValidationErrors: () => set({ validationErrors: {} }),
      
      validateFlow: () => {
        const { nodes, edges } = get();
        const errors: Record<string, string[]> = {};
        
        // Must have at least one trigger node
        const triggerNodes = nodes.filter(n => n.type === 'trigger');
        if (triggerNodes.length === 0) {
          errors.flow = ['Flow must have at least one trigger node'];
        }
        
        // Check each trigger node config
        triggerNodes.forEach(node => {
          const data = node.data as TriggerNodeData;
          if (!data.channelId) {
            errors[node.id] = [...(errors[node.id] || []), 'Channel is required'];
          }
          if (!data.keywords.length && data.matchType !== 'any') {
            errors[node.id] = [...(errors[node.id] || []), 'At least one keyword is required'];
          }
        });
        
        // Check for disconnected nodes (except triggers)
        const connectedNodeIds = new Set<string>();
        edges.forEach(e => {
          connectedNodeIds.add(e.source);
          connectedNodeIds.add(e.target);
        });
        
        nodes.forEach(node => {
          if (node.type !== 'trigger' && !connectedNodeIds.has(node.id)) {
            errors[node.id] = [...(errors[node.id] || []), 'Node is not connected'];
          }
        });
        
        // Check action nodes have required config
        nodes.filter(n => n.type === 'action').forEach(node => {
          const data = node.data as ActionNodeData;
          if (data.actionType === 'reply_comment' && !data.config.message) {
            errors[node.id] = [...(errors[node.id] || []), 'Reply message is required'];
          }
          if (data.actionType === 'send_email' && (!data.config.subject || !data.config.htmlContent)) {
            errors[node.id] = [...(errors[node.id] || []), 'Email subject and content are required'];
          }
          if (data.actionType === 'collect_email' && !data.config.landingPageId) {
            errors[node.id] = [...(errors[node.id] || []), 'Landing page is required'];
          }
          if (data.actionType === 'call_webhook' && !data.config.url) {
            errors[node.id] = [...(errors[node.id] || []), 'Webhook URL is required'];
          }
        });
        
        set({ validationErrors: errors });
        return Object.keys(errors).length === 0;
      },
      
      // Automation metadata
      setAutomationId: (id) => set({ automationId: id }),
      setAutomationName: (name) => set({ automationName: name, isDirty: true }),
      setAutomationDescription: (description) => set({ automationDescription: description, isDirty: true }),
      setDirty: (dirty) => set({ isDirty: dirty }),
      setSaving: (saving) => set({ isSaving: saving }),
      setLastSaved: (date) => set({ lastSaved: date }),
      
      // UI state
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setRightSidebarTab: (tab) => set({ rightSidebarTab: tab }),
      toggleMinimap: () => set((state) => ({ showMinimap: !state.showMinimap })),
      toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
      toggleSnapToGrid: () => set((state) => ({ snapToGrid: !state.snapToGrid })),
      
      // Utility
      getNode: (id) => get().nodes.find(n => n.id === id),
      getEdge: (id) => get().edges.find(e => e.id === id),
      
      getConnectedNodes: (nodeId) => {
        const { nodes, edges } = get();
        const incomingEdges = edges.filter(e => e.target === nodeId);
        const outgoingEdges = edges.filter(e => e.source === nodeId);
        
        return {
          incoming: incomingEdges.map(e => nodes.find(n => n.id === e.source)).filter(Boolean) as FlowNode[],
          outgoing: outgoingEdges.map(e => nodes.find(n => n.id === e.target)).filter(Boolean) as FlowNode[],
        };
      },
      
      isValidConnection: (sourceId, targetId, sourceHandle, targetHandle) => {
        const { nodes, edges } = get();
        const sourceNode = nodes.find(n => n.id === sourceId);
        const targetNode = nodes.find(n => n.id === targetId);
        
        if (!sourceNode || !targetNode) return false;
        
        // Can't connect to self
        if (sourceId === targetId) return false;
        
        // Check if connection already exists
        const existingEdge = edges.find(e => e.source === sourceId && e.target === targetId);
        if (existingEdge) return false;
        
        // Check allowed connections based on node types
        const targetDef = NODE_DEFINITIONS.find(d => d.type === targetNode.type && d.subType === (targetNode.data as any).conditionType || d.subType === (targetNode.data as any).actionType || d.subType === (targetNode.data as any).type);
        
        if (targetDef?.allowedPrevTypes && !targetDef.allowedPrevTypes.includes(sourceNode.type)) {
          return false;
        }
        
        const sourceDef = NODE_DEFINITIONS.find(d => d.type === sourceNode.type && d.subType === (sourceNode.data as any).triggerType || d.subType === (sourceNode.data as any).conditionType || d.subType === (sourceNode.data as any).actionType || d.subType === (sourceNode.data as any).type);
        
        if (sourceDef?.allowedNextTypes && !sourceDef.allowedNextTypes.includes(targetNode.type)) {
          return false;
        }
        
        // Check max outputs for source
        const sourceOutputs = edges.filter(e => e.source === sourceId).length;
        const maxOutputs = sourceDef?.outputs || 1;
        if (sourceOutputs >= maxOutputs) return false;
        
        // Check max inputs for target
        const targetInputs = edges.filter(e => e.target === targetId).length;
        const maxInputs = targetDef?.inputs || 1;
        if (targetInputs >= maxInputs) return false;
        
        return true;
      },
    }),
    {
      name: 'automation-builder-storage',
      partialize: (state) => ({
        // Only persist UI preferences, not flow data
        sidebarOpen: state.sidebarOpen,
        rightSidebarTab: state.rightSidebarTab,
        showMinimap: state.showMinimap,
        showGrid: state.showGrid,
        snapToGrid: state.snapToGrid,
      }),
    }
  )
);

// NODE_DEFINITIONS is imported at the top of this file