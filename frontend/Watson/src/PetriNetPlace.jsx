import React from "react";
import { Handle, Position, NodeToolbar } from "@xyflow/react";
import { Box, Typography, Chip, Button } from "@mui/material";
import { Highlight as HighlightIcon } from "@mui/icons-material";

const PetriNetPlace = ({
  id,
  data,
  selected,
  onHighlightClick,
  highlightedNodeId,
  connectedElements,
  zoomLevel = 1,
}) => {
  const getPlaceColor = (type) => {
    switch (type) {
      case "substrate":
        return {
          background: "#e3f2fd",
          border: "#1976d2",
          color: "#1976d2",
        };
      case "modifier":
        return {
          background: "#fff3e0",
          border: "#f57c00",
          color: "#f57c00",
        };
      case "product":
        return {
          background: "#e8f5e8",
          border: "#388e3c",
          color: "#388e3c",
        };
      default:
        return {
          background: "#f5f5f5",
          border: "#757575",
          color: "#757575",
        };
    }
  };

  const colors = getPlaceColor(data.type);

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
            transform: `scale(${Math.max(0.5, Math.min(1, zoomLevel))})`,
            transformOrigin: "center bottom",
            transition: "transform 0.2s ease",
          }}
        >
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
          minWidth: 120,
          maxWidth: 200,
          minHeight: 60,
          borderRadius: "50%",
          border: `3px solid ${isHighlighted ? "#ff9800" : colors.border}`,
          background: isHighlighted ? "#fff3e0" : colors.background,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 2,
          boxShadow: selected
            ? `0 0 0 2px ${colors.border}`
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
          },
        }}
      >
        <Handle
          type="target"
          position={Position.Left}
          style={{
            background: colors.border,
            border: `2px solid ${colors.background}`,
            width: 12,
            height: 12,
          }}
        />

        <Handle
          type="source"
          position={Position.Right}
          style={{
            background: colors.border,
            border: `2px solid ${colors.background}`,
            width: 12,
            height: 12,
          }}
        />

        <Chip
          label={data.type}
          size="small"
          sx={{
            position: "absolute",
            top: -8,
            backgroundColor: colors.border,
            color: "white",
            fontSize: "0.7rem",
            height: 18,
            "& .MuiChip-label": {
              px: 1,
            },
          }}
        />

        <Typography
          variant="body2"
          sx={{
            color: colors.color,
            textAlign: "center",
            fontWeight: 500,
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

export default PetriNetPlace;
