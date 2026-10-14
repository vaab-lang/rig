export type SqlCatalogItem = {
  id: string
  name: string
  description: string
  sql: string
}

export const SQL_TEMPLATES: SqlCatalogItem[] = [
  {
    id: 'create-table',
    name: 'Create table',
    description: 'Table with primary key and timestamps',
    sql: `create table if not exists items (
  id text primary key,
  name text not null,
  created_at text not null default (datetime('now'))
);`,
  },
  {
    id: 'add-column',
    name: 'Add column',
    description: 'Add a nullable column',
    sql: `alter table items
add column notes text;`,
  },
  {
    id: 'drop-column',
    name: 'Drop column',
    description: 'Remove a column',
    sql: `alter table items
drop column notes;`,
  },
  {
    id: 'rename-column',
    name: 'Rename column',
    description: 'Rename an existing column',
    sql: `alter table items
rename column name to title;`,
  },
  {
    id: 'add-primary-key',
    name: 'Add primary key',
    description: 'Add a primary key constraint',
    sql: `alter table items
add primary key (id);`,
  },
  {
    id: 'add-foreign-key',
    name: 'Add foreign key',
    description: 'Reference another table',
    sql: `alter table items
add constraint items_owner_fkey
foreign key (owner_id) references profiles (id);`,
  },
  {
    id: 'create-index',
    name: 'Create index',
    description: 'Non-unique index',
    sql: `create index if not exists items_name_idx
on items (name);`,
  },
  {
    id: 'create-unique-index',
    name: 'Create unique index',
    description: 'Unique index',
    sql: `create unique index if not exists items_name_uidx
on items (name);`,
  },
  {
    id: 'enable-rls',
    name: 'Enable RLS',
    description: 'Turn on row level security',
    sql: `alter table items enable row level security;`,
  },
  {
    id: 'policy-select',
    name: 'Policy select',
    description: 'Read access for all users',
    sql: `create policy "read items"
on items
for select
using (true);`,
  },
  {
    id: 'policy-insert',
    name: 'Policy insert',
    description: 'Insert for authenticated users',
    sql: `create policy "insert items"
on items
for insert
to authenticated
with check (true);`,
  },
  {
    id: 'policy-update',
    name: 'Policy update',
    description: 'Update rows by user_id',
    sql: `create policy "update own items"
on items
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);`,
  },
  {
    id: 'policy-delete',
    name: 'Policy delete',
    description: 'Delete rows by user_id',
    sql: `create policy "delete own items"
on items
for delete
using (auth.uid() = user_id);`,
  },
  {
    id: 'create-trigger',
    name: 'Create trigger',
    description: 'Touch updated_at on change',
    sql: `create trigger items_touch
after update on items
for each row
begin
  update items set updated_at = datetime('now') where id = new.id;
end;`,
  },
  {
    id: 'create-function',
    name: 'Create function',
    description: 'SQL function returning a count',
    sql: `create function item_count()
returns integer
language sql
as $$
  select count(*) from items;
$$;`,
  },
  {
    id: 'create-view',
    name: 'Create view',
    description: 'View over public items',
    sql: `create view if not exists open_items as
select id, name, created_at
from items
where archived = 'false';`,
  },
  {
    id: 'create-materialized-view',
    name: 'Create materialized view',
    description: 'Cached aggregate view',
    sql: `create materialized view item_stats as
select count(*) as total, max(created_at) as latest
from items;`,
  },
  {
    id: 'create-enum',
    name: 'Create enum',
    description: 'Enumerated type',
    sql: `create type item_status as enum ('draft', 'active', 'archived');`,
  },
  {
    id: 'alter-enum',
    name: 'Alter enum',
    description: 'Add an enum value',
    sql: `alter type item_status add value 'hidden';`,
  },
  {
    id: 'create-extension',
    name: 'Create extension',
    description: 'Enable pgcrypto',
    sql: `create extension if not exists pgcrypto;`,
  },
  {
    id: 'grant-privileges',
    name: 'Grant privileges',
    description: 'Grant table access',
    sql: `grant select, insert, update, delete
on items
to authenticated;`,
  },
  {
    id: 'create-role',
    name: 'Create role',
    description: 'Login role',
    sql: `create role reporter
login
password 'change-me';`,
  },
  {
    id: 'create-publication',
    name: 'Create publication',
    description: 'Realtime publication',
    sql: `create publication items_pub
for table items;`,
  },
  {
    id: 'upsert-row',
    name: 'Upsert row',
    description: 'Insert or replace by primary key',
    sql: `insert into items (id, name)
values ('1', 'Cable')
on conflict (id) do update
set name = excluded.name;`,
  },
  {
    id: 'soft-delete',
    name: 'Soft delete',
    description: 'Mark a row archived',
    sql: `update items
set archived = 'true'
where id = '1';`,
  },
  {
    id: 'full-text-search',
    name: 'Full text search',
    description: 'Match against a FTS table',
    sql: `select items.id, items.name
from items
join items_fts on items_fts.rowid = items.rowid
where items_fts match 'cable';`,
  },
  {
    id: 'json-query',
    name: 'JSON query',
    description: 'Extract a JSON field',
    sql: `select id, json_extract(meta, '$.sku') as sku
from items
where json_extract(meta, '$.sku') is not null;`,
  },
  {
    id: 'window-function',
    name: 'Window function',
    description: 'Row number per owner',
    sql: `select
  id,
  owner,
  title,
  row_number() over (partition by owner order by id) as n
from todos;`,
  },
  {
    id: 'explain-analyze',
    name: 'Explain analyze',
    description: 'Query plan for a select',
    sql: `explain query plan
select id, title, owner, done
from todos
where done = 'false'
order by id desc;`,
  },
  {
    id: 'create-generated-column',
    name: 'Create generated column',
    description: 'Stored generated column',
    sql: `alter table items
add column name_len integer
generated always as (length(name)) stored;`,
  },
  {
    id: 'truncate-table',
    name: 'Truncate table',
    description: 'Remove all rows',
    sql: `truncate table items;`,
  },
  {
    id: 'comment-on-column',
    name: 'Comment on column',
    description: 'Document a column',
    sql: `comment on column items.name is 'Display name';`,
  },
]
