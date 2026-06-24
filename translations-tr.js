/** Site metinleri — İngilizce → Türkçe */
const { getBrand, getWpUrl, getContactEmail, loadSiteConfig } = require('./site-config');

const BRAND = getBrand();
const WP_URL = getWpUrl();
const CONTACT_EMAIL = getContactEmail();
const SITE_COPY = loadSiteConfig().copy || {};

const BASE_PAIRS = [
  // —— Marka + meta ——
  ['Shader Development Studio', `${BRAND} — Yazılım & Web`],
  ['Shader \u2014 Home', `${BRAND} \u2014 Ana Sayfa`],
  ['Shader — Home', `${BRAND} — Ana Sayfa`],
  ['Shader logo, go to home page', `${BRAND} logosu, ana sayfaya git`],
  ['Navigate to Home section">Home', 'Ana Sayfa bölümüne git">Ana Sayfa'],
  ['Navigate to Selected Work section">Selected Work', 'Projelerim bölümüne git">Projelerim'],
  ['Navigate to About Us section">About Us', 'Hakkımda bölümüne git">Hakkımda'],
  ['Navigate to Contact section">Contact', 'İletişim bölümüne git">İletişim'],
  ['Navigate to Home section', 'Ana Sayfa bölümüne git'],
  ['Navigate to Selected Work section', 'Projelerim bölümüne git'],
  ['Navigate to About Us section', 'Hakkımda bölümüne git'],
  ['Navigate to Contact section', 'İletişim bölümüne git'],
  ['Go to previous project in carousel', 'Karuselde önceki projeye git'],
  ['Go to next project in carousel', 'Karuselde sonraki projeye git'],
  [
    'Book a call with Shader on Cal.com, opens in new tab',
    'WhatsApp ile iletişime geçin, yeni sekmede açılır',
  ],
  ['Shader Sweden AB', `${BRAND}`],
  [
    'Empowering Your Business with Next-Generation Interactive 3D and AI Solutions. Based in Sweden and Working with Brands and Agencies Worldwide.',
    'PIXELA — işletmelere özel yazılım, kurumsal web sitesi ve dijital çözümler. Markanızı profesyonel bir şekilde dijitale taşıyoruz.',
  ],
  [
    'Empowering your business with next-generation interactive 3D and AI solutions.',
    'İşletmeniz için güvenilir yazılım ve web çözümleri.',
  ],
  [`${BRAND} Development Studio`, `${BRAND} — Yazılım & Web`],

  // —— Google / JSON-LD / SEO ——
  [
    'Creative development studio specialized in interactive 3D and AI solutions.',
    'İşletmelere özel yazılım, kurumsal web sitesi ve dijital çözümler.',
  ],
  ['Creative Development Services', 'Yazılım ve Web Hizmetleri'],
  [
    'Interactive 3D experiences, AI solutions, and full-stack development for brands worldwide.',
    'Kurumsal web sitesi, yönetim paneli ve özel yazılım projeleri.',
  ],
  ['Interactive 3D & AI Development', 'Yazılım ve Web Geliştirme'],
  ['Shader Sweden AB', `${BRAND}`],
  ['"alternateName":["Shader","Shader Sweden"]', '"alternateName":["PIXELA"]'],
  ['Shader on LinkedIn, opens in new tab', `${BRAND} — LinkedIn, yeni sekmede açılır`],
  ['Shader on Instagram, opens in new tab', `${BRAND} — Instagram, yeni sekmede açılır`],
  ['Shader on X, opens in new tab', `${BRAND} — X, yeni sekmede açılır`],
  ['Shader on Facebook, opens in new tab', `${BRAND} — Facebook, yeni sekmede açılır`],
  ['Shader on YouTube, opens in new tab', `${BRAND} — YouTube, yeni sekmede açılır`],

  // —— Nav (3D + DOM) ——
  ['hero:"Home",projects:"Selected Work","about-us":"About Us",contact:"Contact"', 'hero:"Ana Sayfa",projects:"Projelerim","about-us":"Hakkımda",contact:"İletişim"'],
  ['Skip to content', 'İçeriğe geç'],
  ['Selected Work', 'Projelerim'],
  ['About Us', 'Hakkımda'],
  ['Book a Call Today', 'Proje Teklifi Alın'],
  ['Book a call', 'İletişime Geçin'],
  ['General Enquiries', 'Genel Sorular'],
  ['Visit us', 'Adres'],
  ['New business', 'Yeni projeler'],
  ['Social', 'Sosyal medya'],
  ['Footer', 'Alt bilgi'],
  ['Accessibility Statement', 'Erişilebilirlik Bildirimi'],
  ['Send email to hello@shader.se', `${CONTACT_EMAIL} adresine e-posta gönder`],
  ['Send email to ceo@shader.se', `${CONTACT_EMAIL} adresine e-posta gönder`],
  ['hello@shader.se', CONTACT_EMAIL],
  ['ceo@shader.se', CONTACT_EMAIL],
  ['secretary@shader.se', CONTACT_EMAIL],
  ['Shader on X (Twitter), opens in new tab', `${BRAND} — X (Twitter), yeni sekmede açılır`],
  ['aria-label="Contact"', 'aria-label="İletişim"'],
  ['<h2>Contact</h2>', '<h2>İletişim</h2>'],
  ['Book a call on Cal.com, opens in new tab', 'WhatsApp ile iletişime geçin, yeni sekmede açılır'],
  ['Office address', 'Ofis adresi'],
  [
    'Reach out today to our CEO for new business enquiries at',
    'Yeni proje ve iş birliği için bana ulaşın:',
  ],

  // —— Hero ——
  [
    '# A Creative Development Studio, Plugged into the Future\n\nScroll to Inspect Our Closed Deals\n',
    '# Profesyonel Yazılım ve Web Çözümleri\n\nReferans Projelerimizi İncelemek İçin Kaydırın\n',
  ],
  [
    'A Creative Development Studio, Plugged into the Future',
    'Profesyonel Yazılım ve Web Çözümleri',
  ],
  ['Scroll to Inspect Our Closed Deals', 'Referans projelerimizi incelemek için kaydırın'],

  // —— Projeler ——
  [
    'Browse our project carousel to explore our selected work.',
    'Tamamladığımız yazılım ve web projelerini keşfetmek için kaydırın.',
  ],
  ['Project carousel', 'Proje karuseli'],
  ['Previous project', 'Önceki proje'],
  ['Next project', 'Sonraki proje'],
  ['View project:', 'Projeyi görüntüle:'],
  ['View project', 'Projeyi görüntüle'],
  ['developed in collaboration with', ''],
  ['Markus Reklambyrå', ''],
  ['Back to projects', 'Projelere dön'],
  ['Next Project', 'Sonraki proje'],
  ['The Management', 'Yönetim'],

  // —— Alt başlıklar ——
  ['3D Interior Designer', 'Web Tasarımı'],
  ['3D Configurator', 'Online Yapılandırıcı'],
  ['3D Flow Visualization', 'Süreç Görselleştirme'],
  ['3D Visualisation', 'Görsel Sunum'],
  ['3D Showroom', 'Web Uygulaması'],
  ['AI Image and Video Generator', 'Yapay Zeka Aracı'],
  ['Campaign Website', 'Kampanya Sitesi'],
  ['Creative concept development and strategy', 'Konsept ve yazılım planlama'],
  ['Interactive 3D design and development', 'Etkileşimli web geliştirme'],
  ['AI-powered content creation', 'Akıllı içerik üretimi'],
  ['Full-stack development', 'Full-stack yazılım'],
  ['AR Game', 'Mobil Uygulama'],
  ['Portfolio', 'Portföy'],
  ['Website', 'Kurumsal Site'],

  // —— Hakkımda ——
  [
    '# Making Digital Storytelling More Playful, Powerful, and Alive\n\nShader is a creative development studio specialized in building interactive 3D and AI solutions for the web. Serious about business, based in Sweden, and working with brands, agencies and designers worldwide.\n\nPlugged into the future. While we\'re a small team of creative engineers, we have a hand-picked network of collaborators: designers, 3D artists, copywriters, animators, and creative technologists, ready to plug in with an array of capabilities.\n\nThis modular approach means we can scale and adapt to each challenge. Whether it\'s a WebGL experiment, an interactive product visualization, a mobile app, or an AI-driven experience, we help bold brands stand out across every screen.\n\nWe build storytelling platforms that demand attention and reward curiosity. We push digital mediums to places you haven\'t seen before, and have fun doing it. Beyond code, we offer 3D design and animation, UI and motion design, concepts and digital strategy, full-stack development, and creative consulting.\n\nWhether it\'s prototyping an idea, launching an augmented reality experience, or bringing high-fidelity visuals to life, Shader bridges the gap between creative ambition and technical execution. Our process is hands-on, collaborative, and tailored for teams that value both craft and innovation. We combine technical expertise with a designer\'s eye, ensuring that every interaction feels natural and every pixel is perfectly placed. We\'re not your regular IT department. We don\'t troubleshoot printers.\n',
    '# İşletmeniz İçin Dijital Altyapı\n\nPIXELA olarak kurumsal web siteleri, yönetim panelleri ve özel yazılım projeleri geliştiriyoruz. Her çözüm; performans, güvenilirlik ve markanızı dijitalde güçlü konumlandırma hedefiyle tasarlanır.\n\nKurumsal site, e-ticaret, randevu veya sipariş sistemi, CRM veya işletmenize özel panel — ihtiyacınıza uygun uçtan uca hizmet sunuyoruz. Tasarımdan yayına almaya kadar süreci net ve şeffaf yönetiyoruz.\n\nBu sayfada farklı sektörlerden referans projelerimizi bulabilirsiniz. Her proje, işletmenin dijitalde daha profesyonel görünmesi ve müşteriye daha kolay ulaşması için geliştirildi.\n\nMobil uyumlu arayüz, hızlı yükleme süreleri ve sürdürülebilir kod altyapısı standartlarımızdır. Uzun vadeli kullanım ve kolay yönetim önceliğimizdir.\n\nYeni projeniz için bizimle iletişime geçin; ihtiyacınızı birlikte analiz edip size özel bir yol haritası oluşturalım.\n',
  ],
  [
    'Making Digital Storytelling More Playful, Powerful, and Alive',
    'İşletmeniz İçin Dijital Altyapı',
  ],
  [
    'Shader is a creative development studio specialized in building interactive 3D and AI solutions for the web. Serious about business, based in Sweden, and working with brands, agencies and designers worldwide.',
    'PIXELA olarak kurumsal web siteleri, yönetim panelleri ve özel yazılım projeleri geliştiriyoruz.',
  ],
  [
    "Plugged into the future. While we're a small team of creative engineers, we have a hand-picked network of collaborators: designers, 3D artists, copywriters, animators, and creative technologists, ready to plug in with an array of capabilities.",
    'Kurumsal site, yönetim paneli, e-ticaret veya özel yazılım — ihtiyacınıza göre uçtan uca çözüm sunuyorum.',
  ],
  [
    "This modular approach means we can scale and adapt to each challenge. Whether it's a WebGL experiment, an interactive product visualization, a mobile app, or an AI-driven experience, we help bold brands stand out across every screen.",
    'Her proje farklıdır: vitrin sitesi, online satış, randevu sistemi veya işletmeye özel yazılım. Hepsinde hedef aynı — dijitalde güçlü ve profesyonel görünmek.',
  ],
  [
    "We build storytelling platforms that demand attention and reward curiosity. We push digital mediums to places you haven't seen before, and have fun doing it. Beyond code, we offer 3D design and animation, UI and motion design, concepts and digital strategy, full-stack development, and creative consulting.",
    'Bu sayfada daha önce geliştirdiğim yazılımları ve web projelerini görüyorsunuz. Her biri bir işletmenin dijitalde öne çıkması için tasarlandı.',
  ],
  [
    "Whether it's prototyping an idea, launching an augmented reality experience, or bringing high-fidelity visuals to life, Shader bridges the gap between creative ambition and technical execution. Our process is hands-on, collaborative, and tailored for teams that value both craft and innovation. We combine technical expertise with a designer's eye, ensuring that every interaction feels natural and every pixel is perfectly placed. We're not your regular IT department. We don't troubleshoot printers.",
    'Sürecim sade: dinlemek, planlamak, geliştirmek, yayına almak. Mobil uyumlu, hızlı ve yönetilebilir — işletmenizin dijital vitrini olacak şekilde.',
  ],

  // —— İkinci hakkımda bölümü ——
  [
    '# For Companies Serious About Technology\n\nIn today\'s fast-paced corporate landscape, you need a partner who understands the bottom line. At Shader, we engineer success through strategic alliances and mutual profitability. Our team is ready to synergize with your organization, unlock new verticals, and maximize your digital ROI. We don\'t just close deals; we deliver results that compound.\n\nWe leverage state-of-the-art technology to give your brand a decisive competitive advantage. Whether disrupting the market with paradigm-shifting 3D experiences or streamlining operations with cutting-edge AI, we provide turnkey solutions that scale. We merge high-performance engineering with executive-level design to build assets that appreciate your brand value.\n\nReady to take your enterprise to the next level? Don\'t waste valuable time. Review our portfolio, crunch the numbers, and you\'ll see the trajectory points one way: up. Pick up the phone, send a fax, or schedule a consultation. The future of your business is waiting. Let\'s execute.\n',
    '# İşletmenizi Dijitalde Büyütün\n\nDoğru dijital altyapı, işletmenize yeni müşteri kapıları açar. Profesyonel web sitesi ve yazılım çözümleriyle markanız internette güven verir, hizmetleriniz net biçimde sunulur.\n\nMobil uyumlu tasarım, hızlı performans ve kolay yönetim her projede standarttır. Vitrin sitesi, online sipariş veya randevu sistemi — iş modelinize uygun çözüm üretiyoruz.\n\nReferans projelerimizi inceleyerek hangi alanlarda çalıştığımızı ve sunduğumuz kaliteyi görebilirsiniz. Yeni projeniz için iletişime geçmeniz yeterli.\n',
  ],
  [
    "In today's fast-paced corporate landscape, you need a partner who understands the bottom line. At Shader, we engineer success through strategic alliances and mutual profitability. Our team is ready to synergize with your organization, unlock new verticals, and maximize your digital ROI. We don't just close deals; we deliver results that compound.",
    'Doğru web sitesi ve yazılım, işletmenize yeni müşteri kapısı açar. Markanız internette profesyonel görünür, hizmetleriniz net anlatılır.',
  ],
  [
    "We leverage state-of-the-art technology to give your brand a decisive competitive advantage. Whether disrupting the market with paradigm-shifting 3D experiences or streamlining operations with cutting-edge AI, we provide turnkey solutions that scale. We merge high-performance engineering with executive-level design to build assets that appreciate your brand value.",
    'Mobil uyumlu, hızlı ve kolay yönetilebilir siteler; sipariş, randevu veya yönetim paneli — işletmenize özel yazılım çözümleri.',
  ],
  [
    "Ready to take your enterprise to the next level? Don't waste valuable time. Review our portfolio, crunch the numbers, and you'll see the trajectory points one way: up. Pick up the phone, send a fax, or schedule a consultation. The future of your business is waiting. Let's execute.",
    'Portföyümdeki projelere göz atın. Yeni web siteniz veya yazılım projeniz için hemen iletişime geçin.',
  ],

  // —— 3D bölüm başlıkları (canvas metin) ——
  [
    "Still Not Convinced We're Serious About Business?",
    'Hâlâ işimize ciddiyetle yaklaştığımıza inanmıyor musunuz?',
  ],
  [
    "We've got one last trick up our sleeve.",
    'Cebimizde son bir sürpriz daha var.',
  ],
  [
    "Had Enough Reading? Let's Shred This Thing.",
    'Okumaktan sıkıldınız mı? Projelere geçelim.',
  ],
  [
    'A High Tech Business Solutions Company',
    'Yazılım ve Kurumsal Web Çözümleri',
  ],
  ['Check Out This Golden Tie', 'Şu Altın Kravata Bir Bakın'],
  [
    'You made it this far. You deserve a tie-break.',
    'Buraya kadar geldiniz — kravat molası hak ettiniz.',
  ],
  ['Good buy.', 'İyi alışverişler!'],

  // —— Referanslar ——
  [
    '# A Showcase of Valued Clients\n\nWe have had the benefit of working with a large pool of great clients throughout the years. Our partnerships ranges from some of the most recognizable Swedish brands to international innovators.\n',
    '# Birlikte Çalıştığım İşletmeler\n\nFarklı sektörlerden işletmelerle birlikte çalıştım. Ortak hedefimiz her zaman aynıydı: dijitalde güçlü bir iz bırakmak ve işletmeyi öne çıkarmak.\n',
  ],
  [
    'We have had the benefit of working with a large pool of great clients throughout the years. Our partnerships ranges from some of the most recognizable Swedish brands to international innovators.',
    'Farklı sektörlerden işletmelerle çalıştım; hepsinde dijitalde öne çıkmalarına yardımcı oldum.',
  ],

  // —— İletişim ——
  [
    '# Contact\n\nContact us about your digital project idea or general enquires. Let\'s interface, call us today!\n',
    '# İletişim\n\nYazılım veya web projeniz için bizimle iletişime geçin. İhtiyacınızı dinleyelim, size özel bir çözüm planı oluşturalım.\n',
  ],
  [
    "Contact us about your digital project idea or general enquires. Let's interface, call us today!",
    'Yazılım veya web projeniz için bizimle iletişime geçin. İhtiyacınızı dinleyelim, size özel bir çözüm planı oluşturalım.',
  ],
  [
    '# Act now! Book a Consultation.\n\nCut along the dotted line and mail this to the post address below for a free 30 minute video call consultation.\n',
    '# Projenize Başlayalım\n\nÜcretsiz ön görüşme için iletişime geçin — projenizi birlikte planlayalım.\n',
  ],
  ['# Had Enough Reading? Let\'s Shred This Thing.\n', '# Okumaktan sıkıldınız mı? Projelere geçelim.\n'],

  // —— Erişilebilirlik ——
  [
    '# Statement On Accessibility: Pushing Pixels into the Future\n\nAt Shader, we don\'t just dress for the job we want, complete with aggressive shoulder pads and power ties, we build for the future. You\'ve probably noticed that our digital real estate isn\'t your standard, flat-file brochure. It is rendered entirely in glorious, state-of-the-art WebGPU and WebGL.\n\nWhy did we bypass the standard document object model to put our entire enterprise on a single canvas element? Simple: Because it\'s a paradigm shift. We do web, AI, and 3D visualization, and we wanted a corporate homepage that flexes our technical muscles, maximizes synergy, and looks incredibly cool doing it.\n\nHowever, the boys down in RnD have informed management of a slight "friction in the paradigm."\n',
    '# Erişilebilirlik Bildirisi: Pikselleri Geleceğe Taşımak\n\nPIXELA’da sadece hayal ettiğimiz işe uygun giyinmiyoruz — omuz pedleri ve kravatlarla — geleceği inşa ediyoruz. Dijital vitrinimizin standart bir broşür olmadığını fark etmişsinizdir. Tamamı görkemli, son teknoloji WebGPU ve WebGL ile render ediliyor.\n\nNeden tüm kurumsal sitemizi tek bir canvas öğesine koymak için standart DOM’u atladık? Basit: Bu bir paradigma kayması. Web, yapay zeka ve 3B görselleştirme yapıyoruz; teknik gücümüzü gösteren, sinerjiyi maksimize eden ve bunu yaparken inanılmaz havalı görünen bir ana sayfa istedik.\n\nAncak Ar-Ge’deki ekip yönetime paradigmadaki hafif bir “sürtünme” olduğunu bildirdi.\n',
  ],
  [
    '# The Bottom Line on Accessibility\n\nWe know what we are doing when it comes to web accessibility. We are intimately familiar with WCAG guidelines, and we believe the web should be open for everyone to do business. But pushing pixels into the Z-axis makes standard screen-reader integration and keyboard navigation a complex merger.\n\nHere is what we\'ve done to bridge the gap between radical 3D innovation and universal access:\n\n- **The Shadow Boardroom:** We have engineered hidden DOM elements and ARIA labels that operate behind the 3D graphics to communicate with assistive technologies.\n- **Executive Keystrokes:** We\'ve implemented custom keyboard navigation to ensure you can tab through our 3D space without needing a mouse.\n- **High-Contrast Mindset:** Our visual assets are designed to pop, keeping legibility in mind even when the camera is panning through cyberspace.\n',
    '# Erişilebilirlikte Özet\n\nWeb erişilebilirliğinde ne yaptığımızı biliyoruz. WCAG yönergelerine hakimiz ve webin herkes için açık olması gerektiğine inanıyoruz. Ancak pikselleri Z eksenine taşımak, ekran okuyucu entegrasyonu ve klavye gezinimini karmaşık hale getiriyor.\n\nRadikal 3B yenilik ile evrensel erişim arasındaki boşluğu kapatmak için yaptıklarımız:\n\n- **Gölge Yönetim Kurulu:** 3B grafiklerin arkasında çalışan, yardımcı teknolojilerle iletişim kuran gizli DOM öğeleri ve ARIA etiketleri tasarladık.\n- **Yönetici Tuş Vuruşları:** 3B alanımızda fare olmadan sekmeyle gezinebilmeniz için özel klavye navigasyonu uyguladık.\n- **Yüksek Kontrast Zihniyeti:** Görsel varlıklarımız, kamera siber uzayda dolaşırken bile okunabilirliği koruyacak şekilde tasarlandı.\n',
  ],
  [
    '# Our Open-Door Policy\n\nIf our cutting-edge 3D canvas is creating a bottleneck in your workflow or blocking your productivity, we want to know about it. At the end of the day, we are in the business of delivering results, not digital red tape. Please have your people reach out to our executive secretary via the electronic mail system at secretary@shader.se. We will happily fast-track a plain-text dossier of our services directly to your inbox, assist you with scoping your next project, or just talk shop about the future of AI.\n',
    '# Açık Kapı Politikamız\n\nSite deneyimi veya erişilebilirlik konusunda geri bildiriminiz varsa bizimle iletişime geçin. ' +
      CONTACT_EMAIL +
      ' adresinden veya WhatsApp üzerinden ulaşabilirsiniz. Projenizi planlamak veya hizmetlerimiz hakkında bilgi almak için memnuniyetle yardımcı oluruz.\n',
  ],
  [
    '# Where We Fall Short\n\nDespite our best efforts to future-proof this asset, rendering text and interactive elements purely to a 3D canvas means it might not behave perfectly with every piece of assistive technology on the market. We haven\'t cut corners, we just extruded them into the third dimension, but we acknowledge that the experience might not be 100 percent seamless for everyone.\n',
    '# Eksik Kaldığımız Noktalar\n\nBu varlığı geleceğe hazırlamak için elimizden geleni yapsak da, metin ve etkileşimli öğeleri yalnızca 3B canvas’a render etmek piyasadaki her yardımcı teknolojiyle kusursuz çalışmayabilir. Köşe kesmedik — sadece üçüncü boyuta çıkardık — ancak deneyimin herkes için yüzde yüz sorunsuz olmayabileceğini kabul ediyoruz.\n',
  ],

  // —— Proje açıklamaları (portföy) ——
  [
    "We created an interactive 3D platform that explores how the latest e-health solutions work in practice. From the patient's home to hospital environments and care providers' workplaces. Users can follow real care journeys, and understand how it all connects to create safer, more efficient care.",
    'Sağlık sektörü için geliştirdiğim interaktif web platformu — işletmenin hizmetlerini dijitalde anlaşılır şekilde sunması için tasarlandı.',
  ],
  [
    'Select Concept is a Swedish brand offering high-quality products for restaurants, hotels and cafes. We teamed up with them to conceptualize, design, and develop a user-friendly yet powerful 3D product planning tool, along with a new website.',
    'Restoran ve otel işletmesi için ürün kataloğu ve kurumsal web sitesi geliştirdim; müşteriler ürünleri kolayca inceleyebiliyor.',
  ],
  [
    'Gamily is the dating and friend app designed for gamers who are looking for meaningful relationships with fellow gamers.',
    'Mobil uygulama projesi — kullanıcı odaklı arayüz ve güvenilir altyapı ile geliştirildi.',
  ],
  [
    'Alamance Foods make fun foods. We made their web page using creative design ideas complemented with their products in 3D.',
    'Gıda markası için dikkat çekici kurumsal web sitesi; ürünleri öne çıkaran modern tasarım.',
  ],
  [
    'We manage the entire web platform for Scenkonst Öst where Norrköping Symphony Orchestra is a part. The audience can browse concerts, book tickets, buy gift cards and much more.',
    'Etkinlik ve bilet satışı için tam kapsamlı web platformu — ziyaretçiler kolayca gezinebiliyor ve işlem yapabiliyor.',
  ],
  [
    'We made a configurator for a company that sells glass in different forms. The user can create their own glass rails, walls and separate pieces using our 3D configurator. The prices are being fetched from an API so that we can calculate the total cost as the user designs.',
    'Online ürün yapılandırıcı ve fiyat hesaplama sistemi — müşteriler kendi tasarımlarını oluşturup anında fiyat görebiliyor.',
  ],
  [
    'What was supposed to be a one shot PR event became a lasting piece of the SPP website. The visitor takes a photo of him/herself and writes a short description of what the days would look like when retired from work.',
    'Etkileşimli kampanya web uygulaması — ziyaretçi katılımını artıran özel yazılım projesi.',
  ],
  [
    "ICA is one of Sweden's largest grocery stores. For Christmas 2024 we made an AR game for them where users could scan ICA's products and unlock features in the game.",
    'Perakende markası için mobil AR deneyimi — müşteri etkileşimini artıran yazılım projesi.',
  ],
  [
    'We created a real-time 3D visual experience detailing the physical journey and logistics of two shipping containers. The objective of this application was to provide users with a detailed and engaging insight into the complex operations conducted at the docks of Norrköping.',
    'Lojistik firması için görsel anlatım web uygulaması — karmaşık süreçleri basit ve etkileyici şekilde sunuyor.',
  ],
  [
    'This visualization was created for Händelö Eco-Industrial Park and shows how different factories and units exchange by-products, reducing waste and maximizing overall efficiency.',
    'Sakarya ve çevresinde klima montaj, bakım ve VRF çözümleri sunan Lider Teknik için kurumsal web sitesi. Hizmet kataloğu, akıllı klima araçları ve WhatsApp ile hızlı teklif.',
  ],
  ['Visit HEIP website, opens in new tab', 'Lider Teknik sitesini ziyaret et, yeni sekmede açılır'],
  ['HEIP', 'Lider Teknik'],
  ['HEIP – 3D Visualisation', 'Lider Teknik — Kurumsal Site'],
  ['Visit site', 'Siteyi ziyaret et'],
  ['Main navigation', 'Ana menü'],
  ['Go back to projects overview', 'Projelere dön'],
  ['Project details', 'Proje detayları'],
  [
    "Funny is the design work of Daniele Buffa, a Roman designer now based in London, UK. Buffa ('boo-f:ah) from the Italian means funny, comic, or droll.",
    'Tasarımcı portföy web sitesi — yaratıcı işleri öne çıkaran minimal ve etkileyici arayüz.',
  ],
];

