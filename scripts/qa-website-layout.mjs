// Run against the authenticated local builder with the Codex browser's tab and
// viewport capability. No runtime app imports, browser cookies, or remote writes.
export async function auditWebsiteBuilderLayout(tab, viewport) {
  const reports = [];
  for (const width of [1440, 1280, 390, 360]) {
    await viewport.set({ width, height: width < 600 ? 844 : 900 });
    if (width < 600) await tab.playwright.getByRole('button', { name: 'Editar', exact: true }).click();
    for (const panel of ['Diseño', 'Portada', 'Galería', 'Mi negocio', 'Contacto', 'Dominio']) {
      await tab.playwright.getByRole('tab', { name: panel, exact: true }).click();
      const document = await tab.playwright.locator('html').evaluate(el => [el.scrollWidth, el.clientWidth]);
      if (width < 600) await tab.playwright.getByRole('button', { name: 'Vista previa', exact: true }).click();
      for (const mode of ['Escritorio', 'Móvil']) {
        await tab.playwright.getByRole('button', { name: mode, exact: true }).click();
        const area = await tab.playwright.locator('[class*="frameArea"]').evaluate(el => [el.scrollWidth, el.clientWidth]);
        const frame = await tab.playwright.frameLocator('iframe').locator('html').evaluate(el => [el.scrollWidth, el.clientWidth]);
        const pass = [document, area, frame].every(([scroll, client]) => client > 0 && scroll <= client + 2);
        reports.push({ width, panel, mode, document, area, frame, pass });
      }
      if (width < 600) await tab.playwright.getByRole('button', { name: 'Editar', exact: true }).click();
    }
  }
  if (reports.some(row => !row.pass)) throw new Error(JSON.stringify(reports.filter(row => !row.pass)));
  return reports;
}
