export type GuideSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type Guide = {
  slug: string;
  title: string;
  description: string;
  eyebrow: string;
  updatedAt: string;
  readingMinutes: number;
  sections: GuideSection[];
  faq: { question: string; answer: string }[];
  related: string[];
};

export const guides: Guide[] = [
  {
    slug: "agenda-encargos-con-abono",
    title: "Cómo organizar encargos con abono y fecha de entrega",
    description:
      "Guía práctica para talleres, artistas y negocios que reciben encargos personalizados con meses de anticipación, cupos limitados y pagos de reserva.",
    eyebrow: "Encargos y producción",
    updatedAt: "2026-07-23",
    readingMinutes: 8,
    sections: [
      {
        heading: "Una agenda de encargos no es una agenda de horas",
        paragraphs: [
          "Cuando un negocio fabrica retratos, tejidos, tortas, muebles, joyas o réplicas personalizadas, la pregunta principal no es «¿qué hora está libre?». La pregunta es «¿en qué ventana de producción puedo aceptar este trabajo y cuándo podré entregarlo?». Tratar ambos casos como citas de 30 o 60 minutos termina sobrevendiendo capacidad.",
          "La unidad correcta es el cupo de producción. Un encargo puede reservar un cupo semanal o mensual, requerir fotografías y medidas, comenzar con un abono y quedar en espera hasta que llegue su turno. Por eso conviene separar la fecha en que entra el pedido, la ventana de trabajo y la fecha estimada de entrega.",
        ],
      },
      {
        heading: "Los datos mínimos de cada encargo",
        paragraphs: [
          "Una ficha completa evita conversaciones dispersas por WhatsApp y permite saber qué falta antes de producir. El formulario debe adaptarse al producto, pero hay campos que sirven como base para casi cualquier taller.",
        ],
        bullets: [
          "Cliente, correo y teléfono de contacto.",
          "Producto o tipo de encargo, variante y cantidad.",
          "Archivos de referencia: fotografías, bocetos, medidas o documentos.",
          "Indicaciones especiales y una confirmación explícita del alcance.",
          "Precio total, abono exigido, saldo pendiente y estado del pago.",
          "Ventana de producción, fecha estimada de entrega y método de retiro o despacho.",
        ],
      },
      {
        heading: "Cómo definir capacidad sin limitarte a cuatro pedidos por semana",
        paragraphs: [
          "La capacidad debe poder expresarse según la realidad del negocio. Un artesano puede aceptar dos piezas complejas en noviembre y ocho piezas simples en enero; otro trabaja con una lista de espera de seis meses. Una regla fija por semana no representa esos escenarios.",
          "Una configuración flexible combina horizonte de agenda, unidad de capacidad y excepciones. El horizonte define hasta qué mes se puede reservar. La capacidad puede medirse por semana, por mes o por ventana personalizada. Las excepciones permiten cerrar vacaciones, abrir una campaña de Navidad o aumentar cupos para un producto puntual.",
        ],
        bullets: [
          "Permite reservar de 1 a 24 meses hacia adelante.",
          "Configura cupos por semana o por períodos personalizados.",
          "Define semanas bloqueadas y aperturas extraordinarias.",
          "Asigna distinta capacidad a cada tipo de encargo.",
          "Muestra al cliente la primera entrega disponible, no una falsa hora de atención.",
        ],
      },
      {
        heading: "Abono, confirmación y saldo",
        paragraphs: [
          "El abono sirve para comprometer un cupo de producción. Debe quedar claro cuánto se cobra, qué confirma y bajo qué condiciones puede devolverse o trasladarse. La pantalla de reserva debe mostrar el precio total, el abono de hoy y el saldo que quedará pendiente antes de solicitar el pago.",
          "Una secuencia simple es: solicitud, carga de referencias, selección de ventana, resumen, pago del abono y confirmación. El negocio recibe un encargo confirmado solo cuando el pago se aprueba; si el pago falla, el cupo puede liberarse de acuerdo con una expiración definida.",
        ],
      },
      {
        heading: "Estados que sí ayudan a producir",
        paragraphs: [
          "«Pendiente» y «terminado» no bastan cuando el pedido tarda semanas. Una vista operativa debe distinguir solicitud incompleta, esperando abono, confirmado, en cola, en producción, esperando aprobación, listo para entrega, entregado y cancelado. Así el panel muestra el cuello de botella real.",
          "También conviene registrar los cambios importantes: quién movió la fecha, cuándo se aprobó una referencia y cuándo se avisó al cliente. Ese historial reduce errores y facilita responder sin depender de la memoria de una sola persona.",
        ],
      },
    ],
    faq: [
      {
        question: "¿Cuánto abono debería pedir por un encargo?",
        answer:
          "Depende del costo de materiales, el tiempo reservado y la política del negocio. Lo importante es mostrar el monto y las condiciones antes del pago, y no presentarlo como una regla universal.",
      },
      {
        question: "¿Se puede agendar una entrega para varios meses después?",
        answer:
          "Sí. La agenda debe permitir un horizonte configurable y mostrar ventanas futuras con capacidad disponible, incluso si la primera entrega posible está a seis o doce meses.",
      },
      {
        question: "¿Qué ocurre si una semana ya está llena?",
        answer:
          "Esa ventana deja de estar disponible y el cliente ve la siguiente alternativa con cupo. El negocio puede abrir cupos extraordinarios sin cambiar toda su configuración.",
      },
    ],
    related: ["cobrar-abonos-reservas-online", "reducir-inasistencias-reservas"],
  },
  {
    slug: "cobrar-abonos-reservas-online",
    title: "Cómo cobrar abonos en reservas online sin confundir al cliente",
    description:
      "Qué mostrar antes del pago, cómo confirmar una reserva y qué políticas definir al cobrar una seña o abono por internet.",
    eyebrow: "Pagos y reservas",
    updatedAt: "2026-07-23",
    readingMinutes: 7,
    sections: [
      {
        heading: "El abono reserva capacidad, no reemplaza la información",
        paragraphs: [
          "Cobrar por adelantado puede reducir reservas poco comprometidas y cubrir parte del tiempo o los materiales que el negocio separa. Sin embargo, el pago funciona bien solo cuando el cliente entiende qué está comprando. Antes de pagar debe ver el servicio, la fecha o ventana, el precio completo, el monto del abono y el saldo pendiente.",
          "Evita botones ambiguos como «confirmar» si la acción llevará a un pago. Una etiqueta como «pagar abono de $15.000» establece una expectativa clara y reduce abandonos.",
        ],
      },
      {
        heading: "Porcentaje o monto fijo",
        paragraphs: [
          "Un porcentaje se adapta a servicios con precios muy distintos. Un monto fijo es fácil de comunicar cuando el catálogo es uniforme. También puede existir una regla por servicio: una consulta breve sin abono, un tratamiento con 30% y un encargo personalizado con un monto que cubra materiales.",
          "La configuración debe impedir resultados incoherentes, como un abono mayor al precio total, y redondear el importe antes de enviarlo al proveedor de pago.",
        ],
      },
      {
        heading: "Qué debe ocurrir después del pago",
        paragraphs: [
          "La página de retorno no es suficiente para confirmar una transacción. El sistema debe esperar la notificación segura del proveedor, verificar su estado y asociarla a la reserva correcta. Recién entonces corresponde marcar el cupo como confirmado y enviar el comprobante.",
        ],
        bullets: [
          "Mostrar un estado pendiente si el pago aún se procesa.",
          "Confirmar una sola vez aunque la notificación se repita.",
          "Guardar el identificador de la transacción para conciliación.",
          "Enviar al cliente fecha, monto pagado, saldo y vías de contacto.",
          "Liberar reservas vencidas con una regla conocida por el negocio.",
        ],
      },
      {
        heading: "Políticas visibles y humanas",
        paragraphs: [
          "Cada negocio debe definir por escrito qué pasa ante cancelaciones, cambios de fecha, retrasos o fuerza mayor. La política debe aparecer antes del pago y quedar incluida en la confirmación. No conviene copiar condiciones genéricas: una barbería, una consulta y un taller que compra materiales tienen costos distintos.",
          "Si la política cambia, conserva la versión aceptada por cada cliente. Para decisiones legales o tributarias específicas en Chile, valida el texto con un profesional competente.",
        ],
      },
    ],
    faq: [
      {
        question: "¿La reserva se confirma cuando el cliente vuelve del pago?",
        answer:
          "No necesariamente. La confirmación debe depender del estado verificado por el servidor con el proveedor de pago, no solo de que el navegador llegue a una URL de retorno.",
      },
      {
        question: "¿Puedo cobrar abonos distintos según el servicio?",
        answer:
          "Sí. Una regla por servicio suele ser más precisa que aplicar el mismo porcentaje a todo el catálogo.",
      },
      {
        question: "¿Debo informar el saldo restante?",
        answer:
          "Sí. Mostrar precio total, abono y saldo antes de pagar evita que el cliente interprete el abono como pago completo.",
      },
    ],
    related: ["agenda-encargos-con-abono", "reducir-inasistencias-reservas"],
  },
  {
    slug: "reducir-inasistencias-reservas",
    title: "Cómo reducir inasistencias en un negocio con reservas",
    description:
      "Un sistema práctico de confirmaciones, recordatorios, abonos y reglas de cancelación para disminuir horas perdidas sin hostigar a los clientes.",
    eyebrow: "Operación de agenda",
    updatedAt: "2026-07-23",
    readingMinutes: 7,
    sections: [
      {
        heading: "Primero identifica por qué faltan",
        paragraphs: [
          "No todas las inasistencias tienen la misma causa. Algunas personas olvidan, otras anotan mal la hora, encuentran difícil cancelar o reservan sin compromiso. Antes de endurecer políticas, revisa durante varias semanas cuántas reservas se cancelan a tiempo, cuántas se reprograman y cuántas terminan sin aviso.",
          "Una tasa útil se calcula dividiendo las inasistencias por el total de reservas que debían ocurrir en el período. Separa los datos por servicio, profesional, día y anticipación: allí suelen aparecer patrones accionables.",
        ],
      },
      {
        heading: "Diseña una confirmación que se pueda entender",
        paragraphs: [
          "La confirmación debe repetir negocio, servicio, profesional, fecha, hora, dirección y duración. Añade enlaces directos para cancelar o reprogramar; obligar a llamar aumenta la probabilidad de que el cliente simplemente no aparezca.",
          "Cuando una reserva requiere abono, incluye el monto pagado y el saldo. Cuando es un encargo, reemplaza la hora por la ventana estimada de producción y entrega.",
        ],
      },
      {
        heading: "Usa recordatorios con una función concreta",
        paragraphs: [
          "Un recordatorio debe llegar con tiempo suficiente para actuar. En muchos servicios funciona una combinación de aviso anticipado y recordatorio cercano, pero la frecuencia debe adaptarse al rubro. Una cita médica reservada hace tres meses necesita un tratamiento distinto a un corte agendado ayer.",
        ],
        bullets: [
          "Incluye siempre fecha, hora, ubicación y acción para modificar.",
          "Evita mensajes repetidos que no agregan información.",
          "Permite que el cliente confirme con el mínimo de pasos.",
          "Registra entrega y respuesta para saber qué canal funciona.",
        ],
      },
      {
        heading: "Aplica abonos de manera selectiva",
        paragraphs: [
          "Cobrar a todas las personas no siempre es necesario. Puedes comenzar por servicios largos, insumos costosos, horarios de alta demanda o clientes con inasistencias previas. Comunica que el abono reserva tiempo y explica la política de cambios antes del pago.",
          "La meta no es castigar: es hacer visible el costo de bloquear capacidad y dar una salida fácil a quien necesita cambiar la reserva.",
        ],
      },
      {
        heading: "Mide el cambio",
        paragraphs: [
          "Compara períodos equivalentes antes y después de cada ajuste. Observa inasistencias, cancelaciones a tiempo, horas recuperadas y quejas. Si las inasistencias bajan pero también cae fuertemente la conversión de reservas, la política puede estar creando demasiada fricción.",
        ],
      },
    ],
    faq: [
      {
        question: "¿Cuántos recordatorios conviene enviar?",
        answer:
          "No existe un número universal. Empieza con uno anticipado y uno cercano solo si el tipo de servicio lo justifica, luego mide respuestas e inasistencias.",
      },
      {
        question: "¿Los abonos eliminan todas las inasistencias?",
        answer:
          "No. Aumentan el compromiso en ciertos casos, pero deben combinarse con información clara y opciones simples de cancelación o cambio.",
      },
      {
        question: "¿Qué indicador debo mirar?",
        answer:
          "La proporción de inasistencias sobre reservas previstas, junto con cancelaciones oportunas, horas recuperadas y conversión de la reserva.",
      },
    ],
    related: ["cobrar-abonos-reservas-online", "como-elegir-sistema-reservas-chile"],
  },
  {
    slug: "como-elegir-sistema-reservas-chile",
    title: "Cómo elegir un sistema de reservas online en Chile",
    description:
      "Criterios verificables para comparar agendas digitales, pagos, soporte, costos y experiencia del cliente antes de contratar.",
    eyebrow: "Comparación de software",
    updatedAt: "2026-07-23",
    readingMinutes: 9,
    sections: [
      {
        heading: "Empieza por el flujo real de tu negocio",
        paragraphs: [
          "La mejor agenda no es la que acumula más funciones, sino la que representa cómo vendes capacidad. Una barbería reserva horas por profesional; un centro de estética puede combinar cabinas, profesionales y sesiones; un taller de productos personalizados administra encargos y ventanas de entrega. Escribe el recorrido completo antes de mirar proveedores.",
          "Prueba siempre como cliente: abre el enlace desde un teléfono, busca disponibilidad, completa los datos y cancela. Si el flujo exige crear una contraseña, descargar una app o atravesar demasiadas pantallas, esa fricción también será parte de tu operación.",
        ],
      },
      {
        heading: "Ocho criterios para comparar",
        paragraphs: [
          "Construye una tabla con requisitos obligatorios y deseables. Pide demostraciones sobre situaciones reales, no sobre presentaciones preparadas.",
        ],
        bullets: [
          "Tipo de capacidad: horas, profesionales, recursos, sesiones o encargos.",
          "Reservas desde móvil sin pasos innecesarios.",
          "Abonos, conciliación y manejo de pagos pendientes.",
          "Recordatorios, confirmación, cancelación y reprogramación.",
          "Precio total con profesionales adicionales y módulos necesarios.",
          "Exportación de clientes y reservas en un formato utilizable.",
          "Soporte disponible en tu horario y canal preferido.",
          "Controles de acceso, respaldo y tratamiento de datos.",
        ],
      },
      {
        heading: "No compares solo el precio inicial",
        paragraphs: [
          "Calcula el costo para el tamaño que tendrás en doce meses. Incluye profesionales adicionales, mensajes, pagos, sucursales, comisiones y puesta en marcha. Un precio público facilita la comparación, pero también debes confirmar qué incluye cada plan en la fecha de contratación.",
          "Revisa la forma de salida. La posibilidad de exportar datos y cancelar sin una migración dolorosa reduce el riesgo de la decisión.",
        ],
      },
      {
        heading: "Qué proveedores deberías evaluar",
        paragraphs: [
          "En Chile suelen aparecer plataformas regionales como AgendaPro y alternativas internacionales como Fresha, Booksy, SimplyBook.me y Reservio. También existen productos locales más simples, entre ellos Puragenda. La lista no es un ranking: disponibilidad, precios y funciones cambian, por lo que conviene verificar cada sitio oficial y probar el flujo vigente.",
          "Las plataformas amplias pueden ser convenientes para operaciones con muchos módulos. Una solución más enfocada puede encajar mejor en un negocio pequeño que prioriza configuración simple, soporte directo y precio predecible. Si trabajas con encargos, confirma expresamente que el producto maneje meses de anticipación, cupos de producción y abonos; una agenda de citas tradicional puede no servir.",
        ],
      },
      {
        heading: "Prueba de compra antes de decidir",
        paragraphs: [
          "Crea dos servicios, invita a otro profesional y realiza reservas desde distintos teléfonos. Intenta ocupar el mismo horario, pagar un abono, cancelar, reprogramar y exportar los datos. Anota cuántos pasos requiere cada tarea y qué parte necesita ayuda del proveedor.",
          "El resultado de esa prueba es más confiable que una lista genérica de «mejores sistemas», porque está ligado a tu equipo, clientes y forma de trabajo.",
        ],
      },
    ],
    faq: [
      {
        question: "¿Cuál es el mejor sistema de reservas en Chile?",
        answer:
          "Depende del flujo y tamaño del negocio. Compara capacidad, experiencia móvil, pagos, costo total, exportación y soporte mediante una prueba real antes de decidir.",
      },
      {
        question: "¿Conviene una plataforma internacional o una solución local?",
        answer:
          "Una plataforma internacional puede ofrecer más módulos; una solución local puede entregar configuración y soporte más cercanos. Evalúa el costo total y las funciones que realmente usarás.",
      },
      {
        question: "¿Qué debo preguntar sobre los datos?",
        answer:
          "Dónde se almacenan, quién accede, cómo se respaldan y si puedes exportar clientes, servicios y reservas en un formato reutilizable.",
      },
    ],
    related: ["agenda-encargos-con-abono", "reducir-inasistencias-reservas"],
  },
];

export function getGuide(slug: string) {
  return guides.find((guide) => guide.slug === slug);
}
