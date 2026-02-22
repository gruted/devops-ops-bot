Doc Ops Bot - status & deployment plan
Date: 2026-02-21 01:15 UTC
Session: subagent doc-ops-deploy

Goal
- Deploy a FastAPI wrapper that provides endpoints for: uploading documents (PDF/images), converting them to markdown (OCR + layout), and returning results; plus a minimal upload UI.
- Provide test flow (PDF/image → markdown), decide on cron (if any), and push/deploy instructions.

Current status
- This is the planning & status file created by the doc-ops subagent.
- No code deployed yet in the workspace; next steps are implementation and local run or containerized deployment.

Requirements
- Python 3.10+ (recommend 3.11)
- FastAPI + Uvicorn
- Tesseract OCR (for image/PDF OCR) or a hosted OCR API
- pdfminer.six or pdfplumber (for extracting selectable PDF text and layout)
- python-magic (file type detection)
- pypdf or pypdfium2 for PDF handling
- aiofiles (for async file saves)
- optional: layout/parser like pyMuPDF (fitz) for better layout
- optional: markdown renderer (pandoc) or custom converter
- Node/JS for the upload UI (simple static HTML + fetch is sufficient)

High-level architecture
1. FastAPI backend:
   - POST /upload -> accept multipart file, detect type
   - Background task: process file (selectable PDF -> extract text; scanned PDF/image -> OCR)
   - Return job id or the markdown result synchronously for small files
   - GET /status/{job_id} -> processing status
   - GET /result/{job_id} -> markdown (text/plain or application/json)
   - (optional) WebSocket for progress updates
2. Processing pipeline:
   - If PDF has text layer -> extract with pypdf/pdfminer/pdfplumber
   - Else -> convert PDF pages to images (pdf2image or pypdfium2) -> Tesseract OCR on each page
   - For images -> run Tesseract with layout (hOCR) or use OCR engine that produces positional info
   - Post-process: simple heuristics to convert headings/paragraphs/lists into markdown
   - Optional: run a lightweight LLM or rule-based layout to produce better markdown
3. Upload UI:
   - Simple HTML page to choose file, upload to /upload, poll /status and show /result
   - Optionally show previews of extracted markdown and allow copy/download

Implementation plan (concrete steps)
1. Create a new package dir: doc-ops-bot/
2. Create FastAPI app (main.py) with endpoints described above
3. Implement processing module (processor.py) with pluggable backends: pdf_text_extractor, pdf_to_images+ocr, image_ocr
4. Add tests: sample files in tests/samples/ (small PDF with text, scanned PDF, sample image)
5. Create simple static UI in doc-ops-bot/ui/index.html + upload script
6. Provide Dockerfile for containerized run (install tesseract, system deps)
7. Provide a simple systemd unit or uvicorn command for local deploy, and a GitHub actions workflow for CI (optional)
8. Add cron recommendation: use a push model (webhook) for uploads; cron only for scheduled batch processing (e.g., poll an S3 bucket every hour). If a cron is needed, run a lightweight worker that checks a queue (Redis) or S3 for new files and processes them.
9. Provide push instructions: git init (if not), commit, push to remote. For deploy, recommend building Docker image and deploying to cloud provider (Cloud Run / ECS / Heroku / Fly.io) with environment variables for storage and OCR config.

Local run commands (dev)
- python -m venv .venv
- source .venv/bin/activate
- pip install fastapi uvicorn pillow pytesseract pypdf pdf2image pdfplumber aiofiles python-magic
- Install Tesseract on host: (Debian/Ubuntu) sudo apt-get update && sudo apt-get install -y tesseract-ocr libtesseract-dev poppler-utils
- Run: UVICORN_CMD="uvicorn doc_ops_bot.main:app --host 0.0.0.0 --port 8000 --reload"
- Access UI: http://localhost:8000/ui/

Testing flow (manual)
1. Upload a sample selectable PDF -> expect immediate markdown conversion using text extractor. Verify headings, paragraphs, and links.
2. Upload a scanned PDF -> pipeline will convert pages to images, run OCR, produce markdown; expect longer processing time.
3. Upload an image (photo of document) -> OCR -> markdown.
4. If results are poor, tune Tesseract parameters (PSM, language) or use a better OCR model/service (OCR.space, Google Vision API, AWS Textract).

Cron / Scheduling recommendation
- Prefer event-driven (upload triggers) or queue workers (Redis/RQ, Celery) for immediate processing.
- Use cron only for periodic batch tasks (e.g., reprocessing older documents, scheduled imports from external sources).
- If using cron: create a small worker script process_queue.py and schedule via crontab or systemd timers. Avoid running heavy OCR on tight cron intervals.

Push / Deploy checklist
1. Add repo files (code, Dockerfile, README)
2. Ensure .gitignore includes venv, __pycache__, .env, node_modules
3. Commit and push to remote (GitHub/GitLab)
4. Build image and test locally: docker build -t doc-ops-bot:dev . && docker run --rm -p 8000:8000 doc-ops-bot:dev
5. Deploy to chosen platform (Cloud Run, ECS, etc.) and set scale/CPU appropriate for OCR workloads

Next immediate actions (what I can do now as subagent)
- Create skeleton repo files (FastAPI app scaffold, processor stub, UI index.html, Dockerfile, README, simple tests). This is ready to be executed in the workspace if you want.
- Add sample test files (tiny PDF/image) for manual testing.

Notes / caveats
- OCR quality depends heavily on source quality; scanning DPI, noise, and fonts matter.
- Converting complex layouts (multi-column, tables, images) to usable markdown is non-trivial; consider progressive enhancement: start with plain text extraction then add layout-aware heuristics.
- For production, prefer a managed OCR service if budgets allow for higher accuracy and less ops burden.

Contact back
- If you'd like I can scaffold the code now in the workspace (FastAPI + simple UI + Dockerfile) and add sample files and a quick dev-run script. Reply with "scaffold now" to proceed.

End of status file.
