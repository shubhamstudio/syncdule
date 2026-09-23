-- Collapse the legacy holding column into the actionable workflow.
do $$
declare
  v_unassigned_id uuid;
  v_todo_id uuid;
begin
  select id into v_unassigned_id from public.idea_groups where name = 'Unassigned';
  select id into v_todo_id from public.idea_groups where name = 'To Do';

  if v_unassigned_id is not null and v_todo_id is not null then
    update public.ideas set group_id = v_todo_id where group_id = v_unassigned_id;
    delete from public.idea_groups where id = v_unassigned_id;
  end if;
end;
$$;
