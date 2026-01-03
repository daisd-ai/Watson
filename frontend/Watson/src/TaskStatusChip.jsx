import React from "react";
import { Chip, CircularProgress, Box } from "@mui/material";
import PropTypes from "prop-types";

const TaskStatusChip = ({ status, stage, size = "small", sx = {} }) => {
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "success";
      case "created":
        return "info";
      case "processing":
        return "warning";
      case "failed":
      case "error":
        return "error";
      default:
        return "default";
    }
  };

  const getChipLabel = () => {
    const statusLower = status?.toLowerCase();
    console.log("Status:", statusLower);
    console.log("Stage:", stage);
    if (statusLower === "processing" && stage) {
      return `Processing: ${stage}`;
    }
    return status || "Unknown";
  };

  const getChipIcon = () => {
    if (
      status?.toLowerCase() === "pending" ||
      status?.toLowerCase() === "processing"
    ) {
      return (
        <CircularProgress
          size={size === "large" ? 16 : size === "medium" ? 14 : 12}
          sx={{ color: "inherit" }}
        />
      );
    }
    return null;
  };

  return (
    <Chip
      label={getChipLabel()}
      color={getStatusColor(status)}
      size={size}
      icon={getChipIcon()}
      sx={sx}
    />
  );
};

TaskStatusChip.propTypes = {
  status: PropTypes.string,
  stage: PropTypes.string,
  size: PropTypes.oneOf(["small", "medium", "large"]),
  sx: PropTypes.object,
};

export default TaskStatusChip;
