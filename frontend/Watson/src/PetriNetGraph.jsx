import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Panel,
  MiniMap,
  ReactFlowProvider,
  MarkerType,
} from "@xyflow/react";
import ELK from "elkjs/lib/elk.bundled.js";
import {
  Box,
  Typography,
  FormControlLabel,
  Switch,
  Chip,
  Paper,
  CircularProgress,
  Alert,
} from "@mui/material";
import PetriNetPlace from "./PetriNetPlace";
import PetriNetTransition from "./PetriNetTransition";

import "@xyflow/react/dist/style.css";

// Create base node types outside component to prevent recreation
const createNodeTypes = (props) => ({
  place: (nodeProps) => <PetriNetPlace {...nodeProps} {...props} />,
  transition: (nodeProps) => <PetriNetTransition {...nodeProps} {...props} />,
});

const PetriNetGraph = ({
  petriNetData,
  onEvidenceClick,
  highlightRelationId,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLayouting, setIsLayouting] = useState(false);
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [layoutDirection, setLayoutDirection] = useState("RIGHT");
  const [highlightedNodeId, setHighlightedNodeId] = useState(null);
  const [nodesMoveable, setNodesMoveable] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  const handleHighlightClick = useCallback(
    (nodeId) => {
      setHighlightedNodeId(highlightedNodeId === nodeId ? null : nodeId);
    },
    [highlightedNodeId],
  );

  useEffect(() => {
    if (!highlightRelationId) {
      return;
    }

    const hasNode = nodes.some((node) => node.id === highlightRelationId);
    if (hasNode) {
      setHighlightedNodeId(highlightRelationId);
    }
  }, [highlightRelationId, nodes]);

  const onMove = useCallback((_, viewport) => {
    setZoomLevel(viewport.zoom);
  }, []);

  const getConnectedElements = useCallback((nodeId, edgeList) => {
    const connectedNodeIds = new Set([nodeId]);
    const connectedEdgeIds = new Set();

    edgeList.forEach((edge) => {
      if (edge.source === nodeId || edge.target === nodeId) {
        connectedEdgeIds.add(edge.id);
        connectedNodeIds.add(edge.source);
        connectedNodeIds.add(edge.target);
      }
    });

    return { nodeIds: connectedNodeIds, edgeIds: connectedEdgeIds };
  }, []);

  const connectedElements = useMemo(() => {
    if (!highlightedNodeId) return { nodeIds: new Set(), edgeIds: new Set() };
    return getConnectedElements(highlightedNodeId, edges);
  }, [highlightedNodeId, edges, getConnectedElements]);

  const nodeTypes = useMemo(
    () =>
      createNodeTypes({
        onEvidenceClick,
        onHighlightClick: handleHighlightClick,
        highlightedNodeId,
        connectedElements,
        zoomLevel,
      }),
    [
      onEvidenceClick,
      handleHighlightClick,
      highlightedNodeId,
      connectedElements,
      zoomLevel,
    ],
  );

  // ELK layout configuration
  const elk = useMemo(() => new ELK(), []);
  const elkOptions = useMemo(
    () => ({
      "elk.algorithm": "layered",
      "elk.layered.spacing.nodeNodeBetweenLayers": "200", // Further increased spacing between layers
      "elk.layered.spacing.edgeNodeBetweenLayers": "100", // Further increased edge spacing
      "elk.spacing.nodeNode": "180", // Significantly increased minimum node spacing
      "elk.spacing.edgeNode": "80", // Increased edge to node spacing
      "elk.spacing.edgeEdge": "50", // Increased edge to edge spacing
      "elk.direction": layoutDirection,
      "elk.layered.nodePlacement.strategy": "INTERACTIVE",
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
      "elk.layered.compaction.postCompaction.strategy": "NONE", // Disable compaction to prevent nodes getting too close
      "elk.layered.spacing.inLayerSpacingFactor": "3.0", // Increased extra space within layers
      "elk.separateConnectedComponents": "true", // Keep components separate
      "elk.spacing.componentComponent": "100", // Add space between separate components
      "elk.aspectRatio": "1.8", // Adjusted aspect ratio for better spacing
    }),
    [layoutDirection],
  );

  const convertPetriNetToGraph = useCallback((data) => {
    console.log("Converting Petri net data:", data);

    if (!data || !data.substrates || !data.products || !data.edges) {
      console.warn("Invalid petri net data structure:", data);
      return { nodes: [], edges: [] };
    }

    const graphNodes = [];
    const graphEdges = [];
    const nodeMap = new Map();

    data.substrates.forEach((substrate, index) => {
      const nodeId = `substrate-${index}`;
      graphNodes.push({
        id: nodeId,
        type: "place",
        position: { x: 0, y: 0 }, // Will be set by ELK layout
        data: {
          label: substrate,
          type: "substrate",
          tokens: 0,
        },
      });
      nodeMap.set(substrate, nodeId);
    });

    data.modifiers.forEach((modifier, index) => {
      const nodeId = `modifier-${index}`;
      graphNodes.push({
        id: nodeId,
        type: "place",
        position: { x: 0, y: 0 },
        data: {
          label: modifier,
          type: "modifier",
          tokens: 0,
        },
      });
      nodeMap.set(modifier, nodeId);
    });

    data.products.forEach((product, index) => {
      const nodeId = `product-${index}`;
      graphNodes.push({
        id: nodeId,
        type: "place",
        position: { x: 0, y: 0 },
        data: {
          label: product,
          type: "product",
          tokens: 0,
        },
      });
      nodeMap.set(product, nodeId);
    });

    const transitionMap = new Map();

    data.edges.forEach((edge, edgeIndex) => {
      if (!Array.isArray(edge) || edge.length !== 2) return;

      const [first, second] = edge;
      let sourcePlace = null;
      let targetPlace = null;
      let transitionData = null;

      if (typeof first === "string" && Array.isArray(second)) {
        // Incoming edge: ["Place Name", [transitionId, relation, chunkId]]
        sourcePlace = first;
        transitionData = second;
      } else if (Array.isArray(first) && typeof second === "string") {
        // Outgoing edge: [[transitionId, relation, chunkId], "Place Name"]
        transitionData = first;
        targetPlace = second;
      } else {
        console.warn("Unknown edge format:", edge);
        return;
      }

      if (!Array.isArray(transitionData) || transitionData.length < 2) return;

      const [evidenceId, relation, chunkId] = transitionData;
      const transitionId = String(evidenceId);

      if (!transitionMap.has(transitionId)) {
        graphNodes.push({
          id: transitionId,
          type: "transition",
          position: { x: 0, y: 0 },
          data: {
            label: relation
              ? relation.replace("Relation: ", "")
              : `Transition ${edgeIndex}`,
            relation: relation,
            evidence: evidenceId,
            chunkId: chunkId,
            enabled: false,
            fired: false,
          },
        });
        transitionMap.set(transitionId, true);
      }

      if (sourcePlace && nodeMap.has(sourcePlace)) {
        // Edge from place to transition
        graphEdges.push({
          id: `edge-${nodeMap.get(sourcePlace)}-${transitionId}`,
          source: nodeMap.get(sourcePlace),
          target: transitionId,
          type: "default",
          style: { strokeWidth: 2, stroke: "#666" },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color: "#666",
          },
        });
      }

      if (targetPlace && nodeMap.has(targetPlace)) {
        // Edge from transition to place
        graphEdges.push({
          id: `edge-${transitionId}-${nodeMap.get(targetPlace)}`,
          source: transitionId,
          target: nodeMap.get(targetPlace),
          type: "default",
          style: { strokeWidth: 2, stroke: "#666" },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color: "#666",
          },
        });
      }
    });

    console.log("Generated graph:", {
      nodes: graphNodes.length,
      edges: graphEdges.length,
      transitions: transitionMap.size,
      places: nodeMap.size,
    });
    console.log("Node map:", Array.from(nodeMap.keys()));
    console.log("Sample edges:", graphEdges.slice(0, 3));

    return { nodes: graphNodes, edges: graphEdges };
  }, []);

  const applyLayout = useCallback(
    async (nodes, edges) => {
      if (nodes.length === 0) return;

      setIsLayouting(true);

      const graph = {
        id: "root",
        layoutOptions: {
          ...elkOptions,
          // Add generous overall padding to the graph
          "elk.padding": "[top=80,left=80,bottom=80,right=80]",
        },
        children: nodes.map((node) => ({
          id: node.id,
          // Increased dimensions with even more generous padding to ensure visible gaps
          width: node.type === "place" ? 280 : 260, // Max width + extra padding
          height: node.type === "place" ? 140 : 120, // Min height + extra padding
          // Add layout options for individual nodes with more padding
          layoutOptions: {
            "elk.padding": "[top=25,left=25,bottom=25,right=25]",
          },
        })),
        edges: edges.map((edge) => ({
          id: edge.id,
          sources: [edge.source],
          targets: [edge.target],
        })),
      };

      try {
        const layoutedGraph = await elk.layout(graph);

        const layoutedNodes = nodes.map((node) => {
          const layoutedNode = layoutedGraph.children?.find(
            (n) => n.id === node.id,
          );
          return {
            ...node,
            position: {
              x: layoutedNode?.x || Math.random() * 400,
              y: layoutedNode?.y || Math.random() * 400,
            },
          };
        });

        setNodes(layoutedNodes);
        setEdges(edges);
      } catch (error) {
        console.error("Layout error:", error);
        const layoutedNodes = nodes.map((node, index) => ({
          ...node,
          position: {
            x: (index % 5) * 150,
            y: Math.floor(index / 5) * 100,
          },
        }));
        setNodes(layoutedNodes);
        setEdges(edges);
      } finally {
        setIsLayouting(false);
      }
    },
    [elk, elkOptions, setNodes, setEdges],
  );

  useEffect(() => {
    if (petriNetData && !isLayouting) {
      const { nodes: graphNodes, edges: graphEdges } =
        convertPetriNetToGraph(petriNetData);
      if (graphNodes.length > 0) {
        applyLayout(graphNodes, graphEdges);
      } else {
        setNodes([]);
        setEdges([]);
      }
    }
  }, [petriNetData]);

  const handleLayoutDirectionChange = useCallback(() => {
    const newDirection = layoutDirection === "RIGHT" ? "DOWN" : "RIGHT";
    setLayoutDirection(newDirection);
  }, [layoutDirection]);

  useEffect(() => {
    if (nodes.length > 0 && !isLayouting) {
      applyLayout(nodes, edges);
    }
  }, [layoutDirection]);

  const processedEdges = useMemo(() => {
    return edges.map((edge) => ({
      ...edge,
      style: {
        ...edge.style,
        opacity: highlightedNodeId
          ? connectedElements.edgeIds.has(edge.id)
            ? 1
            : 0.3
          : 1,
        stroke:
          highlightedNodeId && connectedElements.edgeIds.has(edge.id)
            ? "#ff9800"
            : "#b1b1b7",
        strokeWidth:
          highlightedNodeId && connectedElements.edgeIds.has(edge.id) ? 3 : 1,
      },
    }));
  }, [edges, highlightedNodeId, connectedElements]);

  if (!petriNetData) {
    return (
      <Alert severity="info">No Petri net data available for this task.</Alert>
    );
  }

  if (isLayouting) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: 400,
        }}
      >
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Generating graph layout...</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: "100%",
        height: "80vh",
        minHeight: 500,
        maxHeight: 800,
        position: "relative",
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={processedEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onMove={onMove}
        nodeTypes={nodeTypes}
        nodesDraggable={nodesMoveable}
        fitView
        attributionPosition="bottom-left"
        minZoom={0.1}
        maxZoom={4}
        defaultViewport={{ x: 0, y: 0, zoom: 0.5 }}
        fitViewOptions={{
          padding: 0.2,
          includeHiddenNodes: false,
          minZoom: 0.1,
          maxZoom: 1.5,
        }}
      >
        <Background />
        <Controls />

        {showMiniMap && (
          <MiniMap
            nodeColor={(node) => {
              switch (node.data?.type) {
                case "substrate":
                  return "#1976d2";
                case "modifier":
                  return "#f57c00";
                case "product":
                  return "#388e3c";
                default:
                  return "#424242";
              }
            }}
            position="top-right"
          />
        )}

        <Panel position="top-left">
          <Paper sx={{ p: 2, minWidth: 250 }}>
            <Typography variant="h6" gutterBottom>
              Petri Net Graph
            </Typography>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Legend:
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Chip
                  size="small"
                  label="Substrates"
                  sx={{ backgroundColor: "#e3f2fd", color: "#1976d2" }}
                />
                <Chip
                  size="small"
                  label="Modifiers"
                  sx={{ backgroundColor: "#fff3e0", color: "#f57c00" }}
                />
                <Chip
                  size="small"
                  label="Products"
                  sx={{ backgroundColor: "#e8f5e8", color: "#388e3c" }}
                />
                <Chip
                  size="small"
                  label="Transitions"
                  sx={{ backgroundColor: "#fafafa", color: "#424242" }}
                />
              </Box>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={showMiniMap}
                    onChange={(e) => setShowMiniMap(e.target.checked)}
                    size="small"
                  />
                }
                label="Show MiniMap"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={nodesMoveable}
                    onChange={(e) => setNodesMoveable(e.target.checked)}
                    size="small"
                  />
                }
                label="Allow Node Movement"
              />
            </Box>

            <Box sx={{ mt: 2, pt: 2, borderTop: "1px solid #eee" }}>
              <Typography variant="caption" color="text.secondary">
                Nodes: {nodes.length} | Arcs: {edges.length}
              </Typography>
            </Box>
          </Paper>
        </Panel>
      </ReactFlow>
    </Box>
  );
};

const PetriNetGraphWrapper = ({
  petriNetData,
  onEvidenceClick,
  highlightRelationId,
}) => {
  return (
    <ReactFlowProvider>
      <PetriNetGraph
        petriNetData={petriNetData}
        onEvidenceClick={onEvidenceClick}
        highlightRelationId={highlightRelationId}
      />
    </ReactFlowProvider>
  );
};
export default PetriNetGraphWrapper;
