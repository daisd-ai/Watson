import React from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Button,
  Modal,
  IconButton,
} from "@mui/material";
import {
  Download as DownloadIcon,
  Close as CloseIcon,
} from "@mui/icons-material";

const FilesModal = ({ open, onClose, files, onDownload }) => {
  const getFileName = (filePath) => {
    if (!filePath) return "";
    return filePath.split("/")[filePath.split("/").length - 1];
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="files-modal-title"
      aria-describedby="files-modal-description"
    >
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: { xs: "90%", sm: "80%", md: "70%" },
          maxWidth: 800,
          maxHeight: "80vh",
          bgcolor: "background.paper",
          borderRadius: 2,
          boxShadow: 24,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            p: 2,
            borderBottom: "1px solid",
            borderBottomColor: "divider",
          }}
        >
          <Typography id="files-modal-title" variant="h6" color="text.primary">
            Files ({files?.length || 0})
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        <Box sx={{ p: 2, overflow: "auto", flexGrow: 1 }}>
          {files && files.length > 0 ? (
            <List>
              {files.map((file, index) => (
                <ListItem
                  key={index}
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                    mb: 1,
                  }}
                >
                  <ListItemText
                    primary={
                      <Typography variant="body1" color="text.primary">
                        {getFileName(file)}
                      </Typography>
                    }
                    secondary={
                      <Box>
                        {file && (
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<DownloadIcon />}
                            onClick={() => onDownload(file, getFileName(file))}
                          >
                            Download
                          </Button>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography color="text.secondary" textAlign="center">
              No files available
            </Typography>
          )}
        </Box>
      </Box>
    </Modal>
  );
};

export default FilesModal;
