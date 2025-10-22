-- Make chat-media bucket public so images/videos can be displayed
UPDATE storage.buckets
SET public = true
WHERE id = 'chat-media';