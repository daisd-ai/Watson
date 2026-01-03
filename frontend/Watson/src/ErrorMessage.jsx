import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
} from "@mui/material";
import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";

const ErrorMessage = ({
  error,
  title = "Task not found",
  severity = "error",
  showBackButton = true,
  backButtonText = "Back to Tasks",
  navigateTo = "/",
  maxWidth = 400,
}) => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        width: "100vw",
        position: "fixed",
        top: 0,
        left: 0,
        background: "linear-gradient(to bottom, #020917, #101725)",
        p: 4,
      }}
    >
      <Card
        sx={{
          maxWidth: maxWidth,
          width: "100%",
          bgcolor: "background.paper",
          boxShadow: 3,
          borderRadius: 2,
        }}
      >
        <CardContent sx={{ textAlign: "center" }}>
          {error ? (
            <Alert severity={severity} sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : (
            <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
              {title}
            </Typography>
          )}
          {showBackButton && (
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate(navigateTo)}
            >
              {backButtonText}
            </Button>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default ErrorMessage;
