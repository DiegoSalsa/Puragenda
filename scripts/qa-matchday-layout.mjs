export async function auditMatchdayBuilder(tab,viewport,widths=[1440,1280,768,390,360]) {
  const reports=[];
  for(const width of widths) {
    await viewport.set({width,height:width<600?844:900});
    if(width<600) {await tab.playwright.getByRole('button',{name:'Editar',exact:true}).click();await tab.getAXState({emit:false});}
    for(const panel of ['Diseño','Portada','Servicios','Equipo','Galería','Mi negocio','Contacto','Dominio']) {
      await tab.playwright.getByRole('tab',{name:panel,exact:true}).click();await tab.getAXState({emit:false});
      const document=await tab.playwright.locator('html').evaluate(el=>[el.scrollWidth,el.clientWidth]);
      if(width<600) {await tab.playwright.getByRole('button',{name:'Vista previa',exact:true}).click();await tab.getAXState({emit:false});}
      for(const name of ['Escritorio','Móvil']) {
        await tab.playwright.getByRole('button',{name,exact:true}).click();await tab.getAXState({emit:false});
        const frame=await tab.playwright.frameLocator('iframe').locator('html').evaluate(el=>[el.scrollWidth,el.clientWidth]);
        reports.push({width,panel,mode:name,document,frame,pass:document[0]<=document[1]+2&&frame[0]<=frame[1]+2});
      }
      if(width<600) {await tab.playwright.getByRole('button',{name:'Editar',exact:true}).click();await tab.getAXState({emit:false});}
    }
  }
  return reports;
}
