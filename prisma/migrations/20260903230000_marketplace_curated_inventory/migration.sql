-- Admin-curated marketplace inventory. Non-destructive: no backfill, no
-- inferred categories or cities, listings unpublished by default.

CREATE TABLE "MarketplaceCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MarketplaceCategory_slug_key" ON "MarketplaceCategory"("slug");
CREATE INDEX "MarketplaceCategory_isActive_position_idx" ON "MarketplaceCategory"("isActive", "position");

CREATE TABLE "MarketplaceLocality" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "regionName" TEXT NOT NULL,
    "communeName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceLocality_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MarketplaceLocality_slug_key" ON "MarketplaceLocality"("slug");
CREATE INDEX "MarketplaceLocality_isActive_position_idx" ON "MarketplaceLocality"("isActive", "position");

CREATE TABLE "MarketplaceListing" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "localityId" TEXT NOT NULL,
    "authorizationConfirmedAt" TIMESTAMP(3),
    "authorizationConfirmedById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceListing_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MarketplaceListing_businessId_locationId_key" ON "MarketplaceListing"("businessId", "locationId");
-- Public directory: published rows filtered by locality, then joined to categories.
CREATE INDEX "MarketplaceListing_publishedAt_localityId_idx" ON "MarketplaceListing"("publishedAt", "localityId");
CREATE INDEX "MarketplaceListing_businessId_idx" ON "MarketplaceListing"("businessId");
CREATE INDEX "MarketplaceListing_locationId_idx" ON "MarketplaceListing"("locationId");
CREATE INDEX "MarketplaceListing_authorizationConfirmedById_idx" ON "MarketplaceListing"("authorizationConfirmedById");

CREATE TABLE "MarketplaceListingCategory" (
    "listingId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceListingCategory_pkey" PRIMARY KEY ("listingId","categoryId")
);

-- Public directory: category + listing lookup after publishedAt/locality filter.
CREATE INDEX "MarketplaceListingCategory_categoryId_listingId_idx" ON "MarketplaceListingCategory"("categoryId", "listingId");

ALTER TABLE "MarketplaceListing" ADD CONSTRAINT "MarketplaceListing_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceListing" ADD CONSTRAINT "MarketplaceListing_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "BusinessLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceListing" ADD CONSTRAINT "MarketplaceListing_localityId_fkey" FOREIGN KEY ("localityId") REFERENCES "MarketplaceLocality"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MarketplaceListing" ADD CONSTRAINT "MarketplaceListing_authorizationConfirmedById_fkey" FOREIGN KEY ("authorizationConfirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketplaceListingCategory" ADD CONSTRAINT "MarketplaceListingCategory_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "MarketplaceListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceListingCategory" ADD CONSTRAINT "MarketplaceListingCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MarketplaceCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Catalog seed only. No business listings are created.
INSERT INTO "MarketplaceCategory" ("id", "slug", "name", "isActive", "position", "createdAt", "updatedAt") VALUES
  ('mcat_barberias', 'barberias', 'Barberías', true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mcat_peluquerias', 'peluquerias', 'Peluquerías', true, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mcat_estetica', 'estetica', 'Estética', false, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mcat_manicure', 'manicure', 'Manicure', false, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mcat_spa', 'spa', 'Spa', false, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mcat_masajes', 'masajes', 'Masajes', false, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mcat_psicologia', 'psicologia', 'Psicología', false, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mcat_kinesiologia', 'kinesiologia', 'Kinesiología', false, 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mcat_veterinaria', 'veterinaria', 'Veterinaria', false, 9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "MarketplaceLocality" ("id", "slug", "name", "regionName", "communeName", "isActive", "position", "createdAt", "updatedAt") VALUES
  ('mloc_arica', 'arica', 'Arica', 'Arica y Parinacota', 'Arica', true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mloc_iquique', 'iquique', 'Iquique', 'Tarapacá', 'Iquique', true, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mloc_antofagasta', 'antofagasta', 'Antofagasta', 'Antofagasta', 'Antofagasta', true, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mloc_copiapo', 'copiapo', 'Copiapó', 'Atacama', 'Copiapó', true, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mloc_la_serena', 'la-serena', 'La Serena', 'Coquimbo', 'La Serena', true, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mloc_coquimbo', 'coquimbo', 'Coquimbo', 'Coquimbo', 'Coquimbo', true, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mloc_valparaiso', 'valparaiso', 'Valparaíso', 'Valparaíso', 'Valparaíso', true, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mloc_vina_del_mar', 'vina-del-mar', 'Viña del Mar', 'Valparaíso', 'Viña del Mar', true, 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mloc_santiago', 'santiago', 'Santiago', 'Metropolitana', 'Santiago', true, 9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mloc_rancagua', 'rancagua', 'Rancagua', 'O''Higgins', 'Rancagua', true, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mloc_talca', 'talca', 'Talca', 'Maule', 'Talca', true, 11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mloc_chillan', 'chillan', 'Chillán', 'Ñuble', 'Chillán', true, 12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mloc_concepcion', 'concepcion', 'Concepción', 'Biobío', 'Concepción', true, 13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mloc_talcahuano', 'talcahuano', 'Talcahuano', 'Biobío', 'Talcahuano', true, 14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mloc_los_angeles', 'los-angeles', 'Los Ángeles', 'Biobío', 'Los Ángeles', true, 15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mloc_temuco', 'temuco', 'Temuco', 'La Araucanía', 'Temuco', true, 16, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mloc_valdivia', 'valdivia', 'Valdivia', 'Los Ríos', 'Valdivia', true, 17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mloc_osorno', 'osorno', 'Osorno', 'Los Lagos', 'Osorno', true, 18, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mloc_puerto_montt', 'puerto-montt', 'Puerto Montt', 'Los Lagos', 'Puerto Montt', true, 19, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mloc_coyhaique', 'coyhaique', 'Coyhaique', 'Aysén', 'Coyhaique', true, 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mloc_punta_arenas', 'punta-arenas', 'Punta Arenas', 'Magallanes', 'Punta Arenas', true, 21, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

ALTER TABLE "MarketplaceCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MarketplaceLocality" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MarketplaceListing" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MarketplaceListingCategory" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public."MarketplaceCategory",
  public."MarketplaceLocality",
  public."MarketplaceListing",
  public."MarketplaceListingCategory"
FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE
      public."MarketplaceCategory",
      public."MarketplaceLocality",
      public."MarketplaceListing",
      public."MarketplaceListingCategory"
    FROM anon;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE
      public."MarketplaceCategory",
      public."MarketplaceLocality",
      public."MarketplaceListing",
      public."MarketplaceListingCategory"
    FROM authenticated;
  END IF;
END
$$;
