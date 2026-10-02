"use client";
import Image from "./Media";
import { useEffect, useReducer, useRef, useState } from "react";
import type { Availability, BookingResult, Catalog, Customer, StudioService } from "../../booking/types";
import { BookingError } from "../../booking/errors";
import { useMatchday } from "./Context";

import { addDays, money, parseBooking } from "../../booking/validation";
import { quoteBookingSelection } from "@/core/booking-selection";
import { bookingReducer } from "../../booking/state";
import styles from "./booking.module.css";
const formatDay = (key: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-CL", { ...options, timeZone: "UTC" }).format(new Date(`${key}T12:00:00Z`));

export default function BookingFlow({ catalog, today, initialServiceId }: { catalog: Catalog; today: string; initialServiceId?: string }) {
  const { api: studioApi, config } = useMatchday(); const copy = { booking: { steps: config.copy.bookingSteps, flowTitles: config.copy.bookingSteps, title: config.copy.bookingTitle, noStaffTitle: "Agenda", demoMode: "Vista previa", mode: "Reserva", idleSummary: config.copy.bookingNote, anyStaffCaption: "El primer horario disponible", resultDemo: "Vista previa completada", resultConfirmed: "Reserva confirmada", resultReceived: "Reserva recibida" } };
  const noStaff = catalog.rules?.staffSelection === "NONE";
  const stepNames = [...copy.booking.steps]; stepNames[1] = noStaff ? "Agenda" : stepNames[1];
  const titles = [...copy.booking.flowTitles]; titles[1] = noStaff ? copy.booking.noStaffTitle : titles[1];
  const firstDay = catalog.rules?.allowSameDayBookings ? 0 : 1;
  const lastDay = addDays(today, catalog.rules?.maxDaysAhead ?? 90);
  const maxServices = catalog.rules?.maxServicesPerBooking ?? 1;
  const isMultiService = maxServices > 1;
  const initialService = catalog.services.find((item) => item.id === initialServiceId);
  const [state, dispatch] = useReducer(bookingReducer, { step: initialService && !isMultiService && !initialService.optionCategories.length ? 1 : 0, serviceId: initialService?.id ?? "", serviceIds: initialService ? [initialService.id] : [], optionIds: [], staffId: "", locationId: (initialService ? catalog.locations.find((location) => initialService.locationIds.includes(location.id))?.id : catalog.locations[0]?.id) ?? "", date: addDays(today, firstDay), slot: null, customer: { customerName: "", customerEmail: "", customerPhone: "" } });
  const [week, setWeek] = useState(0);
  const [result, setResult] = useState<BookingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [retry, setRetry] = useState(0);
  const [response, setResponse] = useState<{ key: string; availability?: Availability; error?: string } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const submitting = useRef(false);
  const submissionKey = useRef<string | null>(null);
  const submissionPayload = useRef<string | null>(null);
  const selectedServices = catalog.services.filter((item) => state.serviceIds.includes(item.id));
  const service = catalog.services.find((item) => item.id === state.serviceId) ?? selectedServices[0];
  let quote: { duration: number; price: number; requiresAddress: boolean } | null = null;
  try { if (selectedServices.length) quote = quoteBookingSelection(selectedServices, state.optionIds); } catch { /* required choices not complete yet */ }
  const deposit = catalog.rules?.depositEnabled ? selectedServices.reduce((sum, item) => sum + Math.min(item.depositAmount ?? 0, quote?.price ?? item.price), 0) : 0;
  const selectedServiceIds = selectedServices.map((item) => item.id);
  const staff = catalog.staff.filter((item) => item.locationIds.includes(state.locationId) && selectedServiceIds.every((id) => item.serviceIds.length === 0 || item.serviceIds.includes(id)));
  const selectedStaff = catalog.staff.find((item) => item.id === (state.slot?.staffId ?? state.staffId));
  const query = { serviceId: state.serviceId, serviceIds: selectedServiceIds, optionIds: state.optionIds, staffId: state.staffId, locationId: state.locationId, date: state.date };
  const serializedQuery = JSON.stringify(query);
  const queryKey = serializedQuery + retry;
  const availability = response?.key === queryKey ? response.availability : undefined;
  const availabilityError = response?.key === queryKey ? response.error : undefined;
  const isLoading = state.step === 2 && !availability && !availabilityError;
  const days = Array.from({ length: 7 }, (_, index) => addDays(today, firstDay + week * 7 + index)).filter((date) => date <= lastDay);
  // Categories begin collapsed; the visitor opens only the one they want to browse.
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const serviceGroups = catalog.services.filter((item) => item.locationIds.includes(state.locationId)).reduce<Array<{ id: string; name: string; position: number; services: StudioService[] }>>((groups, item) => {
    const id = item.categoryId || "__uncategorized";
    const name = item.category || "Otros servicios";
    const existing = groups.find((group) => group.id === id);
    if (existing) existing.services.push(item);
    else groups.push({ id, name, position: item.categoryPosition, services: [item] });
    return groups;
  }, []).sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, "es"));
  const expandedCategoryIds = expandedCategories;
  const hasServiceCategories = serviceGroups.some((group) => group.id !== "__uncategorized");
  const serviceButton = (item: StudioService) => <button type="button" key={item.id} aria-pressed={state.serviceIds.includes(item.id)} onClick={() => { setError(null); if (isMultiService) { const next = state.serviceIds.includes(item.id) ? state.serviceIds.filter((id) => id !== item.id) : state.serviceIds.length < maxServices ? [...state.serviceIds, item.id] : state.serviceIds; dispatch({ type: "services", services: catalog.services.filter((candidate) => next.includes(candidate.id)) }); } else dispatch({ type: "service", service: item }); }}><span className={styles.treatmentThumb}>{item.image ? <Image src={item.image} alt="" fill sizes="72px" /> : null}</span><span><strong>{item.name}</strong><small>{item.duration} min{item.optionCategories.some((category) => category.isRequired) ? " · opciones" : ""}</small></span><span className={styles.treatmentPrice}><span>{money(item.price, catalog.business.currency)}</span>{isMultiService ? <span aria-hidden="true">{state.serviceIds.includes(item.id) ? "✓" : "＋"}</span> : null}</span></button>;
  const optionGroups = selectedServices.flatMap((selected) => selected.optionCategories.map((category) => ({ selected, category })));
  const toggleOption = (category: StudioService["optionCategories"][number], optionId: string) => {
    const categoryIds = category.alternatives.map((item) => item.id);
    const selected = state.optionIds.includes(optionId);
    const ids = category.maxSelections === 1
      ? [...state.optionIds.filter((id) => !categoryIds.includes(id)), optionId]
      : selected
        ? state.optionIds.filter((id) => id !== optionId)
        : [...state.optionIds, optionId];
    if (ids.filter((id) => categoryIds.includes(id)).length <= category.maxSelections) dispatch({ type: "options", ids });
  };

  useEffect(() => {
    const title = heading.current;
    if (!title) return;
    title.focus({ preventScroll: true });
    const bounds = title.getBoundingClientRect();
    if (bounds.top < 100 || bounds.bottom > window.innerHeight) panel.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [state.step, result]);
  useEffect(() => {
    if (state.step !== 2 || (!state.staffId && !noStaff) || !state.serviceId) return;
    const controller = new AbortController();
    studioApi.availability(JSON.parse(serializedQuery), controller.signal).then((next) => {
      if (!controller.signal.aborted) setResponse({ key: queryKey, availability: next });
    }).catch((cause: unknown) => { if (!controller.signal.aborted) setResponse({ key: queryKey, error: cause instanceof Error ? cause.message : "No pudimos consultar los horarios." }); });
    return () => controller.abort();
  }, [queryKey, serializedQuery, state.step, state.staffId, state.serviceId, noStaff, studioApi]);

  const go = (step: number) => { setError(null); dispatch({ type: "step", step }); };
  async function finish() {
    if (!service || !state.slot || submitting.current || uncertain) return;
    submitting.current = true; setSending(true); setError(null);
    try {
      const input = parseBooking({ ...query, staffId: state.slot.staffId ?? "", ...state.customer, startTime: state.slot.startTime });
      // Demo is completed entirely locally: no contact request, persistence or booking.
      if (catalog.mode === "demo" || catalog.mode === "preview") {
        setResult({ kind: "demo", message: "Así se vería tu reserva. No se creó una cita ni se enviaron tus datos." });
      } else {
        const fingerprint = JSON.stringify(input);
        if (submissionPayload.current !== fingerprint || !submissionKey.current) { submissionKey.current = crypto.randomUUID(); submissionPayload.current = fingerprint; }
        setResult(await studioApi.book(input, submissionKey.current!));
      }
    } catch (cause) {
      if (cause instanceof BookingError && cause.code === "CONFLICT") {
        dispatch({ type: "conflict" }); setRetry((value) => value + 1); submissionKey.current = null;
      }
      if (cause instanceof BookingError && cause.code === "UNCERTAIN") setUncertain(true);
      setError(cause instanceof Error ? cause.message : "No pudimos completar el recorrido.");
    } finally { submitting.current = false; setSending(false); }
  }
  const currentSlot = availability?.slots.find((slot) => slot.startTime === state.slot?.startTime);
  return <div className={styles.bookingLayout}>
    <aside className={styles.bookingAside}><p className={styles.bookingMode}>{catalog.mode === "demo" ? copy.booking.demoMode : copy.booking.mode}</p><h2 id="booking-title" style={{ whiteSpace: "pre-line" }}>{copy.booking.title}</h2>
      {service ? <><div className={styles.bookingPreview}><Image src={service.image} alt={`${service.image.startsWith("/demos/") ? "Detalle conceptual" : "Imagen"} de ${service.name}`} fill sizes="(max-width: 700px) 35vw, 25vw" /></div><h3>{selectedServices.length > 1 ? `${selectedServices.length} servicios seleccionados` : service.name}</h3><p>{quote ? `${quote.duration} min / ${money(quote.price, catalog.business.currency)}` : "Elige tus opciones para ver el total."}{deposit > 0 ? <span className={styles.depositInline}>Abono {money(deposit, catalog.business.currency)}</span> : null}</p><div className={styles.summaryDetails}><span>{catalog.locations.find((item) => item.id === state.locationId)?.name}</span>{selectedStaff ? <span>{selectedStaff.name}</span> : state.staffId === "any" ? <span>Primera disponible</span> : null}{state.slot ? <span>{formatDay(state.date, { day: "numeric", month: "long" })} · {state.slot.label}</span> : null}</div></> : <p style={{ whiteSpace: "pre-line" }}>{copy.booking.idleSummary}</p>}
      <p className={styles.bookingDisclaimer}>{catalog.mode === "demo" ? "Disponibilidad demostrativa. No se crea una reserva." : "Reserva gestionada por Puragenda."}</p>
    </aside>
    <div ref={panel} className={styles.bookingPanel} aria-busy={sending}>
      <ol className={styles.steps} aria-label="Progreso de reserva">{stepNames.map((name, index) => <li key={index} aria-current={!result && state.step === index ? "step" : undefined}><button type="button" aria-label={`Paso ${index + 1}: ${name}`} disabled={index > state.step || sending || !!result || uncertain} onClick={() => go(index)}><span>{String(index + 1).padStart(2, "0")}</span><span className={styles.stepName}>{name}</span></button></li>)}</ol>
      {result ? <div className={styles.success} key="result"><span className={styles.successIcon} aria-hidden="true"><svg width="48" height="48" viewBox="0 0 48 48" fill="none"><path d="m10 24 9 9 19-19" stroke="currentColor" strokeWidth="3" /></svg></span><h3 ref={heading} tabIndex={-1}>{result.kind === "demo" ? copy.booking.resultDemo : result.kind === "confirmed" ? copy.booking.resultConfirmed : copy.booking.resultReceived}</h3><p>{result.message}</p><dl className={styles.reviewList}><div><dt>Servicio</dt><dd>{service?.name}</dd></div><div><dt>Momento</dt><dd>{formatDay(state.date, { weekday: "long", day: "numeric", month: "long" })} · {state.slot?.label}</dd></div>{result.id ? <div><dt>Referencia Puragenda</dt><dd>{result.id}</dd></div> : null}</dl>{result.paymentUrl ? <a className={styles.action} href={result.paymentUrl} target="_blank" rel="noopener noreferrer">Continuar al abono</a> : null}<button className={styles.outlineButton} type="button" disabled={result.recoveryRequired} onClick={() => { setResult(null); setError(null); setWeek(0); submissionKey.current = null; dispatch({ type: "reset", date: addDays(today, firstDay) }); }}>Volver a elegir</button></div>
        : <><div className={styles.stepContent} key={state.step}><h3 ref={heading} tabIndex={-1}>{titles[state.step]}</h3>
          {state.step === 0 ? <>
            {catalog.locations.length > 1 ? <label className={styles.locationSelect}>Estudio<select value={state.locationId} onChange={(event) => dispatch({ type: "location", id: event.target.value })}>{catalog.locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label> : null}
            <div className={styles.bookingServiceList} aria-label="Servicios disponibles">{hasServiceCategories ? serviceGroups.map((group) => <div key={group.id} className={styles.serviceGroup}><button type="button" className={styles.serviceGroupHeader} aria-expanded={expandedCategoryIds.includes(group.id)} onClick={() => setExpandedCategories((current) => current.includes(group.id) ? current.filter((id) => id !== group.id) : [...current, group.id])}><span><strong>{group.name}</strong><small>{group.services.length} {group.services.length === 1 ? "servicio" : "servicios"}</small></span><span aria-hidden="true">{expandedCategoryIds.includes(group.id) ? "⌃" : "⌄"}</span></button>{expandedCategoryIds.includes(group.id) ? group.services.map(serviceButton) : null}</div>) : <div className={styles.serviceGroup}>{serviceGroups.flatMap((group) => group.services).map(serviceButton)}</div>}</div>
            {optionGroups.map(({ selected, category }) => <fieldset className={styles.optionGroup} key={`${selected.id}-${category.id}`}><legend>{selectedServices.length > 1 ? `${selected.name} · ` : ""}{category.name}{category.isRequired ? " · obligatorio" : " · opcional"} · hasta {category.maxSelections}</legend>{!category.isRequired ? <button className={styles.textAction} type="button" onClick={() => dispatch({ type: "options", ids: state.optionIds.filter((id) => !category.alternatives.some((option) => id === option.id)) })}>Sin opciones de {category.name}</button> : null}{category.alternatives.map((option) => <label key={option.id}><input type={category.maxSelections === 1 ? "radio" : "checkbox"} name={category.id} checked={state.optionIds.includes(option.id)} onChange={() => toggleOption(category, option.id)} /><span>{option.name}</span><small>{option.priceDelta ? `+ ${money(option.priceDelta, catalog.business.currency)}` : "Incluido"}{option.durationDelta ? ` / +${option.durationDelta} min` : ""}</small></label>)}</fieldset>)}
            {isMultiService ? <div className={styles.stepActions}><button className={styles.action} type="button" disabled={!selectedServices.length || !quote} onClick={() => go(1)}>Continuar con {selectedServices.length} {selectedServices.length === 1 ? "servicio" : "servicios"}</button></div> : service && service.optionCategories.length ? <div className={styles.stepActions}><button className={styles.action} type="button" disabled={!quote} onClick={() => go(1)}>Continuar con {quote?.duration ?? service.duration} min</button></div> : null}
          </> : state.step === 1 ? noStaff ? <><p>Este servicio se reserva en la agenda del estudio, sin elegir un profesional.</p><div className={styles.stepActions}><button className={styles.outlineButton} type="button" onClick={() => go(0)}>Atrás</button><button className={styles.action} type="button" onClick={() => dispatch({ type: "staff", id: "" })}>Elegir día y hora</button></div></> : <><p>Profesionales {catalog.mode === "demo" ? "de muestra" : "del estudio"} para este servicio.</p><div className={styles.staffList}>{catalog.supportsAnyStaff && staff.length ? <button type="button" onClick={() => dispatch({ type: "staff", id: "any" })}><span className={styles.staffInitial}>{catalog.business.name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join("").toUpperCase()}</span><span><strong>Primera disponible</strong><small>{copy.booking.anyStaffCaption}</small></span></button> : null}{staff.map((person) => <button type="button" key={person.id} onClick={() => dispatch({ type: "staff", id: person.id })}><span className={styles.staffInitial}>{person.image ? <Image src={person.image} alt="" fill sizes="64px" /> : person.name.slice(0, 1)}</span><span><strong>{config.showNumbers ? <em className={styles.staffNumber}>{config.staffEditorial[person.id]?.visualNumber || String(catalog.staff.indexOf(person) + 1).padStart(2, "0")}</em> : null}{person.name}</strong><small>{config.staffEditorial[person.id]?.label || service?.name}</small></span></button>)}</div>{!staff.length ? <p role="status">No hay profesionales disponibles para este servicio.</p> : null}<div className={styles.stepActions}><button className={styles.outlineButton} type="button" onClick={() => go(0)}>Atrás</button></div></>
          : state.step === 2 ? <><p>Elige un día y un horario. Zona horaria: {catalog.locations.find((item) => item.id === state.locationId)?.timezone ?? catalog.business.timezone}.</p><div className={styles.calendarHeader}><button type="button" aria-label="Semana anterior" disabled={week === 0} onClick={() => { setWeek(week - 1); dispatch({ type: "date", date: addDays(today, firstDay + (week - 1) * 7) }); }}>Anterior</button><strong>{formatDay(days[0], { month: "long", year: "numeric" })}</strong><button type="button" aria-label="Semana siguiente" disabled={addDays(today, firstDay + (week + 1) * 7) > lastDay} onClick={() => { setWeek(week + 1); dispatch({ type: "date", date: addDays(today, firstDay + (week + 1) * 7) }); }}>Siguiente</button></div>
            <div className={styles.days} aria-label="Elegir día">{days.map((date) => <button type="button" key={date} aria-pressed={date === state.date} aria-label={formatDay(date, { weekday: "long", day: "numeric", month: "long" })} onClick={() => { setError(null); dispatch({ type: "date", date }); }}><span>{formatDay(date, { weekday: "short" })}</span><strong>{formatDay(date, { day: "numeric" })}</strong></button>)}</div>
            <div className={styles.timesRegion} aria-busy={isLoading}><h4>Horarios disponibles{catalog.mode === "demo" ? " · muestra" : ""}</h4>{isLoading ? <p role="status">Consultando horarios…</p> : availabilityError ? <div role="alert"><p>{availabilityError}</p><button type="button" className={styles.outlineButton} onClick={() => setRetry(retry + 1)}>Actualizar horarios</button></div> : availability?.slots.length ? <div className={styles.times} aria-label="Elegir hora">{availability.slots.map((slot) => <button type="button" key={slot.startTime} aria-pressed={slot.startTime === state.slot?.startTime} onClick={() => dispatch({ type: "slot", slot })}>{slot.label}</button>)}</div> : <p role="status">Ese día no tiene horas disponibles. Prueba otro día.</p>}</div><div className={styles.stepActions}><button className={styles.outlineButton} type="button" onClick={() => go(1)}>Atrás</button><button className={styles.action} type="button" disabled={!currentSlot || isLoading} onClick={() => go(3)}>Continuar</button></div></>
          : state.step === 3 ? <Details customer={state.customer} requiresAddress={quote?.requiresAddress ?? false} demo={catalog.mode === "demo"} onDraft={(customer) => dispatch({ type: "draft", customer })} onBack={() => go(2)} onComplete={(customer) => dispatch({ type: "customer", customer })} />
          : <><p>{catalog.mode === "demo" ? "Revisa tu elección. Este recorrido termina como demostración." : "Revisa tu elección antes de enviar tu reserva."}</p><dl className={styles.reviewList}><div><dt>Servicios</dt><dd>{selectedServices.map((item) => item.name).join(", ")}<button type="button" onClick={() => go(0)}>Cambiar</button></dd></div>{state.optionIds.length ? <div><dt>Opciones</dt><dd>{selectedServices.flatMap((item) => item.optionCategories.flatMap((category) => category.alternatives)).filter((option) => state.optionIds.includes(option.id)).map((option) => option.name).join(", ")}</dd></div> : null}{!noStaff ? <div><dt>Profesional</dt><dd>{selectedStaff?.name ?? "Primera disponible"}<button type="button" onClick={() => go(1)}>Cambiar</button></dd></div> : null}<div><dt>Momento</dt><dd>{formatDay(state.date, { weekday: "long", day: "numeric", month: "long" })} · {state.slot?.label}<button type="button" onClick={() => go(2)}>Cambiar</button></dd></div><div><dt>Estudio</dt><dd>{catalog.locations.find((item) => item.id === state.locationId)?.name}<button type="button" onClick={() => go(0)}>Cambiar</button></dd></div><div><dt>Tu contacto</dt><dd>{state.customer.customerName}<br />{state.customer.customerEmail}<br />{state.customer.customerPhone}{quote?.requiresAddress ? <><br />{state.customer.customerAddress}</> : null}<button type="button" onClick={() => go(3)}>Cambiar</button></dd></div><div><dt>{catalog.mode === "demo" ? "Total de muestra" : "Total"}</dt><dd className={styles.reviewTotal}>{quote ? money(quote.price, catalog.business.currency) : ""} / {quote?.duration} min</dd></div></dl>{deposit > 0 ? <p>Abono total: {money(deposit, catalog.business.currency)}. Puragenda indicará cómo completarlo al crear la cita.</p> : null}<div className={styles.stepActions}><button className={styles.outlineButton} type="button" disabled={sending || uncertain} onClick={() => go(3)}>Atrás</button><button className={styles.action} type="button" disabled={sending || uncertain} onClick={finish}>{sending ? "Enviando…" : catalog.mode === "demo" ? "Finalizar demostración" : "Confirmar mi reserva"}</button></div></>}
        </div>{error ? <p className={styles.formError} role="alert">{error}</p> : null}</>}
    </div>
  </div>;
}
function Details({ customer, requiresAddress, demo, onDraft, onBack, onComplete }: { customer: Customer; requiresAddress: boolean; demo: boolean; onDraft: (customer: Customer) => void; onBack: () => void; onComplete: (customer: Customer) => void }) {
  const [error, setError] = useState<string | null>(null);
  return <form className={styles.detailsForm} onSubmit={(event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const next = { customerName: String(values.get("customerName") ?? "").trim(), customerEmail: String(values.get("customerEmail") ?? "").trim().toLowerCase(), customerPhone: String(values.get("customerPhone") ?? "").trim(), ...(requiresAddress ? { customerAddress: String(values.get("customerAddress") ?? "").trim() } : {}) };
    if (!/^\+?[0-9\s()-]{8,18}$/.test(next.customerPhone)) { setError("Revisa tu teléfono: entre 8 y 18 caracteres."); return; }
    setError(null); onComplete(next);
  }}><p>{demo ? "Puedes usar datos de muestra. No salen de este navegador." : "Solo los datos necesarios para que el estudio gestione tu reserva."}</p>
    <label>Nombre<input name="customerName" autoComplete="name" value={customer.customerName} onChange={(event) => onDraft({ ...customer, customerName: event.target.value })} required minLength={2} maxLength={100} placeholder="Tu nombre" /></label>
    <label>Email<input name="customerEmail" autoComplete="email" type="email" value={customer.customerEmail} onChange={(event) => onDraft({ ...customer, customerEmail: event.target.value })} required maxLength={255} placeholder="nombre@ejemplo.cl" /></label>
    <label>Teléfono<input name="customerPhone" autoComplete="tel" type="tel" value={customer.customerPhone} onChange={(event) => onDraft({ ...customer, customerPhone: event.target.value })} required minLength={8} maxLength={18} placeholder="+56 9 1234 5678" /></label>
    {requiresAddress ? <label>Dirección para el servicio a domicilio<input name="customerAddress" autoComplete="street-address" value={customer.customerAddress ?? ""} onChange={(event) => onDraft({ ...customer, customerAddress: event.target.value })} required minLength={5} maxLength={300} /></label> : null}
    {error ? <p role="alert" className={styles.formError}>{error}</p> : null}<div className={styles.stepActions}><button type="button" className={styles.outlineButton} onClick={onBack}>Atrás</button><button type="submit" className={styles.action}>Revisar mi elección</button></div>
  </form>;
}
