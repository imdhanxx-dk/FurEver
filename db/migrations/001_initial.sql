-- PostgreSQL 15+. Apply through a trusted migration connection, never the browser.
begin;
create table public.users(id uuid primary key default gen_random_uuid(),discord_id text not null unique check(discord_id ~ '^[0-9]{10,25}$'),username text not null,display_name text not null,discord_avatar text,suspended boolean not null default false,created_at timestamptz not null default now());
create table public.players(user_id uuid primary key references public.users(id),state jsonb not null check(jsonb_typeof(state)='object'),revision bigint not null default 0,updated_at timestamptz not null default now(),check((state->>'coins')::bigint between 0 and 1000000000),check((state->>'xp')::bigint between 0 and 254925));
create table public.sessions(token_hash text primary key,user_id uuid not null references public.users(id),csrf text not null,created_at timestamptz not null default now(),expires_at timestamptz not null);
create index sessions_user on public.sessions(user_id);create index sessions_expiry on public.sessions(expires_at);
create table public.oauth_states(state_hash text primary key,expires_at timestamptz not null,created_at timestamptz not null default now());
create table public.operations(user_id uuid references public.users(id),key text not null,fingerprint text not null,response jsonb not null,created_at timestamptz not null default now(),primary key(user_id,key));
create table public.economy_ledger(id bigint generated always as identity primary key,user_id uuid not null references public.users(id),operation_key text not null,kind text not null,currency text not null check(currency in('PC','XP')),amount bigint not null,balance_before bigint not null,balance_after bigint not null,source text not null,created_at timestamptz not null default now(),check(balance_before+amount=balance_after),foreign key(user_id,operation_key) references public.operations(user_id,key));
create index ledger_user_time on public.economy_ledger(user_id,created_at desc);
create table public.audit_logs(id bigint generated always as identity primary key,actor uuid references public.users(id),target uuid references public.users(id),action jsonb not null,created_at timestamptz not null default now());
create table public.security_events(id bigint generated always as identity primary key,user_id uuid references public.users(id),kind text not null,detail text not null,created_at timestamptz not null default now());
create table public.game_config(id text primary key,value jsonb not null,revision bigint not null default 0);
create table public.rate_limits(key text primary key,window_start timestamptz not null,hits integer not null);
create table public.mora_requests(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.users(id),mora integer not null check(mora between 1 and 100000),coins integer not null check(coins between 1 and 1000000),reference text not null default '',status text not null default 'Pending' check(status in('Pending','Approved','Rejected','Cancelled')),created_at timestamptz not null default now(),resolved_at timestamptz,request_key text not null,unique(user_id,request_key));
create table public.payments(id uuid primary key,user_id uuid not null references public.users(id),package_id text not null,coins integer not null check(coins>0),amount integer not null check(amount>0),currency text not null,external_id text unique,status text not null default 'Pending' check(status in('Pending','Paid','Refunded')),request_key text not null,created_at timestamptz not null default now(),unique(user_id,request_key));
create table public.payment_events(id text primary key,payment_id uuid references public.payments(id),created_at timestamptz not null default now());
create table public.outbox(id uuid primary key default gen_random_uuid(),user_id uuid references public.users(id),kind text not null,payload jsonb not null,delivered_at timestamptz,attempts integer not null default 0,created_at timestamptz not null default now());
create table public.assets(id uuid primary key,user_id uuid not null references public.users(id),object_key text not null unique,mime text not null,bytes integer not null,created_at timestamptz not null default now());

create function public.upsert_identity(p_discord_id text,p_username text,p_name text,p_avatar text,p_initial jsonb) returns uuid language plpgsql security definer set search_path='' as $$ declare uid uuid; begin
 insert into public.users(discord_id,username,display_name,discord_avatar) values(p_discord_id,p_username,p_name,p_avatar) on conflict(discord_id) do update set username=excluded.username,display_name=excluded.display_name,discord_avatar=excluded.discord_avatar returning id into uid;
 insert into public.players(user_id,state) values(uid,p_initial) on conflict(user_id) do nothing;return uid;end $$;

