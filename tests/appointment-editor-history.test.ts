import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
vi.mock("next/navigation",()=>({useRouter:()=>({refresh:vi.fn()})}));
vi.mock("next-intl",()=>({useTranslations:()=> (key:string,values?:Record<string,unknown>)=>key+" "+Object.values(values??{}).join(" ")}));
import { formatPrice } from "@/lib/utils";
import { AppointmentEditor, type EditableAppointment, type AppointmentEditorService } from "@/app/dashboard/appointment-editor";
const appointment:EditableAppointment={id:"a",serviceId:"retired",serviceName:"Servicio histórico",totalPrice:90,totalDuration:35,customerName:"Cliente",customerEmail:"c@example.invalid",customerPhone:null,clientId:null,staffId:"staff",startTime:"2026-11-02T10:00:00.000Z",internalNotes:null,selectedOptions:[{alternativeId:"retired-option",alternativeName:"A domicilio original"}]};
function render(existing=appointment,services:AppointmentEditorService[]=[]){return renderToStaticMarkup(createElement(AppointmentEditor,{appointment:existing,services,staff:[{id:"staff",name:"Profesional"}],clients:[],currencyCode:"CLP",onClose:()=>{}}));}
describe("historical appointment editor",()=>{
 it("renders the archived service and contracted options when they are absent from the active catalog",()=>{
  const html=render();expect(html).toContain("Servicio histórico (archivado)");expect(html).toContain("A domicilio original");expect(html).toContain(formatPrice(90,"CLP"));expect(html).toContain("35");expect(html).not.toMatch(/type="submit" disabled/);
 });
 it("keeps a contracted free price instead of presenting the current 9000 price",()=>{const html=render({...appointment,totalPrice:0},[{id:"retired",name:"Current",price:9000,duration:60,staffIds:[],optionCategories:[]}]);expect(html).toContain(formatPrice(0,"CLP"));expect(html).not.toContain(formatPrice(9000,"CLP"));});
});
