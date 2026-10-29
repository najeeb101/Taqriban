-- Email every admin when new feedback or a question suggestion arrives (Resend HTTP API via pg_net).
-- The Resend API key lives in Supabase Vault as secret `resend_api_key` (never in the repo). Without it nothing is sent,
-- so local and test databases stay silent. Optional Vault secret `alert_from_email` overrides the sender
-- (default: Resend's shared test sender, which can only deliver to the Resend account's own email address).
-- Sending is fire-and-forget: a failure is logged as a warning and never blocks the insert.

create extension if not exists pg_net;

create function private.html_escape(p text) returns text
language sql immutable as $$
  select replace(replace(replace(replace(coalesce(p, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;')
$$;

create function private.email_admins(p_subject text, p_html text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_key  text;
  v_from text;
  v_to   jsonb;
begin
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
  if v_key is null then return; end if;
  select jsonb_agg(email order by email) into v_to from public.admins;
  if v_to is null then return; end if;
  select decrypted_secret into v_from from vault.decrypted_secrets where name = 'alert_from_email' limit 1;

  perform net.http_post(
    url     := 'https://api.resend.com/emails',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_key, 'Content-Type', 'application/json'),
    body    := jsonb_build_object(
                 'from', coalesce(v_from, 'Taqriban <onboarding@resend.dev>'),
                 'to', v_to,
                 'subject', p_subject,
                 'html', p_html)
  );
exception when others then
  raise warning 'email_admins failed: %', sqlerrm;
end $$;

create function private.alert_wrap(p_title text, p_body text) returns text
language sql immutable as $$
  select '<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;font-size:15px;line-height:1.8;color:#1f1c17">'
      || '<h2 style="margin:0 0 12px;color:#8a1538">' || p_title || '</h2>'
      || p_body
      || '<p style="margin-top:20px"><a href="https://taqriban.vercel.app/admin" style="color:#8a1538">افتح لوحة المشرف</a></p>'
      || '</div>'
$$;

create function private.on_feedback_created() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_kind text := case new.kind when 'idea' then 'فكرة أو اقتراح' when 'bug' then 'مشكلة أو خطأ'
                               when 'like' then 'شيء أعجبه' else 'شيء آخر' end;
begin
  perform private.email_admins(
    'تقريباً: رأي جديد (' || v_kind || ')',
    private.alert_wrap('رأي جديد من لاعب',
         '<p><b>النوع:</b> ' || v_kind || '</p>'
      || case when new.rating is not null then '<p><b>التقييم:</b> ' || new.rating || ' من 5</p>' else '' end
      || '<p style="white-space:pre-wrap;background:#f4efe6;padding:12px;border-radius:12px">'
      || private.html_escape(new.message) || '</p>'
      || case when new.contact is not null then '<p><b>للتواصل:</b> ' || private.html_escape(new.contact) || '</p>' else '' end));
  return new;
end $$;

create function private.on_submission_created() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform private.email_admins(
    'تقريباً: سؤال مقترح جديد',
    private.alert_wrap('سؤال مقترح جديد',
         '<p style="white-space:pre-wrap;background:#f4efe6;padding:12px;border-radius:12px">'
      || private.html_escape(new.text_ar) || '</p>'
      || case when new.proposed_answer is not null
              then '<p><b>الإجابة المقترحة:</b> ' || new.proposed_answer || ' ' || private.html_escape(new.unit_ar) || '</p>'
              else '' end
      || case when new.source_url is not null
              then '<p><b>المصدر:</b> ' || private.html_escape(new.source_url) || '</p>' else '' end
      || case when new.credit_name is not null
              then '<p><b>يُنشر باسم:</b> ' || private.html_escape(new.credit_name) || '</p>' else '' end));
  return new;
end $$;

create trigger feedback_email_admins
  after insert on public.feedback
  for each row execute function private.on_feedback_created();

create trigger submissions_email_admins
  after insert on public.submissions
  for each row execute function private.on_submission_created();
