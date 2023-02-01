--! Previous: -
--! Hash: sha1:0b9d64dceaac782151a84fa40ab92bf759457c58

-- Enter migration here
DROP TABLE IF EXISTS public.users CASCADE;
CREATE TABLE public.users (
    id                     SERIAL PRIMARY KEY,
    username               VARCHAR NULL UNIQUE
);
