import React, { useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  IconButton,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
const EvidenceModal = ({ open, onClose, evidenceId, chunkData, relation }) => {
  const resolvedChunkText = useMemo(() => {
    if (!chunkData) return null;
    return (
      chunkData.text ||
      chunkData.content ||
      chunkData.chunk_text ||
      chunkData?.chunk?.text ||
      chunkData?.content?.text ||
      null
    );
  }, [chunkData]);

  const resolvedFileName = useMemo(() => {
    if (!chunkData) return null;
    return (
      chunkData.file_name ||
      chunkData.filename ||
      chunkData.fileName ||
      chunkData?.chunk?.file_name ||
      null
    );
  }, [chunkData]);

  const resolvedEvidenceText = useMemo(() => {
    if (!chunkData) return relation?.evidence || null;

    const evidenceFromRelation = chunkData.relations?.find(
      (rel) => rel.id === evidenceId,
    );

    return (
      chunkData.evidence_texts?.[evidenceId] ||
      chunkData.evidences?.[evidenceId] ||
      evidenceFromRelation?.evidence ||
      relation?.evidence ||
      null
    );
  }, [chunkData, evidenceId, relation]);

  const relationLabel = useMemo(() => {
    if (relation) return relation;
    const fallback = chunkData?.relations?.find((rel) => rel.id === evidenceId);
    return fallback?.text;
  }, [relation, chunkData, evidenceId]);

  const normalizeText = (text) => {
    if (!text) return text;

    return (
      text
        // First handle the /uni[HEX] pattern specific to PDF extraction
        .replace(/\/uni([A-F0-9]{4})/g, (match, hex) => {
          try {
            return String.fromCharCode(parseInt(hex, 16));
          } catch (e) {
            return match;
          }
        })
        // Use Unicode normalization to handle ligatures and combining characters
        .normalize("NFKD")
        // Clean up any remaining non-printable characters
        .replace(/[\u00A0]/g, " ")
    ); // non-breaking space to regular space
  };

  const highlightEvidence = (text, evidence) => {
    if (!text || !evidence) return text;

    // Normalize both text and evidence before processing
    const normalizedText = normalizeText(text);
    const normalizedEvidence = normalizeText(evidence);

    // Create a case-insensitive regex to find the evidence text
    const regex = new RegExp(
      `(${normalizedEvidence.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi",
    );

    // Split the text and rebuild with highlighting
    const parts = normalizedText.split(regex);

    return parts.map((part, index) => {
      if (regex.test(part)) {
        return (
          <span
            key={index}
            style={{
              backgroundColor: "#ffeb3b",
              fontWeight: "bold",
              padding: "2px 4px",
              borderRadius: "3px",
            }}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { height: "80vh" },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="h6">Evidence Details</Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        {evidenceId && (
          <Typography variant="caption" color="text.secondary">
            Evidence ID: {evidenceId}
          </Typography>
        )}
      </DialogTitle>

      <DialogContent dividers sx={{ height: "100%" }}>
        {!chunkData && (
          <Alert severity="info">No evidence data available.</Alert>
        )}

        {chunkData && (
          <Box>
            {relationLabel && (
              <>
                <Typography
                  variant="subtitle2"
                  gutterBottom
                  sx={{ fontWeight: "bold" }}
                >
                  Relation:
                </Typography>
                <Box
                  sx={{
                    p: 2,
                    backgroundColor: "#e8f5e8",
                    borderRadius: 1,
                    border: "1px solid #4caf50",
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: "medium" }}>
                    {relationLabel}
                  </Typography>
                </Box>
              </>
            )}
            <Typography
              variant="subtitle2"
              gutterBottom
              sx={{ fontWeight: "bold", mt: relationLabel ? 3 : 0 }}
            >
              Document Chunk:
            </Typography>
            {resolvedFileName && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mb: 2, display: "block" }}
              >
                File: {resolvedFileName}
              </Typography>
            )}
            {resolvedChunkText ? (
              <Box
                sx={{
                  p: 2,
                  backgroundColor: "#f5f5f5",
                  borderRadius: 1,
                  border: "1px solid #e0e0e0",
                  maxHeight: "400px",
                  overflowY: "auto",
                  lineHeight: 1.6,
                }}
              >
                <Typography
                  variant="body2"
                  component="div"
                  sx={{
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {highlightEvidence(resolvedChunkText, resolvedEvidenceText)}
                </Typography>
              </Box>
            ) : (
              <Alert severity="info" sx={{ mt: 1 }}>
                No chunk text available for this evidence.
              </Alert>
            )}

            <Typography
              variant="subtitle2"
              sx={{ mt: 3, mb: 1, fontWeight: "bold" }}
            >
              Evidence Text:
            </Typography>
            {resolvedEvidenceText ? (
              <Box
                sx={{
                  p: 2,
                  backgroundColor: "#fff3e0",
                  borderRadius: 1,
                  border: "1px solid #ffb74d",
                }}
              >
                <Typography variant="body2" sx={{ fontStyle: "italic" }}>
                  "{normalizeText(resolvedEvidenceText)}"
                </Typography>
              </Box>
            ) : (
              <Alert severity="info" sx={{ mt: 1 }}>
                No evidence text available for this transition.
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EvidenceModal;
