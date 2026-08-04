alter table public."Business"
add column "countryCode" text not null default 'CL',
add column "currencyCode" text not null default 'CLP';

alter table public."Business"
add constraint "Business_countryCode_check" check ("countryCode" ~ '^[A-Z]{2}$'),
add constraint "Business_currencyCode_check" check ("currencyCode" ~ '^[A-Z]{3}$');
