import React, { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  IconButton,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  CloudUpload as UploadIcon,
} from "@mui/icons-material";
import { uploadTaskFiles } from "./services/api";

const FileUploadComponent = () => {
  const [taskName, setTaskName] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files);
    setFiles((prevFiles) => [...prevFiles, ...selectedFiles]);
    setError(null);
  };

  const removeFile = (index) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!taskName.trim()) {
      setError("Task name is required");
      return;
    }

    if (files.length === 0) {
      setError("Please select at least one file");
      return;
    }

    setUploading(true);
    setError(null);
    setUploadResult(null);

    try {
      const result = await uploadTaskFiles({
        taskName,
        description,
        files,
      });

      setUploadResult(result);

      setTaskName("");
      setDescription("");
      setFiles([]);

      const fileInput = document.getElementById("file-input");
      if (fileInput) {
        fileInput.value = "";
      }

      window.dispatchEvent(new CustomEvent("refreshTaskList"));
    } catch (err) {
      setError(err.message || "An error occurred during upload");
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <Card sx={{ maxWidth: 600, margin: "auto", mt: 4 }}>
      <CardContent>
        <Typography variant="h5" component="h2" gutterBottom>
          Upload Task Files
        </Typography>

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="Task Name"
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            margin="normal"
            required
            disabled={uploading}
          />

          <TextField
            fullWidth
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            margin="normal"
            multiline
            required
            rows={3}
            disabled={uploading}
          />

          <Box sx={{ mt: 2, mb: 2 }}>
            <input
              id="file-input"
              type="file"
              multiple
              onChange={handleFileChange}
              style={{ display: "none" }}
              accept=".pdf,.doc,.docx,.txt"
              disabled={uploading}
            />
            <label htmlFor="file-input">
              <Button
                variant="outlined"
                component="span"
                startIcon={<UploadIcon />}
                disabled={uploading}
                fullWidth
              >
                Select Files
              </Button>
            </label>
          </Box>

          {files.length > 0 && (
            <Box sx={{ mt: 2, mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Selected Files ({files.length})
              </Typography>
              <List>
                {files.map((file, index) => (
                  <ListItem
                    key={index}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        onClick={() => removeFile(index)}
                        disabled={uploading}
                      >
                        <DeleteIcon />
                      </IconButton>
                    }
                  >
                    <ListItemText
                      primary={file.name}
                      secondary={formatFileSize(file.size)}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
              {error}
            </Alert>
          )}

          {uploadResult && (
            <Alert severity="success" sx={{ mt: 2, mb: 2 }}>
              <Typography variant="body2">
                <strong>Upload successful!</strong>
              </Typography>
              <Typography variant="body2">
                Task ID: {uploadResult.task_id}
              </Typography>
              <Typography variant="body2">
                Status: {uploadResult.status}
              </Typography>
              <Typography variant="body2">
                Files uploaded: {uploadResult.files?.length || 0}
              </Typography>
            </Alert>
          )}

          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={uploading || files.length === 0 || !taskName.trim()}
            sx={{ mt: 2 }}
          >
            {uploading ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Uploading...
              </>
            ) : (
              "Upload Files"
            )}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default FileUploadComponent;
