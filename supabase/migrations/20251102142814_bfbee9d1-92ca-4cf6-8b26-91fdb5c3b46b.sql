-- Add RLS policy for admins to delete any message
CREATE POLICY "Admins can delete any message"
ON public.messages
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));