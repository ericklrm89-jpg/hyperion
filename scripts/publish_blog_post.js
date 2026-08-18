/**
 * HYPERION v11 — Master Blog Post Social Media Publisher & Scheduler
 * 
 * Includes all 4 live published blog article groups from fairdrawapp.com/sitemap.xml
 */

const BLOG_POSTS = [
  {
    id: 'engagement-rate-bad-giveaway',
    slugs: {
      es: 'como-un-mal-sorteo-hunde-tu-engagement-rate-y-como-evitarlo',
      en: 'how-a-bad-giveaway-sinks-your-engagement-rate',
      pt: 'como-um-sorteio-mal-planejado-derruba-sua-taxa-de-engajamento'
    },
    titles: {
      es: '⚠️ Cómo un mal sorteo hunde tu Engagement Rate (y cómo evitarlo)',
      en: '⚠️ How a Bad Giveaway Sinks Your Engagement Rate (& How to Avoid It)',
      pt: '⚠️ Como um sorteio mal planejado derruba sua taxa de engajamento'
    },
    summaries: {
      es: 'El 90% de los sorteos atraen seguidores fantasma que destruyen la interacción de tu cuenta. Aprende a diseñar sorteos de alta retención sin penalizaciones.',
      en: '90% of giveaways attract ghost followers that wreck your account metrics. Learn how to run high-retention giveaways without algorithm penalties.',
      pt: '90% dos sorteos atraem seguidores fantasma que destroem a interação da sua conta. Aprenda a desenhar sorteios de alta retenção sem penalizações.'
    },
    tips: {
      es: [
        '1️⃣ Evita premios genéricos como iPhones si no es tu nicho.',
        '2️⃣ Filtra cazadores de premios pidiendo 1 etiqueta + respuesta estratégica.',
        '3️⃣ Mantén la dinámica corta (3 a 5 días) para conservar el alcance.'
      ],
      en: [
        '1️⃣ Avoid generic iPhone prizes outside your specific niche.',
        '2️⃣ Filter prize hunters with 1 tag + strategic brand question.',
        '3️⃣ Keep the timeframe short (3 to 5 days) to maximize momentum.'
      ],
      pt: [
        '1️⃣ Evite prêmios genéricos como iPhones fora do seu nicho.',
        '2️⃣ Filtre caçadores de prêmios com 1 marcação + resposta estratégica.',
        '3️⃣ Mantenha a dinâmica curta (3 a 5 dias) para preservar o alcance.'
      ]
    }
  },
  {
    id: 'ai-giveaways-new-standard',
    slugs: {
      es: 'sorteos-con-ia-instagram-tiktok',
      en: 'why-running-a-giveaway-with-ai-is-the-new-standard-on-instagram-and-tiktok',
      pt: 'por-que-realizar-um-sorteio-com-ia-e-o-novo-padrao-no-instagram-e-tiktok'
    },
    titles: {
      es: '🤖 Por qué hacer un sorteo con IA es el nuevo estándar en Instagram y TikTok',
      en: '🤖 Why Running a Giveaway with AI is the New Standard on Instagram & TikTok',
      pt: '🤖 Por que realizar um sorteio com IA é o novo padrão no Instagram e TikTok'
    },
    summaries: {
      es: 'La audiencia actual es escéptica. Descubre cómo la Inteligencia Artificial audita comentarios, elimina bots y certifica ganadores con validez pública.',
      en: 'Audiences are skeptical of traditional draws. See how AI audits comments, filters bots, and generates unalterable public certificates.',
      pt: 'O público atual é cético. Descubra como a Inteligência Artificial audita comentários, elimina bots e certifica vencedores com validade pública.'
    },
    tips: {
      es: [
        '1️⃣ Extracción del 100% de los comentarios sin cortes de API.',
        '2️⃣ Detección automática de duplicados y cuentas sospochosas.',
        '3️⃣ Certificado público de validez auditable para la comunidad.'
      ],
      en: [
        '1️⃣ 100% comment extraction with zero API drops.',
        '2️⃣ Automatic duplicate & bot account detection.',
        '3️⃣ Auditable public certificate link for complete trust.'
      ],
      pt: [
        '1️⃣ Extração de 100% dos comentários sem cortes de API.',
        '2️⃣ Detecção automática de duplicados e contas suspeitas.',
        '3️⃣ Certificado público de validade auditável para a comunidade.'
      ]
    }
  },
  {
    id: 'secure-transparent-giveaways',
    slugs: {
      es: 'sorteos-seguros-y-transparentes-para-instagram-y-tiktok',
      en: 'secure-and-transparent-giveaways-for-instagram-and-tiktok',
      pt: 'sorteios-seguros-e-transparentes-para-instagram-e-tiktok'
    },
    titles: {
      es: '🛡️ Sorteos seguros y transparentes para Instagram y TikTok',
      en: '🛡️ Secure and Transparent Giveaways for Instagram and TikTok',
      pt: '🛡️ Sorteios seguros e transparentes para Instagram e TikTok'
    },
    summaries: {
      es: 'Un sorteo opaco destruye la reputación de tu marca. Conoce las 3 reglas no negociables para hacer sorteos 100% transparentes e indiscutibles.',
      en: 'An opaque giveaway ruins brand reputation. Learn the 3 non-negotiable rules to run provably fair social media contests.',
      pt: 'Um sorteio duvidoso destrói a reputação da sua marca. Conheça as 3 regras inegociáveis para fazer sorteios 100% transparentes.'
    },
    tips: {
      es: [
        '1️⃣ Reglas de juego 100% claras desde el primer segundo.',
        '2️⃣ Filtro anti-bots y validación de etiquetas requeridas.',
        '3️⃣ Certificado público de validez respaldado por FairDraw.'
      ],
      en: [
        '1️⃣ 100% transparent terms right from the start.',
        '2️⃣ Anti-bot filtering & tag requirement validation.',
        '3️⃣ Public certificate backed by FairDraw verification.'
      ],
      pt: [
        '1️⃣ Regras 100% claras desde o primeiro segundo.',
        '2️⃣ Filtro anti-bots e validação de marcações exigidas.',
        '3️⃣ Certificado público de validade respaldado pelo FairDraw.'
      ]
    }
  },
  {
    id: 'grow-instagram-organically',
    slugs: {
      es: 'como-usar-sorteios-para-crescer-no-instagram-organicamente',
      en: 'how-to-use-giveaways-to-grow-on-instagram-organically',
      pt: 'como-usar-sorteios-para-crescer-no-instagram-organicamente'
    },
    titles: {
      es: '📈 Cómo usar sorteos para crecer en Instagram orgánicamente',
      en: '📈 How to Use Giveaways to Grow on Instagram Organically',
      pt: '📈 Como usar sorteios para crescer no Instagram organicamente'
    },
    summaries: {
      es: 'El alcance orgánico tradicional está en mínimos. Sigue la estrategia de 3 pasos para ganar clientes ideales mediante sorteos estratégicos.',
      en: 'Traditional organic reach is low. Use this 3-step blueprint to attract ideal target customers through strategic giveaways.',
      pt: 'O alcance orgânico tradicional está nos mínimos. Siga a estratégia de 3 passos para atrair clientes ideais com sorteios estratégicos.'
    },
    tips: {
      es: [
        '1️⃣ Sortea un premio filtro (tu producto/servicio exclusivo).',
        '2️⃣ Exige 1 etiqueta + pregunta de participación estratégica.',
        '3️⃣ Duración ideal: 3 a 5 días para generar urgencia real.'
      ],
      en: [
        '1️⃣ Raffle a filter prize (your flagship product/service).',
        '2️⃣ Require 1 tag + strategic participation question.',
        '3️⃣ Ideal duration: 3 to 5 days for genuine urgency.'
      ],
      pt: [
        '1️⃣ Sorteie um prêmio filtro (seu produto/serviço exclusivo).',
        '2️⃣ Exija 1 marcação + pergunta de participação estratégica.',
        '3️⃣ Duração ideal: 3 a 5 dias para gerar urgência real.'
      ]
    }
  }
];

