"use client";
import Image from "../Media";
import { useState } from "react";
import { useBella } from "../Context";
import styles from "../studio.module.css";
export default function Studio() {
  const { config } = useBella();
  const moments = config.process.map(item => ({ title: item.title, caption: item.name, image: item.image, alt: item.alt }));
  const [selected, setSelected] = useState(moments.length > 1 ? 1 : 0);
  const active = moments[selected];
  return <section id="estudio" className={styles.studio} aria-labelledby="studio-title">
    <div className={styles.sectionHeading}><h2 id="studio-title">El resultado<br />empieza antes<span>.</span></h2><p data-website-field="about" style={{ whiteSpace: "pre-line" }}>{config.about}</p></div>
    {active || config.aboutImage ? <div className={styles.studioPhotos}>
      {active ? <figure><div className={styles.processPhoto} key={active.title} data-reveal><Image src={active.image} alt={active.alt} fill sizes="(max-width: 700px) 90vw, 65vw" /></div><figcaption aria-live="polite">{active.caption}</figcaption></figure> : null}
      {config.aboutImage ? <figure><div data-website-field="aboutImage" className={styles.spacePhoto} data-reveal><Image src={config.aboutImage} alt="El estudio" fill sizes="(max-width: 700px) 35vw, 30vw" /></div><figcaption>El estudio</figcaption></figure> : null}
    </div> : null}
    <div className={styles.processSelector} aria-label="Explorar el proceso">{moments.map((moment, index) => <button type="button" key={moment.title} aria-pressed={selected === index} onClick={() => setSelected(index)}><span>{String(index + 1).padStart(2, "0")}</span>{moment.title}</button>)}</div>
  </section>;
}
