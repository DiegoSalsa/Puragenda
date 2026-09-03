type TrackingNotice = {
  heading: string;
  summary: string;
  purpose: string;
  providers: string;
  retention: string;
  rights: string;
  rightsLink: string;
};

type TermsNotice = { heading: string; description: string; privacyLink: string };

const notices: Record<string, { tracking: TrackingNotice; terms: TermsNotice }> = {
  es: {
    tracking: {
      heading: "5.1 Analítica consentida y tecnologías similares",
      summary: "Solo con tu consentimiento previo, Puragenda registra eventos de uso del producto. Estos eventos pueden incluir un identificador seudónimo de visitante y sesión, la ruta consultada, el dominio de referencia, parámetros UTM y eventos permitidos. Si inicias sesión, un evento puede asociarse al identificador interno de tu cuenta para medir activación. No guardamos nombres, teléfonos, correos ni contenido de formularios en estos eventos.",
      purpose: "Finalidad y base legal: medir adquisición, activación, uso y errores para mejorar Puragenda. La base es tu consentimiento, que puedes retirar en cualquier momento desde el botón de configuración de cookies. Rechazar o retirar el consentimiento no afecta el servicio esencial.",
      providers: "Los eventos se guardan en nuestra base operativa de Supabase y se sirven mediante Vercel. Google Analytics 4 y PostHog solo se activan si están configurados y después de tu consentimiento; la captura de sesiones de PostHog está desactivada por defecto. Estos proveedores pueden procesar datos fuera de Chile bajo contratos y garantías de protección aplicables.",
      retention: "Retención: eliminamos los eventos y registros de consentimiento después de 395 días, salvo que una obligación legal exija conservar evidencia por más tiempo.",
      rights: "Puedes ejercer acceso, rectificación, supresión, oposición, portabilidad y bloqueo temporal mediante nuestro formulario. Verificaremos tu identidad y responderemos dentro de 30 días corridos, prorrogables una vez cuando corresponda; las solicitudes de bloqueo temporal se responden dentro de 2 días hábiles.",
      rightsLink: "Solicitar gestionar mis datos",
    },
    terms: {
      heading: "2.2 Analítica y preferencias de cookies",
      description: "Las funciones analíticas son opcionales y no son necesarias para usar las funciones esenciales del Servicio. Solo se activan después de una acción afirmativa de consentimiento; puedes rechazarlas o retirar tu consentimiento desde el control de cookies. El tratamiento se rige por nuestra Política de Privacidad.",
      privacyLink: "Ver Política de Privacidad",
    },
  },
  en: {
    tracking: {
      heading: "5.1 Consent-based analytics and similar technologies",
      summary: "Puragenda records product-usage events only after your prior consent. Events may include a pseudonymous visitor and session identifier, the page path, referring domain, UTM parameters, and an allowlisted event name. If you sign in, an event may be linked to your internal account identifier to measure activation. Names, phones, emails, and form contents are not stored in these events.",
      purpose: "Purpose and legal basis: measure acquisition, activation, usage, and errors to improve Puragenda. The legal basis is your consent, which you can withdraw at any time from the cookie settings control. Rejecting or withdrawing consent does not affect the essential service.",
      providers: "Events are stored in our operational Supabase database and served through Vercel. Google Analytics 4 and PostHog activate only when configured and after consent; PostHog session capture is disabled by default. These providers may process data outside Chile under applicable contracts and safeguards.",
      retention: "Retention: events and consent records are deleted after 395 days unless a legal obligation requires longer preservation of evidence.",
      rights: "You may exercise access, rectification, erasure, objection, portability, and temporary blocking rights through our request form. We will verify your identity and respond within 30 calendar days, with one extension where applicable; temporary blocking requests are answered within 2 business days.",
      rightsLink: "Request data management",
    },
    terms: {
      heading: "2.2 Analytics and cookie preferences",
      description: "Analytics features are optional and are not necessary to use the essential Service. They activate only after an affirmative consent action; you can reject or withdraw consent from the cookie control. Processing is governed by our Privacy Policy.",
      privacyLink: "View Privacy Policy",
    },
  },
  it: {
    tracking: {
      heading: "5.1 Analisi basata sul consenso e tecnologie simili",
      summary: "Puragenda registra gli eventi di utilizzo del prodotto solo dopo il tuo consenso preventivo. Gli eventi possono includere un identificatore pseudonimo del visitatore e della sessione, il percorso visitato, il dominio di provenienza, i parametri UTM e un nome di evento autorizzato. Se accedi, un evento può essere collegato all'identificatore interno del tuo account per misurare l'attivazione. In questi eventi non salviamo nomi, telefoni, email o contenuti dei moduli.",
      purpose: "Finalità e base giuridica: misurare acquisizione, attivazione, utilizzo ed errori per migliorare Puragenda. La base è il tuo consenso, revocabile in qualsiasi momento dal controllo delle cookie. Il rifiuto o la revoca non influiscono sul servizio essenziale.",
      providers: "Gli eventi sono salvati nel database operativo Supabase e serviti tramite Vercel. Google Analytics 4 e PostHog vengono attivati solo se configurati e dopo il consenso; la registrazione delle sessioni di PostHog è disattivata per impostazione predefinita. Questi fornitori possono trattare dati fuori dal Cile in base a contratti e garanzie applicabili.",
      retention: "Conservazione: eventi e registri del consenso vengono eliminati dopo 395 giorni, salvo un obbligo legale di conservazione più lunga.",
      rights: "Puoi esercitare i diritti di accesso, rettifica, cancellazione, opposizione, portabilità e blocco temporaneo tramite il modulo. Verificheremo la tua identità e risponderemo entro 30 giorni di calendario, con una proroga quando applicabile; le richieste di blocco temporaneo ricevono risposta entro 2 giorni lavorativi.",
      rightsLink: "Richiedi la gestione dei miei dati",
    },
    terms: {
      heading: "2.2 Analisi e preferenze dei cookie",
      description: "Le funzioni di analisi sono facoltative e non necessarie per il servizio essenziale. Si attivano solo dopo un'azione affermativa di consenso; puoi rifiutare o revocare il consenso dal controllo dei cookie. Il trattamento è disciplinato dalla nostra Informativa sulla privacy.",
      privacyLink: "Vedi Informativa sulla privacy",
    },
  },
  pt: {
    tracking: {
      heading: "5.1 Análise baseada em consentimento e tecnologias semelhantes",
      summary: "A Puragenda registra eventos de uso do produto somente após seu consentimento prévio. Os eventos podem incluir um identificador pseudônimo de visitante e sessão, o caminho da página, o domínio de referência, parâmetros UTM e um evento permitido. Se você entrar, um evento pode ser associado ao identificador interno da conta para medir ativação. Não armazenamos nomes, telefones, e-mails ou conteúdo de formulários nesses eventos.",
      purpose: "Finalidade e base legal: medir aquisição, ativação, uso e erros para melhorar a Puragenda. A base é seu consentimento, que pode ser retirado a qualquer momento no controle de cookies. Recusar ou retirar o consentimento não afeta o serviço essencial.",
      providers: "Os eventos são armazenados no banco operacional Supabase e servidos pela Vercel. O Google Analytics 4 e o PostHog só são ativados quando configurados e após o consentimento; a gravação de sessões do PostHog fica desativada por padrão. Esses fornecedores podem processar dados fora do Chile conforme contratos e salvaguardas aplicáveis.",
      retention: "Retenção: eventos e registros de consentimento são excluídos após 395 dias, salvo obrigação legal de preservar evidências por mais tempo.",
      rights: "Você pode exercer acesso, retificação, eliminação, oposição, portabilidade e bloqueio temporário pelo formulário. Verificaremos sua identidade e responderemos em até 30 dias corridos, com uma prorrogação quando aplicável; pedidos de bloqueio temporário são respondidos em até 2 dias úteis.",
      rightsLink: "Solicitar gestão dos meus dados",
    },
    terms: {
      heading: "2.2 Análise e preferências de cookies",
      description: "Os recursos de análise são opcionais e não são necessários para o serviço essencial. Eles só são ativados após uma ação afirmativa de consentimento; você pode recusar ou retirar o consentimento no controle de cookies. O tratamento é regido pela nossa Política de Privacidade.",
      privacyLink: "Ver Política de Privacidade",
    },
  },
  fr: {
    tracking: {
      heading: "5.1 Analytique fondée sur le consentement et technologies similaires",
      summary: "Puragenda enregistre les événements d'utilisation du produit uniquement après votre consentement préalable. Les événements peuvent inclure un identifiant pseudonyme de visiteur et de session, le chemin consulté, le domaine référent, les paramètres UTM et un événement autorisé. Si vous vous connectez, un événement peut être associé à l'identifiant interne de votre compte pour mesurer l'activation. Nous ne stockons pas les noms, téléphones, e-mails ni le contenu des formulaires dans ces événements.",
      purpose: "Finalité et base légale : mesurer l'acquisition, l'activation, l'utilisation et les erreurs afin d'améliorer Puragenda. La base est votre consentement, que vous pouvez retirer à tout moment depuis le contrôle des cookies. Le refus ou le retrait n'affecte pas le service essentiel.",
      providers: "Les événements sont stockés dans notre base opérationnelle Supabase et servis via Vercel. Google Analytics 4 et PostHog ne s'activent que s'ils sont configurés et après consentement ; l'enregistrement des sessions PostHog est désactivé par défaut. Ces fournisseurs peuvent traiter des données hors du Chili en vertu de contrats et garanties applicables.",
      retention: "Conservation : les événements et les enregistrements de consentement sont supprimés après 395 jours, sauf obligation légale de conserver les preuves plus longtemps.",
      rights: "Vous pouvez exercer vos droits d'accès, de rectification, d'effacement, d'opposition, de portabilité et de blocage temporaire au moyen du formulaire. Nous vérifierons votre identité et répondrons dans les 30 jours calendaires, avec une prolongation lorsque cela s'applique ; les demandes de blocage temporaire reçoivent une réponse sous 2 jours ouvrables.",
      rightsLink: "Demander la gestion de mes données",
    },
    terms: {
      heading: "2.2 Analytique et préférences de cookies",
      description: "Les fonctions analytiques sont facultatives et ne sont pas nécessaires au service essentiel. Elles ne s'activent qu'après une action affirmative de consentement ; vous pouvez refuser ou retirer votre consentement depuis le contrôle des cookies. Le traitement est régi par notre Politique de confidentialité.",
      privacyLink: "Voir la Politique de confidentialité",
    },
  },
  de: {
    tracking: {
      heading: "5.1 Einwilligungsbasierte Analyse und ähnliche Technologien",
      summary: "Puragenda erfasst Produktnutzungsereignisse nur nach Ihrer vorherigen Einwilligung. Ereignisse können eine pseudonyme Besucher- und Sitzungskennung, den aufgerufenen Pfad, die verweisende Domain, UTM-Parameter und einen erlaubten Ereignisnamen enthalten. Wenn Sie sich anmelden, kann ein Ereignis zur Messung der Aktivierung mit der internen Konto-ID verknüpft werden. Namen, Telefonnummern, E-Mails und Formularinhalte werden in diesen Ereignissen nicht gespeichert.",
      purpose: "Zweck und Rechtsgrundlage: Akquise, Aktivierung, Nutzung und Fehler messen, um Puragenda zu verbessern. Rechtsgrundlage ist Ihre Einwilligung, die Sie jederzeit über die Cookie-Einstellungen widerrufen können. Ablehnung oder Widerruf beeinträchtigen den wesentlichen Dienst nicht.",
      providers: "Ereignisse werden in unserer operativen Supabase-Datenbank gespeichert und über Vercel bereitgestellt. Google Analytics 4 und PostHog werden nur aktiviert, wenn sie konfiguriert sind und nach Einwilligung; die PostHog-Sitzungsaufzeichnung ist standardmäßig deaktiviert. Diese Anbieter können Daten außerhalb Chiles gemäß geltenden Verträgen und Schutzmaßnahmen verarbeiten.",
      retention: "Aufbewahrung: Ereignisse und Einwilligungsnachweise werden nach 395 Tagen gelöscht, sofern eine gesetzliche Pflicht eine längere Aufbewahrung erfordert.",
      rights: "Sie können über unser Formular Auskunft, Berichtigung, Löschung, Widerspruch, Datenübertragbarkeit und vorübergehende Sperrung beantragen. Wir prüfen Ihre Identität und antworten innerhalb von 30 Kalendertagen, gegebenenfalls mit einer Verlängerung; Anträge auf vorübergehende Sperrung werden innerhalb von 2 Werktagen beantwortet.",
      rightsLink: "Datenverwaltung beantragen",
    },
    terms: {
      heading: "2.2 Analyse und Cookie-Einstellungen",
      description: "Analysefunktionen sind optional und für den wesentlichen Dienst nicht erforderlich. Sie werden erst nach einer bestätigenden Einwilligung aktiviert; Sie können sie über die Cookie-Einstellungen ablehnen oder die Einwilligung widerrufen. Die Verarbeitung richtet sich nach unserer Datenschutzerklärung.",
      privacyLink: "Datenschutzerklärung ansehen",
    },
  },
  "zh-CN": {
    tracking: {
      heading: "5.1 基于同意的分析和类似技术",
      summary: "只有在您事先同意后，Puragenda 才会记录产品使用事件。事件可能包括匿名化访客和会话标识符、访问路径、来源域名、UTM 参数和允许的事件名称。登录后，事件可能与您的内部账户标识符关联，用于衡量激活情况。此类事件不会存储姓名、电话、电子邮件或表单内容。",
      purpose: "目的和法律依据：衡量获客、激活、使用和错误，以改进 Puragenda。法律依据是您的同意，您可以随时通过 Cookie 设置控件撤回同意。拒绝或撤回不会影响核心服务。",
      providers: "事件存储在我们的 Supabase 运营数据库中，并通过 Vercel 提供。Google Analytics 4 和 PostHog 仅在已配置且获得同意后启用；PostHog 默认关闭会话录制。这些供应商可能依据适用合同和保障措施在智利境外处理数据。",
      retention: "保留期限：事件和同意记录将在 395 天后删除，除非法律要求更长时间保存证据。",
      rights: "您可以通过申请表行使访问、更正、删除、反对、可携带和临时限制处理的权利。我们会验证您的身份，并在 30 个日历日内答复（适用时可延期一次）；临时限制处理申请在 2 个工作日内答复。",
      rightsLink: "申请管理我的数据",
    },
    terms: {
      heading: "2.2 分析和 Cookie 偏好",
      description: "分析功能是可选的，并非使用核心服务所必需。只有在您明确同意后才会启用；您可以通过 Cookie 控件拒绝或撤回同意。相关处理受我们的隐私政策约束。",
      privacyLink: "查看隐私政策",
    },
  },
};

export function getTrackingNotice(locale: string) {
  return (notices[locale] ?? notices.es).tracking;
}

export function getTermsNotice(locale: string) {
  return (notices[locale] ?? notices.es).terms;
}
