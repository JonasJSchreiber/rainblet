# Bulk Trivia Pipeline

This folder contains a repeatable pipeline for sourcing and loading elementary-school multiple-choice questions.

## Stages

1. `acquire_raw_questions.py`
   - Generates a mixed-source staging file at `backend/tools/trivia/data/raw_questions.jsonl`.
2. `build_trivia_dataset.py`
   - Normalizes, validates, dedupes, and balances to 500 questions (100 per topic).
   - Produces:
     - `backend/src/main/resources/db/changelog/data/elementary-questions.csv`
     - `backend/src/main/resources/db/changelog/data/elementary-question-options.csv`
     - `backend/tools/trivia/data/manual-review-sample.csv` (200-row, stratified 20% review set)
     - `backend/tools/trivia/data/validation-report.json`

## Run

```bash
node backend/tools/trivia/acquire_raw_questions.mjs`nnode backend/tools/trivia/build_trivia_dataset.mjs
```

## Notes

- Deterministic output via fixed seed.
- Validation enforces: required fields, 4 unique options, topic whitelist, DB length bounds, duplicate/near-duplicate filters, and age-fit checks.
- IDs follow `topic-slug-0001` style and avoid collisions with existing seed IDs.

