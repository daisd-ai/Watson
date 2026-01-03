import React, { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  TextField,
  InputAdornment,
  Button,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Collapse,
  Chip,
} from "@mui/material";
import {
  Search as SearchIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
} from "@mui/icons-material";
import { searchTaskRelations } from "./services/api";

const TaskSearchTab = ({ taskId, onViewResult }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTopK, setSearchTopK] = useState(15);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [expanded, setExpanded] = useState({});

  const handleSearch = async () => {
    if (!searchQuery?.trim()) {
      setSearchError("Please enter a search query.");
      return;
    }

    setSearchLoading(true);
    setSearchError(null);

    try {
      const response = await searchTaskRelations({
        taskId,
        query: searchQuery.trim(),
        topK: Number(searchTopK) || 15,
      });
      setSearchResults(response?.results || []);
      setExpanded({});
    } catch (err) {
      setSearchError(err.message || "Search failed");
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const toggleRow = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderChips = (items, color, bg) => {
    if (!items || items.length === 0)
      return <Typography variant="body2">-</Typography>;
    return (
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
        {items.map((item, idx) => (
          <Chip
            key={`${item}-${idx}`}
            label={item}
            size="small"
            sx={{ backgroundColor: bg, color: color, fontWeight: 600 }}
          />
        ))}
      </Box>
    );
  };

  return (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Search
        </Typography>

        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
            alignItems: "center",
            mb: 2,
          }}
        >
          <TextField
            label="Query"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            label="Top K"
            type="number"
            value={searchTopK}
            onChange={(e) => setSearchTopK(e.target.value)}
            inputProps={{ min: 1, max: 100 }}
            sx={{ width: 140 }}
          />
          <Button
            variant="contained"
            onClick={handleSearch}
            disabled={searchLoading}
          >
            {searchLoading ? "Searching..." : "Search"}
          </Button>
        </Box>

        {searchError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {searchError}
          </Alert>
        )}

        {searchLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
            <CircularProgress />
          </Box>
        ) : searchResults.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No results yet. Run a search to see matches.
          </Typography>
        ) : (
          <TableContainer component={Paper} sx={{ mt: 1 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell width={48} />
                  <TableCell>Relation</TableCell>
                  <TableCell align="center">Action</TableCell>
                  <TableCell align="right">Score</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {searchResults.map((result) => {
                  const open = expanded[result.relation_id] || false;
                  return (
                    <React.Fragment key={result.relation_id}>
                      <TableRow hover>
                        <TableCell padding="checkbox">
                          <IconButton
                            size="small"
                            onClick={() => toggleRow(result.relation_id)}
                          >
                            {open ? (
                              <KeyboardArrowUpIcon />
                            ) : (
                              <KeyboardArrowDownIcon />
                            )}
                          </IconButton>
                        </TableCell>
                        <TableCell sx={{ maxWidth: 320 }}>
                          <Typography variant="body2" noWrap>
                            {result.relation_text}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => onViewResult?.(result)}
                          >
                            View
                          </Button>
                        </TableCell>
                        <TableCell align="right" sx={{ minWidth: 80 }}>
                          {(result.similarity_score ?? 0).toFixed(4)}
                        </TableCell>
                      </TableRow>

                      <TableRow>
                        <TableCell colSpan={4} sx={{ p: 0, border: 0 }}>
                          <Collapse in={open} timeout="auto" unmountOnExit>
                            <Box
                              sx={{ px: 3, py: 1.5, bgcolor: "action.hover" }}
                            >
                              <Box
                                sx={{
                                  p: 1.5,
                                  borderRadius: 1,
                                  border: "1px solid #4caf50",
                                  backgroundColor: "#e8f5e8",
                                  mb: 1.5,
                                }}
                              >
                                <Typography
                                  variant="subtitle2"
                                  sx={{ color: "#2e7d32", mb: 0.5 }}
                                >
                                  Relation
                                </Typography>
                                <Typography
                                  variant="body2"
                                  sx={{ fontWeight: 600 }}
                                >
                                  {result.relation_text || "-"}
                                </Typography>
                              </Box>

                              <Box
                                sx={{
                                  p: 1.5,
                                  borderRadius: 1,
                                  border: "1px solid #ffb74d",
                                  backgroundColor: "#fff3e0",
                                  mb: 1.5,
                                }}
                              >
                                <Typography
                                  variant="subtitle2"
                                  sx={{ color: "#f57c00", mb: 0.5 }}
                                >
                                  Evidence
                                </Typography>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    whiteSpace: "pre-wrap",
                                    lineHeight: 1.6,
                                  }}
                                >
                                  {result.evidence || "-"}
                                </Typography>
                              </Box>

                              <Box
                                sx={{
                                  display: "grid",
                                  gap: 1.5,
                                  gridTemplateColumns:
                                    "repeat(auto-fit, minmax(200px, 1fr))",
                                }}
                              >
                                <Box>
                                  <Typography
                                    variant="subtitle2"
                                    sx={{ color: "#1976d2", mb: 0.5 }}
                                  >
                                    Substrates
                                  </Typography>
                                  {renderChips(
                                    result.substrates,
                                    "#1976d2",
                                    "#e3f2fd",
                                  )}
                                </Box>
                                <Box>
                                  <Typography
                                    variant="subtitle2"
                                    sx={{ color: "#f57c00", mb: 0.5 }}
                                  >
                                    Modifiers
                                  </Typography>
                                  {renderChips(
                                    result.modifiers,
                                    "#f57c00",
                                    "#fff3e0",
                                  )}
                                </Box>
                                <Box>
                                  <Typography
                                    variant="subtitle2"
                                    sx={{ color: "#388e3c", mb: 0.5 }}
                                  >
                                    Products
                                  </Typography>
                                  {renderChips(
                                    result.products,
                                    "#388e3c",
                                    "#e8f5e8",
                                  )}
                                </Box>
                              </Box>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default TaskSearchTab;
