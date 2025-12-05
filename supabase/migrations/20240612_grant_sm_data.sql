set search_path = sm_data, public;

grant usage on schema sm_data to service_role;
grant all privileges on all tables in schema sm_data to service_role;
alter default privileges in schema sm_data grant all on tables to service_role;

reset search_path;