function expandVariants(from, to) {
  const out = [[from, to]];
  if (from.includes('\n')) {
    out.push([from.replace(/\n/g, '\\n'), to.replace(/\n/g, '\\n')]);
  }
  if (from.includes("'")) {
    out.push([from.replace(/'/g, '&#x27;'), to.replace(/'/g, '&#x27;')]);
  }
  return out;
}

const PAIRS = [];
for (const [from, to] of BASE_PAIRS) {
  for (const pair of expandVariants(from, to)) {
    PAIRS.push(pair);
  }
}
PAIRS.sort((a, b) => b[0].length - a[0].length);

const JS_SKIP = new Set([
  'Footer',
  'Social',
  'Website',
  'Portfolio',
  'Home',
  'Contact',
  'About Us',
  'Selected Work',
  'Book a call',
  'Visit us',
  'New business',
  'General Enquiries',
  'Book a Call Today',
  'Accessibility Statement',
  'Project carousel',
  'Previous project',
  'Next project',
  'View project:',
  '3D Showroom',
  'AR Game',
]);

const JS_EXTRA = [
  ['children:"Book a call"', 'children:"İletişime Geçin"'],
  ['text:"Book a call"', 'text:"İletişime Geçin"'],
  ['children:"General Enquiries"', 'children:"Genel Sorular"'],
  ['children:"Selected Work"', 'children:"Projelerim"'],
  ['children:"About Us"', 'children:"Hakkımda"'],
  ['children:"Home"', 'children:"Ana Sayfa"'],
  ['children:"Contact"', 'children:"İletişim"'],
  ['children:"Shader — Home"', 'children:"PIXELA — Ana Sayfa"'],
  ['children:"Book a Call Today"', 'children:"Proje Teklifi Alın"'],
  ['children:"Previous project"', 'children:"Önceki proje"'],
  ['children:"Next project"', 'children:"Sonraki proje"'],
  ['children:"Back to projects"', 'children:"Projelere dön"'],
  ['children:"Next Project"', 'children:"Sonraki proje"'],
  ['children:"Project carousel"', 'children:"Proje karuseli"'],
  ['children:"View project"', 'children:"Projeyi görüntüle"'],
  ['children:"Visit site"', 'children:"Siteyi ziyaret et"'],
  ['children:"HEIP"', 'children:"Lider Teknik"'],
  ['children:"3D Visualisation"', 'children:"Kurumsal Site"'],
  ['children:"Visit us"', 'children:"Adres"'],
  ['children:"Social"', 'children:"Sosyal medya"'],
  ['children:"New business"', 'children:"Yeni projeler"'],
  ['children:"Good buy."', 'children:"İyi alışverişler!"'],
  [
    'children:"Still Not Convinced We\'re Serious About Business?"',
    'children:"Hâlâ işimize ciddiyetle yaklaştığımıza inanmıyor musunuz?"',
  ],
  [
    'children:"We\'ve got one last trick up our sleeve."',
    'children:"Cebimizde son bir sürpriz daha var."',
  ],
  [
    'children:"Had Enough Reading? Let\'s Shred This Thing."',
    'children:"Okumaktan sıkıldınız mı? Projelere geçelim."',
  ],
  [
    'children:"A High Tech Business Solutions Company"',
    'children:"Yazılım ve Kurumsal Web Çözümleri"',
  ],
  ['children:"Check Out This Golden Tie"', 'children:"Şu Altın Kravata Bir Bakın"'],
  [
    'children:"You made it this far. You deserve a tie-break."',
    'children:"Buraya kadar geldiniz — kravat molası hak ettiniz."',
  ],
  ['bookACall:"https://cal.com/simon-hedlund-kglzne"', `bookACall:"${WP_URL}"`],
  ['https://cal.com/simon-hedlund-kglzne', WP_URL],
  [
    'aria-label:"Cal.com\'da görüşme ayarla, yeni sekmede açılır"',
    'aria-label:"WhatsApp ile iletişime geçin, yeni sekmede açılır"',
  ],
  ['text:"Visit site"', 'text:"Siteyi ziyaret et"'],
  ['text:"HEIP"', 'text:"Lider Teknik"'],
  ['aria-label:"Selected Work"', 'aria-label:"Projelerim"'],
  ['aria-label:"About Us"', 'aria-label:"Hakkımda"'],
  ['aria-label:"Contact"', 'aria-label:"İletişim"'],
  ['aria-label:"Previous project"', 'aria-label:"Önceki proje"'],
  ['aria-label:"Next project"', 'aria-label:"Sonraki proje"'],
  ['View project: ', 'Projeyi görüntüle: '],
  ['View project: ${', 'Projeyi görüntüle: ${'],
  ['"name":"Portfolio"', '"name":"Projelerim"'],
];

function buildJsPairs() {
  const out = PAIRS.filter(([from]) => {
    if (JS_SKIP.has(from)) return false;
    if (from.length >= 28) return true;
    if (from.includes('\n')) return true;
    if (from.startsWith('#')) return true;
    if (from.startsWith('hero:"')) return true;
    if (from.startsWith('Navigate to')) return true;
    if (from.startsWith('Go to ')) return true;
    return false;
  });
  for (const pair of JS_EXTRA) out.push(pair);
  out.sort((a, b) => b[0].length - a[0].length);
  return out;
}

const JS_PAIRS = buildJsPairs();

/** RSC flight icin guvenli ceviri — \\n varyantlari ve uzun markdown yok (sayfayi bozar). */
function buildFlightPairs() {
  const skip = new Set([
    'Footer',
    'Social',
    'Home',
    'Contact',
    'About Us',
    'Selected Work',
    'Book a call',
    'Visit us',
    'New business',
    'General Enquiries',
    'Book a Call Today',
    'Accessibility Statement',
    'HEIP',
  ]);
  const out = BASE_PAIRS.filter(([from]) => {
    if (skip.has(from)) return false;
    if (from.includes('\n')) return false;
    if (from.startsWith('#')) return false;
    if (from.startsWith('hero:"')) return false;
    if (from.startsWith('Navigate to')) return false;
    if (from.startsWith('Go to ')) return false;
    return true;
  });
  out.sort((a, b) => b[0].length - a[0].length);
  return out;
}

const FLIGHT_PAIRS = buildFlightPairs();

/** Flight + RSC icinde guvenli uzun metin ceviri (markdown, aciklamalar) */
function buildMarkdownPairs() {
  const skip = new Set(['Website', 'Portfolio', 'Social', 'Footer']);
  const seen = new Set();
  const out = [];
  for (const [from, to] of PAIRS) {
    if (skip.has(from)) continue;
    if (from.startsWith('hero:"')) continue;
    if (from.startsWith('Navigate to')) continue;
    if (from.startsWith('Go to ')) continue;
    if (from.length < 20 && !from.includes('HEIP') && !from.includes('Händelö')) continue;
    if (seen.has(from)) continue;
    seen.add(from);
    out.push([from, to]);
  }
  out.sort((a, b) => b[0].length - a[0].length);
  return out;
}

const MARKDOWN_PAIRS = buildMarkdownPairs();

/** Tarayici DOM — kisa UI metinleri (tam eslesme veya aria-label) */
function getDomTrPairs() {
  const ui = [
    'HEIP',
    '3D Visualisation',
    'Visit site',
    'Selected Work',
    'About Us',
    'Book a call',
    'Book a Call Today',
    'General Enquiries',
    'Visit us',
    'New business',
    'Social',
    'Good buy.',
    'Still Not Convinced We\'re Serious About Business?',
    'We\'ve got one last trick up our sleeve.',
    'Had Enough Reading? Let\'s Shred This Thing.',
    'A High Tech Business Solutions Company',
    'Check Out This Golden Tie',
    'You made it this far. You deserve a tie-break.',
    'Accessibility Statement',
    'Project carousel',
    'Previous project',
    'Next project',
    'View project',
    'Back to projects',
    'Next Project',
    'Skip to content',
    'Contact',
    'Home',
    'Reload',
    'Back',
    'This page couldn\'t load',
    'Reload to try again, or go back.',
    'Go back to projects overview',
    'Main navigation',
    'Project details',
    'Visit HEIP website, opens in new tab',
    'HEIP – 3D Visualisation',
  ];
  const map = new Map(PAIRS);
  const out = [];
  for (const key of ui) {
    if (map.has(key)) out.push([key, map.get(key)]);
  }
  out.push([
    'This visualization was created for Händelö Eco-Industrial Park and shows how different factories and units exchange by-products, reducing waste and maximizing overall efficiency.',
    map.get(
      'This visualization was created for Händelö Eco-Industrial Park and shows how different factories and units exchange by-products, reducing waste and maximizing overall efficiency.'
    ) || 'Sakarya ve çevresinde klima montaj, bakım ve VRF çözümleri sunan Lider Teknik için kurumsal web sitesi. Hizmet kataloğu, akıllı klima araçları ve WhatsApp ile hızlı teklif.',
  ]);
  out.sort((a, b) => b[0].length - a[0].length);
  return out;
}

function applyRscTranslations(text) {
  if (!text || typeof text !== 'string') return text;
  return translateChunk(text, MARKDOWN_PAIRS);
}

function applyRscTranslationsBuffer(body) {
  const text = body.toString('utf8');
  const out = applyRscTranslations(text);
  return text === out ? body : Buffer.from(out, 'utf8');
}

function translateChunk(chunk, pairs) {
  let out = chunk;
  for (const [from, to] of pairs) {
    if (out.includes(from)) out = out.split(from).join(to);
  }
  return out;
}

function isLdJsonScript(block) {
  return /^<script\b/i.test(block) && /type=["']application\/ld\+json["']/i.test(block);
}

function isFlightScript(block) {
  return /^<script\b/i.test(block) && /self\.__next_f\.push/.test(block);
}

function isProjectFlightScript(block) {
  return isFlightScript(block) && /\/work\//.test(block) && /subtitle/.test(block);
}

function translateScriptBody(block, pairs) {
  return block.replace(
    /(<script[^>]*>)([\s\S]*?)(<\/script>)/i,
    (_, open, body, close) => open + translateChunk(body, pairs) + close
  );
}

function applyTranslations(input, mode = 'html') {
  if (!input || typeof input !== 'string') return input;
  const pairs = mode === 'js' ? JS_PAIRS : PAIRS;

  if (mode === 'html') {
    const blocks = input.split(/(<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>)/gi);
    let out = '';
    for (const block of blocks) {
      if (/^<style\b/i.test(block)) {
        out += block;
        continue;
      }
      if (isLdJsonScript(block)) {
        out += block;
        continue;
      }
      if (isFlightScript(block)) {
        out += block;
        continue;
      }
      if (/^<script\b/i.test(block)) {
        out += block;
        continue;
      }
      out += translateChunk(block, pairs);
    }
    return out;
  }

  return translateChunk(input, pairs);
}

function applyTranslationsBuffer(body, mode = 'html') {
  const text = body.toString('utf8');
  const out = applyTranslations(text, mode);
  return text === out ? body : Buffer.from(out, 'utf8');
}

let browserTrJs = null;
function getBrowserTrJs() {
  if (!browserTrJs) {
    browserTrJs =
      'window.__pixelaTr=function(s){if(!s||typeof s!=="string")return s;' +
      'var p=' +
      JSON.stringify(PAIRS) +
      ';for(var i=0;i<p.length;i++){var f=p[i][0],t=p[i][1];if(s.indexOf(f)!==-1)s=s.split(f).join(t);}return s;};';
  }
  return browserTrJs;
}

let chunkPatchJs = null;
function getChunkPatchJs() {
  if (!chunkPatchJs) {
    /** Yalnizca URL yonlendirme — ph()/flight hook sayfayi bozuyordu (v80) */
    chunkPatchJs =
      "(function(){if(window.__pixelaChunkTr)return;window.__pixelaChunkTr=1;" +
      "var WP='" + WP_URL.replace(/'/g, "\\'") + "';" +
      "var GR=/https?:\\/\\/(?:www\\.)?shader\\.se\\/models\\/(shredder|computer)\\.glb/i;" +
      "function rw(u){if(!u)return u;u=String(u);if(/cal\\.com/i.test(u))return WP;if(/\\/textures\\/boot_screen_mobile\\.png/i.test(u))return'/pixela-boot-screen-mobile.png';if(/\\/textures\\/boot_screen\\.png/i.test(u))return'/pixela-boot-screen.png';if(/stream\\.mux\\.com/i.test(u)&&u.indexOf('LbdE02DF9Gx1iVtxU98nv6uOtEEmQkTSs00Uyqb6O0201Tw')!==-1)return'/videos/heip-lider-teknik.mp4?v=94';if(/\\/api\\/mux-image\\//i.test(u)&&u.indexOf('LbdE02DF9Gx1iVtxU98nv6uOtEEmQkTSs00Uyqb6O0201Tw')!==-1)return'/videos/heip-poster.jpg?v=94';if(GR.test(u)||/\\/models\\/(shredder|computer)\\.glb/i.test(u))return u.replace(/https?:\\/\\/(?:www\\.)?shader\\.se/i,'').split('?')[0]+'?_='+Date.now();return u;}" +
      'var f=window.fetch;if(f){var of=f;window.fetch=function(i,n){var u=typeof i==="string"?i:i&&i.url||"";var x=rw(u);if(x!==u)return of.call(this,x,n);return of.apply(this,arguments);};}' +
      'var oo=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,u){this.__pxu=rw(String(u));return oo.apply(this,[m,this.__pxu].concat([].slice.call(arguments,2)));};' +
      'var op=window.open;if(op){window.open=function(u){if(u&&/cal\\.com/i.test(String(u)))return op.call(this,WP,"_blank","noopener");return op.apply(this,arguments);};}' +
      '})();';
  }
  return chunkPatchJs;
}

module.exports = {
  applyTranslations,
  applyTranslationsBuffer,
  applyRscTranslations,
  applyRscTranslationsBuffer,
  PAIRS,
  JS_PAIRS,
  WP_URL,
  getBrowserTrJs,
  getChunkPatchJs,
  getDomTrPairs,
};
