begin;
create function public.rotate_session(p_old text,p_new text) returns void language plpgsql security definer set search_path='' as $$ begin update public.sessions set token_hash=p_new where token_hash=p_old and expires_at>now();end $$;
-- An external credit and its source status are committed together under the player lock.
create function public.settle_credit(p_kind text,p_id uuid,p_event text default null,p_external text default null,p_amount integer default null,p_currency text default null,p_actor uuid default null) returns boolean language plpgsql security definer set search_path='' as $$
declare uid uuid;credit integer;old_balance bigint;new_balance bigint;st jsonb;opkey text;old_status text;expected integer;curr text;external text;
begin
 if p_kind='PAYMENT' then select user_id into uid from public.payments where id=p_id;
 elsif p_kind='MORA' then select user_id into uid from public.mora_requests where id=p_id;
 else raise exception 'INVALID_SOURCE';end if;
 if uid is null then raise exception 'NOT_FOUND';end if;
 select state into st from public.players where user_id=uid for update;
 if p_kind='PAYMENT' then
 select coins,status,amount,currency,external_id into credit,old_status,expected,curr,external from public.payments where id=p_id for update;
 if expected<>p_amount or curr<>p_currency or (external is not null and external<>p_external) then raise exception 'PAYMENT_MISMATCH';end if;
 if old_status='Paid' then return false;end if;
 if old_status<>'Pending' then raise exception 'INVALID_STATUS';end if;
 if exists(select 1 from public.payment_events where id=p_event) then return false;end if;
 update public.payments set status='Paid',external_id=p_external where id=p_id;
 insert into public.payment_events(id,payment_id) values(p_event,p_id);
 else
 if p_actor is null then raise exception 'ACTOR_REQUIRED';end if;
 select coins,status into credit,old_status from public.mora_requests where id=p_id for update;
 if old_status='Approved' then return false;end if;
 if old_status<>'Pending' then raise exception 'INVALID_STATUS';end if;
 update public.mora_requests set status='Approved',resolved_at=now() where id=p_id;
 end if;
 old_balance=(st->>'coins')::bigint;new_balance=old_balance+credit;opkey=lower(p_kind)||':'||p_id;
 st=jsonb_set(st,'{coins}',to_jsonb(new_balance));
 insert into public.operations(user_id,key,fingerprint,response) values(uid,opkey,opkey,jsonb_build_object('credited',credit));
 update public.players set state=st,revision=revision+1,updated_at=now() where user_id=uid;
 insert into public.economy_ledger(user_id,operation_key,kind,currency,amount,balance_before,balance_after,source) values(uid,opkey,case when p_kind='PAYMENT' then 'REAL_MONEY_PURCHASE' else 'MORA_EXCHANGE' end,'PC',credit,old_balance,new_balance,opkey);
 if p_actor is not null then insert into public.audit_logs(actor,target,action) values(p_actor,uid,jsonb_build_object('action','mora_approve','requestId',p_id));end if;return true;end $$;

create function public.set_config(p_actor uuid,p_value jsonb,p_revision bigint) returns void language plpgsql security definer set search_path='' as $$begin
 insert into public.game_config(id,value,revision) values('main',p_value,0) on conflict(id) do nothing;
 update public.game_config set value=p_value,revision=revision+1 where id='main' and revision=p_revision;
 if not found then raise exception 'VERSION_CONFLICT';end if;
 insert into public.audit_logs(actor,action) values(p_actor,jsonb_build_object('action','configure','value',p_value));end $$;
create function public.suspend_player(p_actor uuid,p_user uuid,p_suspend boolean) returns void language plpgsql security definer set search_path='' as $$begin
 update public.users set suspended=p_suspend where id=p_user;
 if p_suspend then delete from public.sessions where user_id=p_user;end if;
 insert into public.audit_logs(actor,target,action) values(p_actor,p_user,jsonb_build_object('action','suspend','value',p_suspend));end $$;
create function public.resolve_mora(p_actor uuid,p_id uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$declare uid uuid;begin
 if p_status not in('Rejected','Cancelled') then raise exception 'INVALID_STATUS';end if;
 update public.mora_requests set status=p_status,resolved_at=now() where id=p_id and status='Pending' returning user_id into uid;
 if uid is not null then insert into public.audit_logs(actor,target,action) values(p_actor,uid,jsonb_build_object('action','mora_resolve','status',p_status,'requestId',p_id));end if;end $$;
revoke execute on function public.rotate_session(text,text),public.settle_credit(text,uuid,text,text,integer,text,uuid),public.set_config(uuid,jsonb,bigint),public.suspend_player(uuid,uuid,boolean),public.resolve_mora(uuid,uuid,text) from public;
do $$ begin if exists(select 1 from pg_roles where rolname='service_role') then grant execute on function public.rotate_session(text,text),public.settle_credit(text,uuid,text,text,integer,text,uuid),public.set_config(uuid,jsonb,bigint),public.suspend_player(uuid,uuid,boolean),public.resolve_mora(uuid,uuid,text) to service_role;end if;end $$;
commit;
