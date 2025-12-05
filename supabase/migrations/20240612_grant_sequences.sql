set search_path = sm_data, public;

grant usage, select on all sequences in schema sm_data to service_role;
alter default privileges in schema sm_data grant usage, select on sequences to service_role;

reset search_path;
