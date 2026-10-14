"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight, Check, Search } from "lucide-react";
import type { StudioService } from "../../../booking/types";
import { money } from "../../../booking/validation";
import Media from "../Media";
import s from "./category-service-picker.module.css";

export type ServiceGroup = { id: string; name: string; services: StudioService[] };
export function serviceMatchesSearch(name: string, search: string) {
  const normalize = (value: string) => value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("es").replace(/\s+/g, " ").trim();
  return normalize(name).includes(normalize(search));
}

export default function CategoryServicePicker({ groups, selectedIds, maxServices, currency, onSelect }: {
  groups: ServiceGroup[];
  selectedIds: string[];
  maxServices: number;
  currency: string;
  onSelect: (service: StudioService) => void;
}) {
  const [categoryId, setCategoryId] = useState(() => groups.find(group => group.services.some(service => selectedIds.includes(service.id)))?.id ?? "");
  const [search, setSearch] = useState("");
  const category = groups.find(group => group.id === categoryId);
  const heading = useRef<HTMLHeadingElement>(null);
  const lastCategory = useRef(categoryId);
  useEffect(() => {
    if (lastCategory.current === categoryId) return;
    lastCategory.current = categoryId;
    heading.current?.focus({ preventScroll: true });
  }, [categoryId]);
  const services = category?.services.filter(service => serviceMatchesSearch(service.name, search)) ?? [];

  return <div className={s.picker}>
    {category ? <>
      <div className={s.categoryHeading}>
        <button type="button" className={s.back} onClick={() => { setCategoryId(""); setSearch(""); }}><ArrowLeft size={16} />Cambiar categoría</button>
        <h4 ref={heading} tabIndex={-1}>{category.name}<span>{category.services.length} servicios</span></h4>
      </div>
      {category.services.length > 6 ? <label className={s.search}><Search size={17} /><input type="search" aria-label={`Buscar servicio en ${category.name}`} placeholder="Busca tu servicio…" value={search} onChange={event => setSearch(event.target.value)} /></label> : null}
      <div className={s.serviceList} role="region" aria-label={`Servicios de ${category.name}`} tabIndex={0}>
        {services.map(service => {
          const selected = selectedIds.includes(service.id);
          return <div className={s.service} key={service.id}>
            <button type="button" className={s.serviceButton} aria-pressed={selected} disabled={maxServices > 1 && !selected && selectedIds.length >= maxServices} onClick={() => onSelect(service)}>
              <span><strong>{service.name}</strong><small>{service.duration} min{service.optionCategories.some(option => option.isRequired) ? " · personalizable" : ""}</small></span>
              <span className={s.price}>{money(service.price, currency)}{selected ? <Check size={17} aria-label="Seleccionado" /> : <ArrowUpRight size={17} />}</span>
            </button>
            {service.description ? <details className={s.description}><summary>Ver detalle</summary><p>{service.description}</p></details> : null}
          </div>;
        })}
        {!services.length ? <p className={s.empty} role="status">No encontramos ese servicio. Prueba con otro nombre.</p> : null}
      </div>
    </> : <>
      <h4 ref={heading} tabIndex={-1} className={s.prompt}>Primero, elige una categoría</h4>
      <div className={s.categories} aria-label="Categorías de servicios">
        {groups.map(group => {
          const image = group.services.find(service => service.image)?.image;
          return <button type="button" className={s.category} key={group.id} onClick={() => { setCategoryId(group.id); setSearch(""); }}>
            {image ? <span className={s.thumbnail}><Media src={image} alt="" fill sizes="64px" /></span> : null}
            <span><strong>{group.name}</strong><small>{group.services.length} {group.services.length === 1 ? "servicio" : "servicios"}</small></span>
            <ArrowUpRight size={20} />
          </button>;
        })}
        {!groups.length ? <p className={s.empty} role="status">No hay servicios disponibles en este estudio.</p> : null}
      </div>
    </>}
  </div>;
}
