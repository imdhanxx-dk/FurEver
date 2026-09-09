begin;
alter table public.outbox add column request_key text;
create unique index outbox_request_key on public.outbox(user_id,request_key) where request_key is not null;
create function public.submit_mora(p_user uuid,p_mora integer,p_coins integer,p_reference text,p_key text,p_discord text,p_username text) returns uuid language plpgsql security definer set search_path='' as $$declare req public.mora_requests%rowtype;begin
 perform 1 from public.players where user_id=p_user for update;
 select * into req from public.mora_requests where user_id=p_user and request_key=p_key;
 if found then if req.mora<>p_mora or req.reference<>p_reference then raise exception 'IDEMPOTENCY_MISMATCH';end if;return req.id;end if;
 insert into public.mora_requests(user_id,mora,coins,reference,request_key) values(p_user,p_mora,p_coins,p_reference,p_key) returning * into req;
 insert into public.outbox(user_id,kind,request_key,payload) values(p_user,'Mora exchange request','mora:'||p_key,jsonb_build_object('requestId',req.id,'discordId',p_discord,'username',p_username,'mora',p_mora,'coins',p_coins,'reference',p_reference));return req.id;end $$;
create function public.submit_support(p_user uuid,p_key text,p_payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$declare job public.outbox%rowtype;begin
 perform 1 from public.players where user_id=p_user for update;
 select * into job from public.outbox where user_id=p_user and request_key='support:'||p_key;
 if found then if job.payload<>p_payload then raise exception 'IDEMPOTENCY_MISMATCH';end if;return job.id;end if;
 insert into public.outbox(user_id,kind,payload,request_key) values(p_user,'Player support',p_payload,'support:'||p_key) returning * into job;return job.id;end $$;
revoke execute on function public.submit_mora(uuid,integer,integer,text,text,text,text),public.submit_support(uuid,text,jsonb) from public;
do $$begin
 if exists(select 1 from pg_roles where rolname='anon') then
 revoke execute on function public.submit_mora(uuid,integer,integer,text,text,text,text),public.submit_support(uuid,text,jsonb),public.rotate_session(text,text),public.settle_credit(text,uuid,text,text,integer,text,uuid),public.set_config(uuid,jsonb,bigint),public.suspend_player(uuid,uuid,boolean),public.resolve_mora(uuid,uuid,text) from anon,authenticated;
 grant execute on function public.submit_mora(uuid,integer,integer,text,text,text,text),public.submit_support(uuid,text,jsonb) to service_role;
 end if;
end $$;
commit;
