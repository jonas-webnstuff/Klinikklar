-- Minimal slice of the file-upload work: just the column computeReadinessChecklist
-- needs to stop trusting the self-declared "status: finns" text for R-09 and require
-- an actually uploaded file instead. The rest of the upload plumbing (bucket, RLS,
-- version history, upload/download routes) lands in a follow-up migration.
alter table structured_requirement_items
  add column if not exists file_path text;
