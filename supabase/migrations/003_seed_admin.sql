-- Creates an admin user with all required auth fields.
-- Replace values before running on a new environment.
do $$
declare
  v_user_id uuid := gen_random_uuid();
  v_email text := 'mikel.urkia@proton.me';
  v_password text := 'mikel.urkia';
  v_name text := 'Mikel Urkia';
begin
  insert into auth.users (
    id, instance_id, aud, role,
    email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, created_at, updated_at
  ) values (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    v_email,
    crypt(v_password, gen_salt('bf', 10)),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{}',
    false,
    now(),
    now()
  );

  insert into auth.identities (
    id, user_id, provider_id, provider,
    identity_data, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(),
    v_user_id,
    v_email,
    'email',
    jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
    now(), now(), now()
  );

  insert into public.users (id, name, role)
  values (v_user_id, v_name, 'admin');
end;
$$;
