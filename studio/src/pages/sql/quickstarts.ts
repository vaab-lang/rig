import type { SqlCatalogItem } from './templates'

export const SQL_QUICKSTARTS: SqlCatalogItem[] = [
  {
    id: 'todo-app',
    name: 'Todo app',
    description: 'todos table plus a starter select',
    sql: `create table if not exists todos (
  id text primary key,
  title text not null,
  owner text not null,
  done text not null default 'false'
);

insert into todos (id, title, owner, done)
values
  ('1', 'Wire SQL Editor', 'rig', 'false'),
  ('2', 'Check results grid', 'rig', 'true')
on conflict (id) do nothing;

select id, title, owner, done
from todos
order by id;`,
  },
  {
    id: 'profiles-auth',
    name: 'Profiles + Auth',
    description: 'profiles keyed to auth users',
    sql: `create table if not exists profiles (
  id text primary key,
  email text not null,
  name text not null default '',
  created_at text not null default (datetime('now'))
);

create table if not exists auth_users (
  id text primary key,
  email text not null,
  provider text not null default 'email',
  created_at text not null default (datetime('now'))
);

insert into auth_users (id, email, provider)
values ('user-1', 'op@rig.dev', 'email')
on conflict (id) do nothing;

insert into profiles (id, email, name)
values ('user-1', 'op@rig.dev', 'Operator')
on conflict (id) do nothing;

select profiles.id, profiles.email, profiles.name, auth_users.provider
from profiles
join auth_users on auth_users.id = profiles.id;`,
  },
  {
    id: 'stripe-schema',
    name: 'Stripe schema',
    description: 'Customers, products, prices, subscriptions',
    sql: `create table if not exists customers (
  id text primary key,
  email text not null,
  name text not null default ''
);

create table if not exists products (
  id text primary key,
  name text not null,
  active text not null default 'true'
);

create table if not exists prices (
  id text primary key,
  product_id text not null references products (id),
  currency text not null default 'usd',
  unit_amount integer not null
);

create table if not exists subscriptions (
  id text primary key,
  customer_id text not null references customers (id),
  price_id text not null references prices (id),
  status text not null default 'active'
);

select
  customers.email,
  products.name,
  prices.unit_amount,
  subscriptions.status
from subscriptions
join customers on customers.id = subscriptions.customer_id
join prices on prices.id = subscriptions.price_id
join products on products.id = prices.product_id;`,
  },
  {
    id: 'ecommerce',
    name: 'E-commerce',
    description: 'Products, carts, and orders',
    sql: `create table if not exists products (
  id text primary key,
  sku text not null unique,
  name text not null,
  price_cents integer not null
);

create table if not exists carts (
  id text primary key,
  owner text not null,
  created_at text not null default (datetime('now'))
);

create table if not exists cart_items (
  id text primary key,
  cart_id text not null references carts (id),
  product_id text not null references products (id),
  qty integer not null default 1
);

create table if not exists orders (
  id text primary key,
  owner text not null,
  total_cents integer not null,
  status text not null default 'open'
);

create table if not exists order_items (
  id text primary key,
  order_id text not null references orders (id),
  product_id text not null references products (id),
  qty integer not null,
  price_cents integer not null
);

select orders.id, orders.owner, orders.total_cents, orders.status
from orders
order by orders.id desc;`,
  },
]
