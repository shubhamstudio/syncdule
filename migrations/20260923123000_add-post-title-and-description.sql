-- Platform metadata is distinct from the post body/caption. Defaults retain
-- compatibility with previously scheduled posts while new posts supply both.
alter table public.scheduled_posts
  add column if not exists title text not null default '',
  add column if not exists description text not null default '';
