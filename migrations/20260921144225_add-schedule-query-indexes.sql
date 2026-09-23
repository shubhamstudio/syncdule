-- Matches the schedule page's user-scoped descending timeline, including its
-- status and channel filters. All indexes are additive and safe to re-run.
CREATE INDEX IF NOT EXISTS scheduled_posts_user_scheduled_at_idx
  ON public.scheduled_posts (user_id, scheduled_at DESC);

CREATE INDEX IF NOT EXISTS scheduled_posts_user_status_scheduled_at_idx
  ON public.scheduled_posts (user_id, status, scheduled_at DESC);

CREATE INDEX IF NOT EXISTS scheduled_posts_user_channel_scheduled_at_idx
  ON public.scheduled_posts (user_id, user_channel_id, scheduled_at DESC);

CREATE INDEX IF NOT EXISTS user_channels_user_connected_idx
  ON public.user_channels (user_id, is_connected);
