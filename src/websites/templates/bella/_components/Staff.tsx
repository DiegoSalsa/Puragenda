"use client";
import Image from "../Media";
import type { Catalog } from "../_lib/puragenda/types";
import { useBella } from "../Context";
import { bellaCopy } from "../copy";
import styles from "../studio.module.css";

export default function Staff({ catalog }: { catalog: Catalog | null }) {
  const { config, business } = useBella();
  const copy = bellaCopy(config, business.name);
  if (!catalog?.staff.length) return null;

  return <section id="profesionales" className={styles.staff} aria-labelledby="staff-title">
    <div className={styles.sectionHeading}><h2 id="staff-title">{copy.nav.staff}</h2><p>Conoce a las personas que estarán contigo en cada detalle.</p></div>
    <div className={styles.staffGrid}>
      {catalog.staff.map((person) => {
        const services = catalog.services.filter(service => !person.serviceIds.length || person.serviceIds.includes(service.id)).map(service => service.name);
        const initials = person.name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join("").toUpperCase();
        return <article className={styles.staffCard} key={person.id}>
          <div className={styles.staffPhoto}>{person.image ? <Image src={person.image} alt={person.name} fill sizes="(max-width: 700px) 86vw, 28vw" /> : <span aria-hidden="true">{initials}</span>}</div>
          <h3>{person.name}</h3>
          {services.length ? <p>{services.join(" · ")}</p> : null}
        </article>;
      })}
    </div>
  </section>;
}
