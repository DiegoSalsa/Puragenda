import fs from "node:fs";
import pg from "pg";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { matchdayFixture } from "../src/websites/fixtures/matchday";
const connectionString = "postgresql://websiteqa@127.0.0.1:55439/websiteqa";
async function main() {
  const pool = new pg.Pool({connectionString});
  const columns = await pool.query("SELECT 1 FROM information_schema.columns WHERE table_name='BusinessWebsite' AND column_name='templateConfigs'");
  if (!columns.rows.length) await pool.query(fs.readFileSync("prisma/migrations/20261001190000_matchday_template_snapshots/migration.sql","utf8"));
  const prisma = new PrismaClient({adapter:new PrismaPg(pool)});
  const password = await bcrypt.hash("Matchday-local-qa-2026!",10);
  for (const tenant of ["soccerbarber","distrito"] as const) {
    const view=matchdayFixture(tenant), id=`website-qa-${tenant}`;
    for (const file of [view.config.heroImage,...view.catalog.services.map(s=>s.image)]) if (!fs.existsSync("public"+file)) throw new Error("Falta foto local de QA: "+file);
    await prisma.user.upsert({where:{id:`${id}-owner`},create:{id:`${id}-owner`,name:view.business.name,email:`${tenant}@example.test`,password,role:"ADMIN"},update:{password}});
    await prisma.business.upsert({where:{id},create:{id,name:view.business.name,slug:tenant,ownerId:`${id}-owner`,apiKey:`${id}-local-only-key`,timezone:"America/Santiago",currencyCode:"CLP",allowSameDayBookings:false},update:{name:view.business.name}});
    await prisma.subscription.upsert({where:{businessId:id},create:{businessId:id,status:"ACTIVE",plan:"EQUIPO"},update:{status:"ACTIVE",plan:"EQUIPO"}});
    const locationId=view.catalog.locations[0].id;
    await prisma.businessLocation.upsert({where:{id:locationId},create:{id:locationId,businessId:id,name:view.business.name,slug:"principal",timezone:"America/Santiago",isPrimary:true,isActive:true},update:{}});
    for (const h of view.business.hours!) await prisma.businessHours.upsert({where:{businessId_dayOfWeek:{businessId:id,dayOfWeek:h.dayOfWeek}},create:{businessId:id,...h},update:h});
    for (const [position,service] of view.catalog.services.entries()) {
      await prisma.service.upsert({where:{id:service.id},create:{id:service.id,businessId:id,name:service.name,price:service.price,duration:service.duration,description:service.description,imageUrl:service.image,position},update:{name:service.name,price:service.price,duration:service.duration,imageUrl:service.image}});
      await prisma.locationService.upsert({where:{locationId_serviceId:{locationId,serviceId:service.id}},create:{locationId,serviceId:service.id},update:{}});
    }
    for (const [i,person] of view.catalog.staff.entries()) {
      await prisma.staff.upsert({where:{id:person.id},create:{id:person.id,businessId:id,name:person.name,imageUrl:person.image,isActive:true,services:{connect:person.serviceIds.map(id=>({id}))}},update:{name:person.name,imageUrl:person.image,services:{set:person.serviceIds.map(id=>({id}))}}});
      const assignment = await prisma.staffLocation.upsert({where:{staffId_locationId:{staffId:person.id,locationId}},create:{staffId:person.id,locationId,isActive:true},update:{}});
      for (let dayOfWeek=1;dayOfWeek<=6;dayOfWeek++) {const schedule={startTime:i===1?"13:00":"10:00",endTime:i===2?"16:00":"20:00",isWorking:!(i===2&&dayOfWeek===6)};await prisma.staffSchedule.upsert({where:{staffId_dayOfWeek:{staffId:person.id,dayOfWeek}},create:{staffId:person.id,dayOfWeek,...schedule},update:schedule});await prisma.staffLocationSchedule.upsert({where:{staffLocationId_dayOfWeek:{staffLocationId:assignment.id,dayOfWeek}},create:{staffLocationId:assignment.id,dayOfWeek,...schedule},update:schedule});}
    }
    await prisma.websiteAddon.upsert({where:{businessId:id},create:{businessId:id,provider:"mock",status:"ACTIVE",validUntil:new Date("2026-12-31T00:00:00Z")},update:{}});
    const data={templateKey:"matchday",templateVersion:1,publishedTemplateKey:"matchday",publishedTemplateVersion:1,subdomain:tenant,draftConfig:view.config,publishedConfig:view.config,status:"PUBLISHED" as const,publishedAt:new Date(),templateConfigs:{"matchday@1":view.config}};
    await prisma.businessWebsite.upsert({where:{businessId:id},create:{businessId:id,...data,publishedRevision:0},update:{...data,revision:{increment:1},publishedRevision:null}});
  }
  console.log("SoccerBarber / Distrito Barber seeded exclusively at 127.0.0.1:55439/websiteqa");
  await prisma.$disconnect();await pool.end();
}
main().catch(e=>{console.error(e);process.exitCode=1});
