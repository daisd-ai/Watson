import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  ChevronRight as ChevronRightIcon,
  Sort as SortIcon,
} from "@mui/icons-material";
import { getTasks } from "./services/api";
import TaskStatusChip from "./TaskStatusChip";

const TaskListComponent = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [totalTasks, setTotalTasks] = useState(0);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [orderBy, setOrderBy] = useState(-1); // -1 for newest first, 1 for oldest first

  const tasksPerPage = 5;
  const refreshInterval = 5000; // 5 seconds

  const fetchTasks = async (
    page = 1,
    status = statusFilter,
    order = orderBy,
  ) => {
    setLoading(true);
    setError(null);
    try {
      const skip = (page - 1) * tasksPerPage;
      const response = await getTasks({
        status: status || null,
        limit: tasksPerPage,
        skip,
        order,
      });
      setTasks(response.tasks || []);
      setTotalTasks(response.total || response.tasks?.length || 0);
    } catch (err) {
      setError(err.message || "Failed to fetch tasks");
    } finally {
      setLoading(false);
    }
  };

  const handleTaskClick = (taskId) => {
    navigate(`/task/${taskId}`);
  };

  const handlePageChange = (event, value) => {
    setCurrentPage(value);
    fetchTasks(value, statusFilter, orderBy);
  };

  const handleStatusFilterChange = (event) => {
    const newStatus = event.target.value;
    setStatusFilter(newStatus);
    setCurrentPage(1);
    fetchTasks(1, newStatus, orderBy);
  };

  const handleOrderChange = (event) => {
    const newOrder = parseInt(event.target.value);
    setOrderBy(newOrder);
    setCurrentPage(1);
    fetchTasks(1, statusFilter, newOrder);
  };

  const handleRefresh = () => {
    fetchTasks(currentPage, statusFilter, orderBy);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const interval = setInterval(() => {
      if (!loading) {
        fetchTasks(currentPage, statusFilter, orderBy);
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [
    autoRefreshEnabled,
    loading,
    currentPage,
    statusFilter,
    orderBy,
    refreshInterval,
  ]);

  useEffect(() => {
    const handleRefreshTasks = () => {
      fetchTasks(currentPage, statusFilter, orderBy);
    };

    window.addEventListener("refreshTaskList", handleRefreshTasks);
    return () =>
      window.removeEventListener("refreshTaskList", handleRefreshTasks);
  }, [currentPage, statusFilter, orderBy]);

  return (
    <Card sx={{ maxWidth: 800, margin: "auto", mt: 4 }}>
      <CardContent>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h5" component="h2">
            Task History
          </Typography>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={handleStatusFilterChange}
              >
                <MenuItem value="">All Tasks</MenuItem>
                <MenuItem value="created">Created</MenuItem>
                <MenuItem value="processing">Processing</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="failed">Failed</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Order</InputLabel>
              <Select
                value={orderBy}
                label="Order"
                onChange={handleOrderChange}
                startAdornment={<SortIcon sx={{ mr: 1, fontSize: 16 }} />}
              >
                <MenuItem value={-1}>Newest First</MenuItem>
                <MenuItem value={1}>Oldest First</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              disabled={loading}
            >
              Refresh
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
            <CircularProgress />
          </Box>
        ) : tasks.length === 0 ? (
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ textAlign: "center", p: 3 }}
          >
            No tasks found. Upload some files to get started!
          </Typography>
        ) : (
          <Box>
            {tasks.map((task) => (
              <Paper
                key={task.task_id}
                sx={{
                  mb: 1,
                  cursor: "pointer",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    backgroundColor: "action.hover",
                    transform: "translateY(-1px)",
                    boxShadow: 2,
                  },
                }}
                onClick={() => handleTaskClick(task.task_id)}
              >
                <Box sx={{ p: 2 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                      gap: 2,
                    }}
                  >
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" gutterBottom>
                        {task.task_name || "Unnamed Task"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        ID: {task.task_id}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <TaskStatusChip
                        status={task.status}
                        stage={task.stage}
                        size="small"
                      />
                      <ChevronRightIcon color="action" />
                    </Box>
                  </Box>
                </Box>
              </Paper>
            ))}

            {tasks.length > 0 && (
              <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
                <Pagination
                  count={Math.ceil(totalTasks / tasksPerPage)}
                  page={currentPage}
                  onChange={handlePageChange}
                  color="primary"
                  showFirstButton
                  showLastButton
                />
              </Box>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default TaskListComponent;