function buildCaption(post, lang) {
  const title = post.titles[lang] || post.titles.es;
  const summary = post.summaries[lang] || post.summaries.es;
  const tips = (post.tips[lang] || post.tips.es).join('\n');
  const slug = post.slugs[lang] || post.slugs.es;
  const langPrefix = lang === 'es' ? '' : lang + '/';
  const url = `https://fairdrawapp.com/${langPrefix}blog/${slug}`;

  if (lang === 'es') {
    return `${title}\n\n${summary}\n\n📌 CONSEJOS CLAVE:\n${tips}\n\n📖 Lee el artículo completo en nuestro blog:\n👉 ${url}\n\n#CrecimientoOrganico #CrecerEnInstagram #CrecerEnTikTok #Emprendedores #MarketingDigital #EstrategiaDigital #CreadoresDeContenido #FairDraw #RedesSociales`;
  } else if (lang === 'pt') {
    return `${title}\n\n${summary}\n\n📌 DICAS ESSENCIAIS:\n${tips}\n\n📖 Leia o artigo completo no nosso blog:\n👉 ${url}\n\n#CrescimentoOrganico #CrescerNoInstagram #CrescerNoTikTok #MarketingDigital #CriadoresDeConteudo #Empreendedorismo #FairDraw #RedesSociais #Brasil`;
  } else {
    return `${title}\n\n${summary}\n\n📌 KEY TAKEAWAYS:\n${tips}\n\n📖 Read the full article on our blog:\n👉 ${url}\n\n#SocialMediaGrowth #OrganicGrowth #ContentCreator #GrowOnTikTok #GrowOnInstagram #DigitalMarketing #FairDraw #CreatorEconomy #SocialMediaStrategy`;
  }
}

function runBlogPublication(postIndex = 0, lang = 'es') {
  const post = BLOG_POSTS[postIndex % BLOG_POSTS.length];
  const caption = buildCaption(post, lang);
  console.log(`\n════════════════════════════════════════════`);
  console.log(`🚀 HYPERION — PUBLISHING BLOG POST [${lang.toUpperCase()}]`);
  console.log(`📰 Article: ${post.titles[lang]}`);
  console.log(`🔗 URL: https://fairdrawapp.com/${lang === 'es' ? '' : lang + '/'}blog/${post.slugs[lang]}`);
  console.log(`════════════════════════════════════════════\n`);
  console.log(caption);
  return { post, lang, caption };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const lang = args[0] || 'es';
  const postIndex = parseInt(args[1] || '0', 10);
  runBlogPublication(postIndex, lang);
}

module.exports = { BLOG_POSTS, buildCaption, runBlogPublication };
