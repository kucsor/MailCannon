## 2024-05-22 - Lazy Load File Inputs
**Learning:** Eagerly reading file inputs (FileReader) into React state on change blocks the main thread and wastes memory, especially for large files that might not even be used.
**Action:** Always implement lazy reading of files using a Promise-based helper only when the content is actually needed (e.g., on submit).
