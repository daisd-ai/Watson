## Watson service

Generate Petri net subnets from uploaded PDF documents using LLMs.

### Quick start

- Prerequisite: a GPU and about 60 GB of VRAM.
- From the repository root, start the application:

```bash
cd watson
docker compose up --build
```

- Open the frontend at: http://localhost:3000

### Notes on startup

- On first run the app downloads and loads embedding and LLM models — this can take several minutes.
- The frontend is ready when the "Load failed" error in the Task History view disappears.
- You may need to tweek settings (i.e. gpu memory utilization) to your needs (`watson/backend/api/core/settings.py`).
- By default LLMs are run using `fp16`.

### Using the app

1. Go to the "Upload Task Files" section.
2. Create a task: give it a name, an optional description, and upload your PDF files.
3. Make sure uploaded file names are unique.

First-time processing may be slower while models and caches are populated.

### Viewing results

- Browse: inspect results grouped by document chunks.
- Search: search across all processed files and results.

### Data location

Models, uploaded files, and processing results are stored in `watson/backend/container-data`.

### Development

- Recommended developer tools: `pre-commit` and `nodeenv` (used by repository hooks).
