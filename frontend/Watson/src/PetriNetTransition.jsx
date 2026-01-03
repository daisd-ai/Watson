import React from "react";
import { Handle, Position, NodeToolbar } from "@xyflow/react";
import { Box, Typography, Button } from "@mui/material";
import {
  Visibility as VisibilityIcon,
  Highlight as HighlightIcon,
} from "@mui/icons-material";

const PetriNetTransition = ({
  id,
  data,
  selected,
  onEvidenceClick,
  onHighlightClick,
  highlightedNodeId,
  connectedElements,
  zoomLevel = 1,
}) => {
  const transitionColor = {
    background: "#fafafa",
    border: "#424242",
    color: "#424242",
  };

  const handleEvidenceClick = () => {
    if (onEvidenceClick && data.evidence && data.chunkId) {
      onEvidenceClick(data.evidence, data.chunkId, data.relation);
    }
  };

  const handleHighlightClick = () => {
    if (onHighlightClick) {
      onHighlightClick(id);
    }
  };

  const isHighlighted = highlightedNodeId
    ? connectedElements.nodeIds.has(id)
    : false;
  const isDimmed = highlightedNodeId && !connectedElements.nodeIds.has(id);

  return (
    <>
      <NodeToolbar isVisible={selected || isHighlighted} position="top">
        <Box
          sx={{
            display: "flex",
            gap: 1,
            transform: `scale(${Math.max(0.5, Math.min(1, zoomLevel))})`,
            transformOrigin: "center bottom",
            transition: "transform 0.2s ease",
          }}
        >
          <Button
            variant="contained"
            size="small"
            startIcon={<VisibilityIcon />}
            onClick={handleEvidenceClick}
            disabled={!data.evidence || !data.chunkId}
            sx={{
              backgroundColor: "#2196f3",
              "&:hover": {
                backgroundColor: "#1976d2",
              },
              fontSize: "0.75rem",
              py: 0.5,
              px: 1,
            }}
          >
            View Evidence
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<HighlightIcon />}
            onClick={handleHighlightClick}
            sx={{
              borderColor: "#ff9800",
              color: "#ff9800",
              "&:hover": {
                backgroundColor: "#fff3e0",
                borderColor: "#f57c00",
              },
              fontSize: "0.75rem",
              py: 0.5,
              px: 1,
            }}
          >
            Highlight
          </Button>
        </Box>
      </NodeToolbar>

      <Box
        sx={{
          minWidth: 100,
          maxWidth: 180,
          minHeight: 40,
          borderRadius: 1,
          border: `3px solid ${isHighlighted ? "#ff9800" : transitionColor.border}`,
          background: isHighlighted ? "#fff3e0" : transitionColor.background,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 1.5,
          boxShadow: selected
            ? `0 0 0 2px ${transitionColor.border}`
            : isHighlighted
              ? "0 0 10px rgba(255, 152, 0, 0.5)"
              : "0 2px 4px rgba(0,0,0,0.1)",
          position: "relative",
          cursor: "pointer",
          transition: "all 0.2s ease",
          opacity: isDimmed ? 0.3 : 1,
          "&:hover": {
            transform: isDimmed ? "none" : "scale(1.05)",
            boxShadow: isDimmed
              ? "0 2px 4px rgba(0,0,0,0.1)"
              : isHighlighted
                ? "0 0 15px rgba(255, 152, 0, 0.7)"
                : "0 4px 8px rgba(0,0,0,0.15)",
            backgroundColor: isDimmed
              ? transitionColor.background
              : isHighlighted
                ? "#fff3e0"
                : "#f0f0f0",
          },
        }}
      >
        <Handle
          type="target"
          position={Position.Left}
          style={{
            background: transitionColor.border,
            border: `2px solid ${transitionColor.background}`,
            width: 12,
            height: 12,
          }}
        />

        <Handle
          type="source"
          position={Position.Right}
          style={{
            background: transitionColor.border,
            border: `2px solid ${transitionColor.background}`,
            width: 12,
            height: 12,
          }}
        />

        <Typography
          variant="body2"
          sx={{
            color: transitionColor.color,
            textAlign: "center",
            fontWeight: 600,
            fontSize: "0.8rem",
            lineHeight: 1.2,
            wordBreak: "break-word",
            hyphens: "auto",
          }}
        >
          {data.label}
        </Typography>
      </Box>
    </>
  );
};

export default PetriNetTransition;