create function public.commit_game(p_user uuid,p_revision bigint,p_key text,p_fingerprint text,p_state jsonb,p_ledger jsonb,p_response jsonb,p_actor uuid default null,p_audit jsonb default null) returns jsonb language plpgsql security definer set search_path='' as $$
 declare current_revision bigint; prior public.operations%rowtype; entry jsonb; begin
 select revision into current_revision from public.players where user_id=p_user for update;
 if not found then raise exception 'PLAYER_NOT_FOUND';end if;
 select * into prior from public.operations where user_id=p_user and key=p_key;
 if found then if prior.fingerprint<>p_fingerprint then raise exception 'IDEMPOTENCY_MISMATCH';end if;return prior.response;end if;
 if current_revision<>p_revision then raise exception 'VERSION_CONFLICT';end if;
 insert into public.operations(user_id,key,fingerprint,response) values(p_user,p_key,p_fingerprint,p_response);
 update public.players set state=p_state,revision=revision+1,updated_at=now() where user_id=p_user;
 for entry in select * from jsonb_array_elements(p_ledger) loop
 insert into public.economy_ledger(user_id,operation_key,kind,currency,amount,balance_before,balance_after,source) values(p_user,p_key,entry->>'kind',entry->>'currency',(entry->>'amount')::bigint,(entry->>'before')::bigint,(entry->>'after')::bigint,entry->>'source');end loop;
 if p_actor is not null then insert into public.audit_logs(actor,target,action) values(p_actor,p_user,p_audit);end if;
 return p_response;end $$;

create function public.take_rate_limit(p_key text,p_limit integer,p_seconds integer) returns boolean language plpgsql security definer set search_path='' as $$ declare count_hits integer; begin
 insert into public.rate_limits(key,window_start,hits) values(p_key,now(),1) on conflict(key) do update set hits=case when public.rate_limits.window_start<now()-make_interval(secs=>p_seconds) then 1 else public.rate_limits.hits+1 end,window_start=case when public.rate_limits.window_start<now()-make_interval(secs=>p_seconds) then now() else public.rate_limits.window_start end returning hits into count_hits;return count_hits<=p_limit;end $$;

create function public.consume_oauth_state(p_hash text) returns boolean language plpgsql security definer set search_path='' as $$ declare valid boolean;begin delete from public.oauth_states where state_hash=p_hash and expires_at>now() returning true into valid;return coalesce(valid,false);end $$;

create function public.append_only_guard() returns trigger language plpgsql as $$ begin raise exception 'Append-only record';end $$;
create trigger ledger_append_only before update or delete on public.economy_ledger for each row execute function public.append_only_guard();
create trigger audit_append_only before update or delete on public.audit_logs for each row execute function public.append_only_guard();

-- Explicitly deny every client role. Only the server's service role can call the RPCs.
do $$ declare t record; begin for t in select tablename from pg_tables where schemaname='public' and tablename in('users','players','sessions','oauth_states','operations','economy_ledger','audit_logs','security_events','game_config','rate_limits','mora_requests','payments','payment_events','outbox','assets') loop execute format('alter table public.%I enable row level security',t.tablename);execute format('revoke all on public.%I from public',t.tablename);end loop;end $$;
revoke execute on function public.upsert_identity(text,text,text,text,jsonb),public.commit_game(uuid,bigint,text,text,jsonb,jsonb,jsonb,uuid,jsonb),public.take_rate_limit(text,integer,integer),public.consume_oauth_state(text) from public;
do $$ declare t record;begin if exists(select 1 from pg_roles where rolname='anon') then
 for t in select tablename from pg_tables where schemaname='public' and tablename in('users','players','sessions','oauth_states','operations','economy_ledger','audit_logs','security_events','game_config','rate_limits','mora_requests','payments','payment_events','outbox','assets') loop
 execute format('revoke all on public.%I from anon,authenticated',t.tablename);
 execute format('grant select,insert,update,delete on public.%I to service_role',t.tablename);
 end loop;
 revoke execute on function public.upsert_identity(text,text,text,text,jsonb),public.commit_game(uuid,bigint,text,text,jsonb,jsonb,jsonb,uuid,jsonb),public.take_rate_limit(text,integer,integer),public.consume_oauth_state(text) from anon,authenticated;
 grant execute on function public.upsert_identity(text,text,text,text,jsonb),public.commit_game(uuid,bigint,text,text,jsonb,jsonb,jsonb,uuid,jsonb),public.take_rate_limit(text,integer,integer),public.consume_oauth_state(text) to service_role;
 grant usage,select on sequence public.economy_ledger_id_seq,public.audit_logs_id_seq,public.security_events_id_seq to service_role;
 end if;end $$;
commit;
