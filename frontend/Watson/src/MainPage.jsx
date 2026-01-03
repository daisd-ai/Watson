import React from "react";
import { Container, Box } from "@mui/material";
import FileUploadComponent from "./FileUploadComponent";
import TaskListComponent from "./TaskListComponent";

const MainPage = () => {
  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <div className="content">
          <h1>Watson Document Processing</h1>
          <p>Upload files for processing and task management.</p>
          <Box
            sx={{
              display: "flex",
              gap: 3,
              alignItems: "flex-start",
              flexWrap: "wrap",
              "@media (max-width: 1200px)": {
                flexDirection: "column",
                alignItems: "center",
              },
            }}
          >
            <Box sx={{ flex: "1 1 500px", minWidth: "400px" }}>
              <FileUploadComponent />
            </Box>
            <Box sx={{ flex: "1 1 500px", minWidth: "400px" }}>
              <TaskListComponent />
            </Box>
          </Box>
        </div>
      </Box>
    </Container>
  );
};

export default MainPage;
