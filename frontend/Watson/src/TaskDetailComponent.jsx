import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Tabs,
  Tab,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon,
  Folder as FolderIcon,
} from "@mui/icons-material";
import {
  getTask,
  downloadFile,
  getTaskChunks,
  getChunkDetails,
} from "./services/api";
import TaskBrowseTab from "./TaskBrowseTab";
import TaskSearchTab from "./TaskSearchTab";
import ErrorMessage from "./ErrorMessage";
import FilesModal from "./FilesModal";
import TaskStatusChip from "./TaskStatusChip";
import EvidenceModal from "./EvidenceModal";

const TaskDetailComponent = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filesModalOpen, setFilesModalOpen] = useState(false);

  // View toggle state
  const [activeTab, setActiveTab] = useState(0);

  // Chunk/graph-related state
  const [availableChunks, setAvailableChunks] = useState([]);
  const [selectedChunkIndex, setSelectedChunkIndex] = useState(0);
  const [currentGraphData, setCurrentGraphData] = useState(null);
  const [chunkLoading, setChunkLoading] = useState(false);
  const [chunkError, setChunkError] = useState(null);
  const [currentChunkSummary, setCurrentChunkSummary] = useState(null);
  const [currentChunkData, setCurrentChunkData] = useState(null);

  // Evidence modal state
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState(null);
  const [selectedRelation, setSelectedRelation] = useState(null);
  const [highlightRelationId, setHighlightRelationId] = useState(null);

  const refreshInterval = 5000; // 5 seconds

  const normalizeChunks = (response) => {
    if (Array.isArray(response?.files)) {
      const flattened = [];
      response.files.forEach((file) => {
        const fileName = file.file_name;
        const chunkIds = Array.isArray(file.chunks) ? file.chunks : [];
        chunkIds.forEach((chunkId, idx) => {
          if (!chunkId) return;
          flattened.push({
            id: chunkId,
            fileName,
            number: idx + 1,
          });
        });
      });
      return flattened;
    }
  };

  const buildPetriNetFromRelations = (chunkData) => {
    const relations = Array.isArray(chunkData?.relations)
      ? chunkData.relations
      : [];
    if (relations.length === 0) return null;

    const chunkId = chunkData.chunk_id;
    const substrates = new Set();
    const modifiers = new Set();
    const products = new Set();
    const edges = [];

    relations.forEach((rel) => {
      const transition = [rel.id, rel.text, chunkId];

      (rel.substrates || []).forEach((name) => {
        if (!name) return;
        substrates.add(name);
        edges.push([name, transition]);
      });

      (rel.modifiers || []).forEach((name) => {
        if (!name) return;
        modifiers.add(name);
        edges.push([name, transition]);
      });

      (rel.products || []).forEach((name) => {
        if (!name) return;
        products.add(name);
        edges.push([transition, name]);
      });
    });

    return {
      substrates: Array.from(substrates),
      modifiers: Array.from(modifiers),
      products: Array.from(products),
      edges,
    };
  };

  const needsAutoRefresh = (taskStatus) => {
    return taskStatus === "created" || taskStatus === "processing";
  };

  const fetchTask = async () => {
    setLoading(true);
    setError(null);
    try {
      const taskData = await getTask(taskId);
      setTask(taskData);

      const chunkResponse = await getTaskChunks(taskId);
      const normalizedChunks = normalizeChunks(chunkResponse);

      if (normalizedChunks.length > 0) {
        setAvailableChunks(normalizedChunks);
        setSelectedChunkIndex(0);
        await fetchChunk(normalizedChunks[0], 0);
      } else {
        setAvailableChunks([]);
        setCurrentGraphData(null);
        setCurrentChunkSummary(null);
        setCurrentChunkData(null);
      }
    } catch (err) {
      setError(err.message || "Failed to fetch task details");
    } finally {
      setLoading(false);
    }
  };

  const fetchChunk = async (chunk, index) => {
    if (!chunk?.id || !taskId) return;

    setChunkLoading(true);
    setChunkError(null);
    setCurrentChunkSummary(null);

    try {
      const chunkData = await getChunkDetails(taskId, chunk.id);
      setCurrentChunkData(chunkData);

      const graphData = buildPetriNetFromRelations(chunkData);

      setCurrentGraphData(graphData);
      setCurrentChunkSummary(chunkData.summary);
      setSelectedChunkIndex(index);
    } catch (err) {
      setChunkError(err.message || "Failed to fetch chunk data");
      setCurrentGraphData(null);
      setCurrentChunkData(null);
    } finally {
      setChunkLoading(false);
    }
  };

  const handleDownload = async (filePath, filename) => {
    try {
      const blob = await downloadFile(filePath);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download file:", err);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  const handleTabChange = (_event, newValue) => {
    setActiveTab(newValue);
  };

  const handleViewSearchResult = async (result) => {
    setActiveTab(0);
    setHighlightRelationId(result?.relation_id || null);
    const chunkId = result?.chunk_id;
    if (!chunkId || availableChunks.length === 0) return;
    const index = availableChunks.findIndex((c) => c.id === chunkId);
    if (index >= 0) {
      await fetchChunk(availableChunks[index], index);
    }
  };

  const handleChunkSelection = async (event) => {
    const newIndex = event.target.value;
    if (newIndex !== selectedChunkIndex && availableChunks[newIndex]) {
      await fetchChunk(availableChunks[newIndex], newIndex);
    }
  };

  const handlePreviousChunk = async () => {
    if (selectedChunkIndex > 0) {
      const newIndex = selectedChunkIndex - 1;
      await fetchChunk(availableChunks[newIndex], newIndex);
    }
  };

  const handleNextChunk = async () => {
    if (selectedChunkIndex < availableChunks.length - 1) {
      const newIndex = selectedChunkIndex + 1;
      await fetchChunk(availableChunks[newIndex], newIndex);
    }
  };

  const handleEvidenceClick = (evidenceId, chunkId, relation) => {
    setSelectedEvidenceId(evidenceId);
    setSelectedRelation(relation);
    setEvidenceModalOpen(true);
  };

  const handleEvidenceModalClose = () => {
    setEvidenceModalOpen(false);
    setSelectedEvidenceId(null);
    setSelectedRelation(null);
  };

  useEffect(() => {
    if (taskId) {
      fetchTask();
    }
  }, [taskId]);

  useEffect(() => {
    if (!task || !needsAutoRefresh(task.status)) {
      return;
    }

    const interval = setInterval(() => {
      if (!loading) {
        fetchTask();
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [task?.status, loading, refreshInterval]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <ErrorMessage error={error} />;
  }

  if (!task) {
    return <ErrorMessage title="Task not found" />;
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        width: "100%",
        background: "linear-gradient(to bottom, #020917, #101725)",
        padding: "16px 0",
      }}
    >
      <Card sx={{ maxWidth: "95%", margin: "auto", mb: 4 }}>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 3,
            }}
          >
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate("/")}
            >
              Back to Tasks
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchTask}
              disabled={loading}
            >
              Refresh
            </Button>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                mb: 2,
              }}
            >
              <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
                {task.task_name || "Unnamed Task"}
              </Typography>
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <TaskStatusChip
                  status={task.status}
                  stage={task.stage}
                  size="large"
                />
                {task.files && task.files.length > 0 && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<FolderIcon />}
                    onClick={() => setFilesModalOpen(true)}
                  >
                    Files ({task.files.length})
                  </Button>
                )}
              </Box>
            </Box>
            <Typography variant="subtitle1" color="text.secondary">
              Task ID: {task.task_id}
            </Typography>
            {task.task_description && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                <strong>Description:</strong> {task.task_description}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              <strong>Created:</strong> {formatDate(task.created_at)}
            </Typography>
            {task.updated_at && (
              <Typography variant="body2" color="text.secondary">
                <strong>Updated:</strong> {formatDate(task.updated_at)}
              </Typography>
            )}
          </Box>

          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            textColor="primary"
            indicatorColor="primary"
            sx={{ mb: 3 }}
          >
            <Tab label="Browse" />
            <Tab label="Search" />
          </Tabs>

          <Box sx={{ display: activeTab === 0 ? "block" : "none" }}>
            <TaskBrowseTab
              task={task}
              availableChunks={availableChunks}
              selectedChunkIndex={selectedChunkIndex}
              chunkLoading={chunkLoading}
              chunkError={chunkError}
              currentChunkSummary={currentChunkSummary}
              currentGraphData={currentGraphData}
              highlightRelationId={highlightRelationId}
              handleChunkSelection={handleChunkSelection}
              handlePreviousChunk={handlePreviousChunk}
              handleNextChunk={handleNextChunk}
              handleEvidenceClick={handleEvidenceClick}
            />
          </Box>

          <Box sx={{ display: activeTab === 1 ? "block" : "none" }}>
            <TaskSearchTab
              taskId={taskId}
              onViewResult={handleViewSearchResult}
            />
          </Box>

          <FilesModal
            open={filesModalOpen}
            onClose={() => setFilesModalOpen(false)}
            files={task?.files}
            onDownload={handleDownload}
          />

          <EvidenceModal
            open={evidenceModalOpen}
            onClose={handleEvidenceModalClose}
            evidenceId={selectedEvidenceId}
            chunkData={currentChunkData}
            relation={selectedRelation}
          />
        </CardContent>
      </Card>
    </Box>
  );
};

export default TaskDetailComponent;
