import React from "react";
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  Alert,
  Divider,
  CircularProgress,
} from "@mui/material";
import {
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
} from "@mui/icons-material";
import PetriNetGraph from "./PetriNetGraph";

const TaskBrowseTab = ({
  task,
  availableChunks,
  selectedChunkIndex,
  chunkLoading,
  chunkError,
  currentChunkSummary,
  currentGraphData,
  highlightRelationId,
  handleChunkSelection,
  handlePreviousChunk,
  handleNextChunk,
  handleEvidenceClick,
}) => {
  return (
    <>
      <Divider sx={{ mb: 3 }} />

      {availableChunks.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Petri Net Graphs ({availableChunks.length} chunks)
          </Typography>

          <Paper sx={{ p: 2, mb: 2 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                flexWrap: "wrap",
              }}
            >
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Select Chunk</InputLabel>
                <Select
                  value={selectedChunkIndex}
                  onChange={handleChunkSelection}
                  disabled={chunkLoading}
                  label="Select Chunk"
                >
                  {availableChunks.map((chunk, index) => (
                    <MenuItem key={chunk.id} value={index}>
                      Chunk {chunk.number ?? index + 1} – {chunk.fileName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<NavigateBeforeIcon />}
                  onClick={handlePreviousChunk}
                  disabled={selectedChunkIndex === 0 || chunkLoading}
                >
                  Previous
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  endIcon={<NavigateNextIcon />}
                  onClick={handleNextChunk}
                  disabled={
                    selectedChunkIndex === availableChunks.length - 1 ||
                    chunkLoading
                  }
                >
                  Next
                </Button>
              </Box>

              <Chip
                label={`${selectedChunkIndex + 1} of ${availableChunks.length}`}
                variant="outlined"
                size="small"
              />
            </Box>

            {currentChunkSummary && (
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  backgroundColor: "#f8f9fa",
                  borderRadius: 1,
                  border: "1px solid #e0e0e0",
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{ mb: 1, fontWeight: 600, color: "#666" }}
                >
                  Chunk Summary:
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ lineHeight: 1.6 }}
                >
                  {currentChunkSummary}
                </Typography>
              </Box>
            )}
          </Paper>

          <Paper sx={{ p: 2 }}>
            {chunkLoading && (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: 200,
                }}
              >
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Loading graph...</Typography>
              </Box>
            )}

            {chunkError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {chunkError}
              </Alert>
            )}

            {!chunkLoading && !chunkError && currentGraphData && (
              <PetriNetGraph
                petriNetData={currentGraphData}
                highlightRelationId={highlightRelationId}
                onEvidenceClick={handleEvidenceClick}
              />
            )}

            {!chunkLoading &&
              !chunkError &&
              !currentGraphData &&
              availableChunks.length > 0 && (
                <Alert severity="info">
                  No graph data available for the selected chunk.
                </Alert>
              )}
          </Paper>
        </Box>
      )}

      {availableChunks.length === 0 && task && task.status === "completed" && (
        <Box sx={{ mb: 3 }}>
          <Alert severity="info">
            No Petri net graphs were generated for this task.
          </Alert>
        </Box>
      )}

      <Box sx={{ mb: 2 }}>
        <Paper sx={{ p: 2, width: "100%" }}>
          <Typography variant="h6" gutterBottom>
            Processing Information
          </Typography>
          <Box sx={{ space: 1 }}>
            {task.progress !== undefined && (
              <Typography variant="body2" color="text.secondary">
                <strong>Progress:</strong> {task.progress}%
              </Typography>
            )}
            {task.error_message && (
              <Typography variant="body2" color="error.main">
                <strong>Error:</strong> {task.error_message}
              </Typography>
            )}
            {availableChunks.length > 0 && (
              <Typography variant="body2" color="text.secondary">
                <strong>Graphs Generated:</strong> Successfully created{" "}
                {availableChunks.length} graph
                {availableChunks.length !== 1 ? "s" : ""} from document chunks.
              </Typography>
            )}
            {currentGraphData && (
              <Typography variant="body2" color="text.secondary">
                <strong>Current Graph:</strong> Contains{" "}
                {currentGraphData.substrates?.length || 0} substrates,{" "}
                {currentGraphData.modifiers?.length || 0} modifiers,{" "}
                {currentGraphData.products?.length || 0} products, and{" "}
                {currentGraphData.edges?.length || 0} arcs.
              </Typography>
            )}
            {task.result &&
              typeof task.result === "object" &&
              !task.result.petri_nets &&
              !task.result.petri_net &&
              !Array.isArray(task.result) && (
                <Typography variant="body2" color="text.secondary">
                  <strong>Result:</strong>{" "}
                  {JSON.stringify(task.result, null, 2)}
                </Typography>
              )}
          </Box>
        </Paper>
      </Box>
    </>
  );
};

export default TaskBrowseTab;
