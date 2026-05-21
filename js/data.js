/* ============================================
   HAWDAJ GAME — Data Layer (localStorage)
   ============================================ */

const HawdajData = (() => {
  const STORAGE_KEY = 'hawdaj_game_data';

  // Default episode names
  const EPISODE_NAMES = {
    1: 'الهودج والرحلة', 2: 'الدرعية', 3: 'قصر المصمك',
    4: 'العلم السعودي', 5: 'اليوم الوطني',
    6: 'أرض الحضارات', 7: 'مكة: محيط الوحي', 8: 'رحلات القوافل',
    9: 'حضارات الصخور', 10: 'كيف تولد المدن؟',
    11: 'تراثنا الحي', 12: 'الكرم والمجلس والقهوة السعودية',
    13: 'اللبس والهوية', 14: 'البيوت والفنون الشعبية', 15: 'رمضان في السعودية',
    16: 'مشاريع المستقبل', 17: 'نيوم', 18: 'مدينة المستقبل',
    19: 'التقنية والمهارات', 20: 'نحلم ونحقق'
  };

  // Default general questions
  const DEFAULT_GENERAL_QUESTIONS = [
    {
      id: 'g1', question: 'ما هي عاصمة المملكة العربية السعودية؟',
      options: ['الرياض', 'جدة', 'مكة المكرمة', 'المدينة المنورة'],
      correct: 0, hint: 'أكبر مدينة في المملكة', image: ''
    },
    {
      id: 'g2', question: 'في أي عام تم توحيد المملكة العربية السعودية؟',
      options: ['1932', '1945', '1920', '1950'],
      correct: 0, hint: 'في عهد الملك عبدالعزيز', image: ''
    },
    {
      id: 'g3', question: 'ما هو اللون الموجود في العلم السعودي؟',
      options: ['الأخضر', 'الأحمر', 'الأزرق', 'الأصفر'],
      correct: 0, hint: 'لون يرمز للإسلام', image: ''
    },
    {
      id: 'g4', question: 'أين يقع قصر المصمك؟',
      options: ['الرياض', 'جدة', 'الدمام', 'أبها'],
      correct: 0, hint: 'في عاصمة المملكة', image: ''
    },
    {
      id: 'g5', question: 'ما هو أطول برج في السعودية؟',
      options: ['برج جدة', 'برج المملكة', 'برج الفيصلية', 'برج رافال'],
      correct: 0, hint: 'في مدينة جدة', image: ''
    },
    {
      id: 'g6', question: 'متى يُحتفل باليوم الوطني السعودي؟',
      options: ['23 سبتمبر', '1 يناير', '15 مارس', '2 ديسمبر'],
      correct: 0, hint: 'في شهر سبتمبر', image: ''
    },
    {
      id: 'g7', question: 'ما هي الدرعية؟',
      options: ['العاصمة الأولى للدولة السعودية', 'مدينة ساحلية', 'جبل مشهور', 'واحة في الصحراء'],
      correct: 0, hint: 'مرتبطة بتاريخ الدولة السعودية الأولى', image: ''
    },
    {
      id: 'g8', question: 'ما هو مشروع نيوم؟',
      options: ['مدينة المستقبل في شمال غرب السعودية', 'مطار جديد', 'جامعة', 'متحف'],
      correct: 0, hint: 'مشروع ضخم ضمن رؤية 2030', image: ''
    },
    {
      id: 'g9', question: 'أين تقع مدائن صالح؟',
      options: ['العلا', 'تبوك', 'نجران', 'الباحة'],
      correct: 0, hint: 'في منطقة المدينة المنورة', image: ''
    },
    {
      id: 'g10', question: 'ما هي رؤية السعودية؟',
      options: ['رؤية 2030', 'رؤية 2020', 'رؤية 2040', 'رؤية 2050'],
      correct: 0, hint: 'أُطلقت عام 2016', image: ''
    },
    {
      id: 'g11', question: 'ما هو المشروب الشعبي في السعودية؟',
      options: ['القهوة العربية', 'الشاي الأخضر', 'العصير', 'الحليب'],
      correct: 0, hint: 'تُقدم مع التمر', image: ''
    },
    {
      id: 'g12', question: 'ما هو رمز السيف في العلم السعودي؟',
      options: ['القوة والعدل', 'الحرب', 'السلام', 'التجارة'],
      correct: 0, hint: 'يرمز لقيمتين مهمتين', image: ''
    },
    {
      id: 'g13', question: 'أين يقع جبل طويق؟',
      options: ['وسط السعودية', 'جنوب السعودية', 'شمال السعودية', 'شرق السعودية'],
      correct: 0, hint: 'يمتد من القصيم إلى الربع الخالي', image: ''
    },
    {
      id: 'g14', question: 'ما اسم الملك المؤسس للمملكة العربية السعودية؟',
      options: ['الملك عبدالعزيز بن عبدالرحمن', 'الملك فيصل', 'الملك سعود', 'الملك خالد'],
      correct: 0, hint: 'أسس المملكة الحديثة', image: ''
    },
    {
      id: 'g15', question: 'ما هو نقش السدو؟',
      options: ['فن نسيج تقليدي سعودي', 'نوع من الخط العربي', 'رسم جداري', 'نوع من الموسيقى'],
      correct: 0, hint: 'حرفة يدوية تقليدية', image: ''
    }
  ];

  // Default episode questions
  function generateEpisodeQuestions() {
    const questions = {};
    for (let ep = 1; ep <= 20; ep++) {
      questions[ep] = [
        {
          id: `ep${ep}_1`, question: `ما هو الموضوع الرئيسي لحلقة "${EPISODE_NAMES[ep]}"؟`,
          options: ['الموضوع الأول', 'الموضوع الثاني', 'الموضوع الثالث', 'الموضوع الرابع'],
          correct: 0, hint: `راجع حلقة ${ep}`, image: ''
        },
        {
          id: `ep${ep}_2`, question: `ماذا تعلم عزّام في حلقة "${EPISODE_NAMES[ep]}"؟`,
          options: ['الدرس الأول', 'الدرس الثاني', 'الدرس الثالث', 'الدرس الرابع'],
          correct: 0, hint: `شاهد حلقة ${ep} مرة أخرى`, image: ''
        },
        {
          id: `ep${ep}_3`, question: `أين ذهب عزّام والجادل في حلقة "${EPISODE_NAMES[ep]}"؟`,
          options: ['المكان الأول', 'المكان الثاني', 'المكان الثالث', 'المكان الرابع'],
          correct: 0, hint: `تذكر رحلة الحلقة ${ep}`, image: ''
        }
      ];
    }
    return questions;
  }

  // Region data
  const REGIONS_DATA = {
    riyadh: {
      name: 'منطقة الرياض', capital: 'الرياض',
      facts: '• عاصمة المملكة العربية السعودية\n• أكبر مدينة في المملكة\n• بها قصر المصمك التاريخي\n• مركز سياسي واقتصادي',
      questions: [
        { id: 'r_riyadh_1', question: 'ما هي عاصمة منطقة الرياض؟', options: ['الرياض', 'الخرج', 'الدرعية', 'المجمعة'], correct: 0 },
        { id: 'r_riyadh_2', question: 'أين يقع قصر المصمك؟', options: ['الرياض', 'جدة', 'مكة', 'الدمام'], correct: 0 },
        { id: 'r_riyadh_3', question: 'ما هو أشهر معلم حديث في الرياض؟', options: ['برج المملكة', 'برج جدة', 'برج العرب', 'برج خليفة'], correct: 0 }
      ]
    },
    makkah: {
      name: 'منطقة مكة المكرمة', capital: 'مكة المكرمة',
      facts: '• بها المسجد الحرام والكعبة المشرفة\n• قبلة المسلمين\n• مدينة جدة الساحلية\n• أقدس بقعة في الإسلام',
      questions: [
        { id: 'r_makkah_1', question: 'ماذا يوجد في مكة المكرمة؟', options: ['المسجد الحرام', 'المسجد النبوي', 'المسجد الأقصى', 'الجامع الأزهر'], correct: 0 },
        { id: 'r_makkah_2', question: 'ما اسم الميناء الرئيسي في المنطقة؟', options: ['ميناء جدة الإسلامي', 'ميناء الدمام', 'ميناء ينبع', 'ميناء الجبيل'], correct: 0 },
        { id: 'r_makkah_3', question: 'ما هي جدة التاريخية؟', options: ['منطقة تراثية قديمة', 'حديقة', 'مطار', 'جامعة'], correct: 0 }
      ]
    },
    madinah: {
      name: 'منطقة المدينة المنورة', capital: 'المدينة المنورة',
      facts: '• بها المسجد النبوي الشريف\n• أول عاصمة في الإسلام\n• يقع فيها مدائن صالح (الحِجر)\n• منطقة العلا التاريخية',
      questions: [
        { id: 'r_madinah_1', question: 'ماذا يوجد في المدينة المنورة؟', options: ['المسجد النبوي', 'المسجد الحرام', 'قصر المصمك', 'برج المملكة'], correct: 0 },
        { id: 'r_madinah_2', question: 'أين تقع مدائن صالح؟', options: ['العلا', 'ينبع', 'خيبر', 'بدر'], correct: 0 },
        { id: 'r_madinah_3', question: 'ما هي العلا؟', options: ['منطقة تاريخية وسياحية', 'مصنع', 'مطار', 'جامعة'], correct: 0 }
      ]
    },
    qassim: {
      name: 'منطقة القصيم', capital: 'بريدة',
      facts: '• تشتهر بزراعة التمور والنخيل\n• عاصمتها بريدة\n• تضم مدينة عنيزة\n• منطقة زراعية مهمة',
      questions: [
        { id: 'r_qassim_1', question: 'بماذا تشتهر القصيم؟', options: ['التمور', 'الأسماك', 'النفط', 'المعادن'], correct: 0 },
        { id: 'r_qassim_2', question: 'ما هي عاصمة القصيم؟', options: ['بريدة', 'عنيزة', 'البكيرية', 'الرس'], correct: 0 },
        { id: 'r_qassim_3', question: 'ما أشهر مهرجان في القصيم؟', options: ['مهرجان التمور', 'مهرجان الورد', 'مهرجان الجنادرية', 'مهرجان البحر'], correct: 0 }
      ]
    },
    eastern: {
      name: 'المنطقة الشرقية', capital: 'الدمام',
      facts: '• أكبر منطقة في السعودية\n• مركز صناعة النفط\n• بها شركة أرامكو\n• تضم واحة الأحساء',
      questions: [
        { id: 'r_eastern_1', question: 'بماذا تشتهر المنطقة الشرقية؟', options: ['النفط', 'التمور', 'الزراعة', 'الصيد'], correct: 0 },
        { id: 'r_eastern_2', question: 'ما اسم أكبر واحة في العالم الموجودة فيها؟', options: ['الأحساء', 'الدوادمي', 'وادي الدواسر', 'بيشة'], correct: 0 },
        { id: 'r_eastern_3', question: 'أين يقع مقر أرامكو؟', options: ['الظهران', 'الرياض', 'جدة', 'أبها'], correct: 0 }
      ]
    },
    asir: {
      name: 'منطقة عسير', capital: 'أبها',
      facts: '• تتميز بمناخها المعتدل\n• بها منتزه السودة\n• تشتهر بالقرى التراثية المعلقة\n• طبيعة جبلية خلابة',
      questions: [
        { id: 'r_asir_1', question: 'ما هي عاصمة عسير؟', options: ['أبها', 'خميس مشيط', 'النماص', 'بيشة'], correct: 0 },
        { id: 'r_asir_2', question: 'بماذا تتميز عسير؟', options: ['المناخ المعتدل والطبيعة الجبلية', 'الصحاري', 'النفط', 'الشواطئ'], correct: 0 },
        { id: 'r_asir_3', question: 'ما هو منتزه السودة؟', options: ['أعلى قمة في السعودية', 'شاطئ', 'متحف', 'سوق'], correct: 0 }
      ]
    },
    tabuk: {
      name: 'منطقة تبوك', capital: 'تبوك',
      facts: '• تقع في شمال غرب المملكة\n• بها مشروع نيوم\n• تضم شاطئ حقل\n• تاريخ عريق مع غزوة تبوك',
      questions: [
        { id: 'r_tabuk_1', question: 'أي مشروع ضخم يقع في تبوك؟', options: ['نيوم', 'القدية', 'البحر الأحمر', 'أمالا'], correct: 0 },
        { id: 'r_tabuk_2', question: 'أين تقع تبوك؟', options: ['شمال غرب', 'جنوب', 'وسط', 'شرق'], correct: 0 },
        { id: 'r_tabuk_3', question: 'ما هي غزوة تبوك؟', options: ['آخر غزوات الرسول ﷺ', 'أول غزوة', 'معركة بحرية', 'معركة جوية'], correct: 0 }
      ]
    },
    hail: {
      name: 'منطقة حائل', capital: 'حائل',
      facts: '• تشتهر بجبلي أجا وسلمى\n• بها رسوم صخرية قديمة\n• معروفة بالكرم والضيافة\n• تاريخ حاتم الطائي',
      questions: [
        { id: 'r_hail_1', question: 'بماذا تشتهر حائل؟', options: ['الكرم وجبلي أجا وسلمى', 'النفط', 'البحر', 'النخيل'], correct: 0 },
        { id: 'r_hail_2', question: 'من هو حاتم الطائي؟', options: ['رمز الكرم العربي', 'شاعر', 'ملك', 'فاتح'], correct: 0 },
        { id: 'r_hail_3', question: 'ما هي الرسوم الصخرية في حائل؟', options: ['نقوش أثرية قديمة', 'لوحات حديثة', 'خرائط', 'كتب'], correct: 0 }
      ]
    },
    northern: {
      name: 'منطقة الحدود الشمالية', capital: 'عرعر',
      facts: '• تقع على الحدود مع العراق\n• عاصمتها عرعر\n• تضم مدينة رفحاء\n• تتميز بالمراعي الطبيعية',
      questions: [
        { id: 'r_northern_1', question: 'ما هي عاصمة الحدود الشمالية؟', options: ['عرعر', 'رفحاء', 'طريف', 'سكاكا'], correct: 0 },
        { id: 'r_northern_2', question: 'مع أي دولة تحد المنطقة؟', options: ['العراق', 'اليمن', 'عُمان', 'الإمارات'], correct: 0 },
        { id: 'r_northern_3', question: 'بماذا تتميز الحدود الشمالية؟', options: ['المراعي الطبيعية', 'الشواطئ', 'الجبال العالية', 'النخيل'], correct: 0 }
      ]
    },
    jazan: {
      name: 'منطقة جازان', capital: 'جازان',
      facts: '• تقع في جنوب غرب المملكة\n• تشتهر بزراعة المانجو\n• بها جزر فرسان\n• مناخ استوائي',
      questions: [
        { id: 'r_jazan_1', question: 'بماذا تشتهر جازان زراعياً؟', options: ['المانجو', 'التمور', 'القمح', 'الأرز'], correct: 0 },
        { id: 'r_jazan_2', question: 'ما اسم الجزر الموجودة في جازان؟', options: ['فرسان', 'جاوا', 'المالديف', 'سقطرى'], correct: 0 },
        { id: 'r_jazan_3', question: 'أين تقع جازان؟', options: ['جنوب غرب', 'شمال', 'وسط', 'شرق'], correct: 0 }
      ]
    },
    najran: {
      name: 'منطقة نجران', capital: 'نجران',
      facts: '• بها الأخدود الأثري\n• تشتهر بالعمارة الطينية\n• منطقة زراعية مهمة\n• قريبة من الحدود اليمنية',
      questions: [
        { id: 'r_najran_1', question: 'ما هو الأخدود في نجران؟', options: ['موقع أثري تاريخي', 'نهر', 'جبل', 'مصنع'], correct: 0 },
        { id: 'r_najran_2', question: 'بماذا تشتهر عمارة نجران؟', options: ['البيوت الطينية', 'ناطحات السحاب', 'الخيام', 'الكهوف'], correct: 0 },
        { id: 'r_najran_3', question: 'أين تقع نجران؟', options: ['جنوب المملكة', 'شمال المملكة', 'شرق المملكة', 'غرب المملكة'], correct: 0 }
      ]
    },
    bahah: {
      name: 'منطقة الباحة', capital: 'الباحة',
      facts: '• تلقب بحديقة الحجاز\n• تتميز بالغابات الكثيفة\n• مناخها معتدل صيفاً\n• بها قرية ذي عين الأثرية',
      questions: [
        { id: 'r_bahah_1', question: 'ما لقب الباحة؟', options: ['حديقة الحجاز', 'لؤلؤة الجنوب', 'عروس البحر', 'مدينة الورود'], correct: 0 },
        { id: 'r_bahah_2', question: 'ما هي قرية ذي عين؟', options: ['قرية أثرية من الحجر', 'قرية حديثة', 'منتجع', 'مزرعة'], correct: 0 },
        { id: 'r_bahah_3', question: 'بماذا يتميز مناخ الباحة؟', options: ['معتدل صيفاً', 'حار جداً', 'بارد جداً', 'صحراوي'], correct: 0 }
      ]
    },
    jawf: {
      name: 'منطقة الجوف', capital: 'سكاكا',
      facts: '• تقع في شمال المملكة\n• بها قلعة زعبل التاريخية\n• تشتهر بزراعة الزيتون\n• عاصمتها سكاكا',
      questions: [
        { id: 'r_jawf_1', question: 'ما هي عاصمة الجوف؟', options: ['سكاكا', 'دومة الجندل', 'القريات', 'طبرجل'], correct: 0 },
        { id: 'r_jawf_2', question: 'بماذا تشتهر الجوف زراعياً؟', options: ['الزيتون', 'المانجو', 'الأرز', 'القطن'], correct: 0 },
        { id: 'r_jawf_3', question: 'ما هي قلعة زعبل؟', options: ['قلعة تاريخية', 'مصنع', 'مطار', 'جامعة'], correct: 0 }
      ]
    }
  };

  // Default puzzle data
  const DEFAULT_PUZZLES = [
    { id: 'p1', name: 'قصر المصمك', image: 'assets/puzzles/masmak.jpg' },
    { id: 'p2', name: 'برج المملكة', image: 'assets/puzzles/kingdom_tower.jpg' },
    { id: 'p3', name: 'مدائن صالح', image: 'assets/puzzles/madain_saleh.jpg' },
    { id: 'p4', name: 'جبل طويق', image: 'assets/puzzles/tuwaiq.jpg' },
    { id: 'p5', name: 'جدة التاريخية', image: 'assets/puzzles/jeddah_old.jpg' },
    { id: 'p6', name: 'الدرعية', image: 'assets/puzzles/diriyah.jpg' }
  ];

  // Default data structure
  function getDefaultData() {
    return {
      version: 2,
      theme: 'normal',
      adminPassword: 'hawdaj2026',
      player: {
        name: '',
        emoji: '⭐',
        totalScore: 0,
        quizScore: 0,
        puzzleScore: 0,
        mapScore: 0,
        gamesPlayed: 0,
        bestStreak: 0,
        completedRegions: [],
        dailyLastPlayed: null,
        dailyTasksDate: null,
        dailyTasksCompleted: [],
        achievements: [],
        powerups: { skip: 1, '5050': 2, hint: 1, puzzle_time: 1, magic_piece: 1, show_image: 1 },
        inventory: []
      },
      points: {
        correct: 10,   // base pts per correct answer
        speed: 5,      // max speed bonus per question (given instantly = +5)
        puzzle: 20,    // base pts per completed puzzle
        region: 15     // pts per map question
      },
      quizGeneral: DEFAULT_GENERAL_QUESTIONS,
      quizEpisodes: generateEpisodeQuestions(),
      puzzles: DEFAULT_PUZZLES,
      regions: REGIONS_DATA,
      leaderboard: [], // Real players loaded from Firebase
      competitions: [],
      dailyQuestion: null,
      storeItems: [
        // Quiz Powerups
        { id: 'item_skip', name: 'تخطي سؤال', price: 50, icon: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Symbols/Fast-Forward%20Button.png', desc: 'لعبة الأسئلة: تخطي سؤال بدون خسارة نقاط', type: 'powerup', powerupType: 'skip', rarity: 'common' },
        { id: 'item_5050', name: 'حذف إجابتين', price: 30, icon: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Symbols/Keycap%20Digit%20Two.png', desc: 'لعبة الأسئلة: يحذف إجابتين خاطئتين', type: 'powerup', powerupType: '5050', rarity: 'common' },
        { id: 'item_hint', name: 'تلميح سحري', price: 20, icon: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Light%20Bulb.png', desc: 'لعبة الأسئلة: تلميح يساعدك في الإجابة', type: 'powerup', powerupType: 'hint', rarity: 'common' },
        { id: 'item_doublexp', name: 'نقاط مضاعفة ×2', price: 80, icon: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Travel%20and%20places/High%20Voltage.png', desc: 'لعبة الأسئلة: نقاط مضاعفة للجولة القادمة!', type: 'powerup', powerupType: 'doublexp', rarity: 'rare' },
        { id: 'item_shield', name: 'درع الحماية', price: 60, icon: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Shield.png', desc: 'لعبة الأسئلة: حماية من إجابة خاطئة واحدة!', type: 'powerup', powerupType: 'shield', rarity: 'rare' },

        // Puzzle Powerups
        { id: 'item_puzzle_time', name: 'زيادة الوقت', price: 40, icon: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Travel%20and%20places/Alarm%20Clock.png', desc: 'لعبة البازل: يخصم من عداد الوقت 20 ثانية!', type: 'powerup', powerupType: 'puzzle_time', rarity: 'common' },
        { id: 'item_magic_piece', name: 'ترتيب قطعة', price: 60, icon: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Activities/Puzzle%20Piece.png', desc: 'لعبة البازل: يضع قطعة سحرية في مكانها الصحيح!', type: 'powerup', powerupType: 'magic_piece', rarity: 'rare' },
        { id: 'item_show_image', name: 'توضيح الصورة', price: 30, icon: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Telescope.png', desc: 'لعبة البازل: يعرض الصورة الأصلية لفترة زمنية', type: 'powerup', powerupType: 'show_image', rarity: 'common' },
        { id: 'item_freeze', name: 'تجميد الوقت', price: 90, icon: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Travel%20and%20places/Snowflake.png', desc: 'لعبة البازل: يخفي الوقت المتبقي لمدة 15 ثانية!', type: 'powerup', powerupType: 'freeze', rarity: 'epic' },

        // Avatars
        { id: 'avatar_ninja', name: 'نينجا الظلام', price: 100, icon: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/People/Ninja.png', desc: 'نينجا خارق يتحرك بسرعة البرق!', type: 'avatar', rarity: 'common' },
        { id: 'avatar_astronaut', name: 'رائد الفضاء', price: 200, icon: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/People/Astronaut.png', desc: 'اكتشف الفضاء والنجوم!', type: 'avatar', rarity: 'rare' },
        { id: 'avatar_pirate', name: 'القرصان الشجاع', price: 150, icon: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Skull%20and%20Crossbones.png', desc: 'أهلاً بالقرصان!', type: 'avatar', rarity: 'common' },
        { id: 'avatar_wizard', name: 'الساحر العظيم', price: 300, icon: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/People/Mage.png', desc: 'ساحر بقوى خارقة!', type: 'avatar', rarity: 'epic' },
        { id: 'avatar_robot', name: 'الروبوت الذكي', price: 250, icon: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Robot.png', desc: 'روبوت متطور بذكاء اصطناعي!', type: 'avatar', rarity: 'rare' },
        { id: 'avatar_dragon', name: 'تنين النار', price: 500, icon: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Dragon.png', desc: 'تنين أسطوري نادر جداً!', type: 'avatar', rarity: 'legendary' },
        { id: 'avatar_superhero', name: 'البطل الخارق', price: 400, icon: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/People/Superhero.png', desc: 'بطل خارق بقوى عجيبة!', type: 'avatar', rarity: 'epic' },
        { id: 'avatar_king', name: 'الملك المتوج', price: 600, icon: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/People/Prince.png', desc: 'ملك الملوك! الأندر على الإطلاق!', type: 'avatar', rarity: 'legendary' },
        { id: 'avatar_fairy', name: 'الجنية السحرية', price: 350, icon: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/People/Fairy.png', desc: 'جنية سحرية تمنحك الحظ!', type: 'avatar', rarity: 'epic' },
        { id: 'avatar_vampire', name: 'مصاص الدماء', price: 450, icon: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/People/Vampire.png', desc: 'مصاص دماء غامض!', type: 'avatar', rarity: 'epic' },
        { id: 'avatar_mermaid', name: 'حورية البحر', price: 550, icon: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/People/Merperson.png', desc: 'حورية من أعماق البحر!', type: 'avatar', rarity: 'legendary' },
        { id: 'avatar_elf', name: 'قزم الغابة', price: 180, icon: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/People/Elf.png', desc: 'قزم سريع وذكي!', type: 'avatar', rarity: 'rare' }
      ],
      devSettings: {
        characters: {
          azzam: { idle: '', happy: '', thinking: '', talking: '', sad: '' },
          jadel: { idle: '', happy: '', thinking: '', talking: '', sad: '' }
        },
        audio: {},
        icons: {},
        avatars: {}
      }
    };
  }

  let data = null;

  function load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        data = JSON.parse(saved);
        // Migration: ensure all fields exist
        const defaults = getDefaultData();
        for (const key in defaults) {
          if (!(key in data)) data[key] = defaults[key];
        }
        if (!data.player.achievements) data.player.achievements = [];
        if (!data.player.powerups) data.player.powerups = { skip: 1, '5050': 2, hint: 1, puzzle_time: 1, magic_piece: 1, show_image: 1 };
        if (!data.player.inventory) data.player.inventory = [];
        data.storeItems = defaults.storeItems; // Always sync store items with latest defaults
        if (!data.devSettings) data.devSettings = defaults.devSettings;
        // Migrate: ensure devSettings sub-objects exist
        if (!data.devSettings.audio) data.devSettings.audio = {};
        if (!data.devSettings.icons) data.devSettings.icons = {};
        if (!data.devSettings.avatars) data.devSettings.avatars = {};
        // Migrate: remove old fake leaderboard entries
        const fakeNames = ['فهد', 'نورة', 'سارة', 'محمد', 'ريم', 'عبدالله', 'لمى', 'خالد'];
        if (data.leaderboard && data.leaderboard.length > 0) {
          const allFake = data.leaderboard.every(e => fakeNames.includes(e.name));
          if (allFake) data.leaderboard = [];
        }
      } else {
        data = getDefaultData();
        save();
      }
    } catch (e) {
      console.warn('Failed to load data, using defaults', e);
      data = getDefaultData();
      save();
    }
    return data;
  }

  function saveGlobalToFirebase() {
    if (window.HawdajFirebase && window.HawdajFirebase.isReady) {
      data.dataVersion = Date.now(); // Increment version on every save
      window.HawdajFirebase.pushGlobalData(data);
    }
  }

  function save(isGlobalChange = false) {
    // 1. Sync to Firebase first so a local quota error doesn't block global sync
    try {
      if (isGlobalChange || (window.AdminPanel && window.AdminPanel.isLoggedIn && !window.blockGlobalSync)) {
        saveGlobalToFirebase();
      }
    } catch (e) {
      console.warn('Failed to trigger Firebase sync', e);
    }

    // 2. Save to LocalStorage
    try {
      const dataToSave = { ...data };
      if (dataToSave.devSettings) {
        dataToSave.devSettings = { ...dataToSave.devSettings };
        delete dataToSave.devSettings.characters;
        delete dataToSave.devSettings.icons;
        delete dataToSave.devSettings.avatars;
        delete dataToSave.devSettings.audio; // audio is already not synced, but just in case
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (e) {
      console.warn('Failed to save data locally (likely QuotaExceededError)', e);
    }
  }

  function get() {
    if (!data) load();
    return data;
  }

  function reset() {
    data = getDefaultData();
    save();
    return data;
  }

  function addScore(amount, game) {
    data.player.totalScore += amount;
    if (game === 'quiz') data.player.quizScore += amount;
    if (game === 'puzzle') data.player.puzzleScore += amount;
    if (game === 'map') data.player.mapScore += amount;
    data.player.gamesPlayed++;
    window.blockGlobalSync = true;
    updateLeaderboard();
    save();
    window.blockGlobalSync = false;

    // Notify all UI elements immediately
    window.dispatchEvent(new CustomEvent('HawdajScoreUpdated', {
      detail: { total: data.player.totalScore, amount, game }
    }));
  }

  function updateLeaderboard() {
    const playerEntry = data.leaderboard.find(e => e.name === data.player.name);
    if (playerEntry) {
      playerEntry.score = data.player.totalScore;
      playerEntry.emoji = data.player.emoji;
    } else if (data.player.name) {
      data.leaderboard.push({
        name: data.player.name,
        emoji: data.player.emoji,
        score: data.player.totalScore
      });
    }
    data.leaderboard.sort((a, b) => b.score - a.score);
    window.blockGlobalSync = true;
    save();
    window.blockGlobalSync = false;

    // Firebase Sync
    if (data.player.name && window.HawdajFirebase && window.HawdajFirebase.isReady) {
      window.HawdajFirebase.updatePlayerScore(data.player.name, data.player.emoji, data.player.totalScore);
    }
  }

  function addQuestion(category, question) {
    question.id = 'q_' + Date.now();
    if (category === 'general') {
      data.quizGeneral.push(question);
    } else if (typeof category === 'number') {
      if (!data.quizEpisodes[category]) data.quizEpisodes[category] = [];
      data.quizEpisodes[category].push(question);
    }
    save();
  }

  function deleteQuestion(category, questionId) {
    if (category === 'general') {
      data.quizGeneral = data.quizGeneral.filter(q => q.id !== questionId);
    } else if (typeof category === 'number') {
      if (data.quizEpisodes[category]) {
        data.quizEpisodes[category] = data.quizEpisodes[category].filter(q => q.id !== questionId);
      }
    }
    save();
  }

  function importQuestions(jsonArray) {
    let count = 0;
    jsonArray.forEach(q => {
      if (q.question && q.options && q.options.length === 4 && typeof q.correct === 'number') {
        const newQ = {
          id: 'q_' + Date.now() + '_' + count,
          question: q.question,
          options: q.options,
          correct: q.correct,
          hint: q.hint || '',
          image: q.image || ''
        };
        if (q.category === 'general') {
          data.quizGeneral.push(newQ);
        } else if (q.episode && typeof q.episode === 'number') {
          if (!data.quizEpisodes[q.episode]) data.quizEpisodes[q.episode] = [];
          data.quizEpisodes[q.episode].push(newQ);
        } else {
          data.quizGeneral.push(newQ);
        }
        count++;
      }
    });
    save();
    return count;
  }

  function exportAll() {
    return JSON.stringify(data, null, 2);
  }

  function getAvatarHTML(icon, size = 24) {
    if (!icon) return '';
    if (typeof icon === 'string' && (icon.startsWith('http') || icon.startsWith('data:'))) {
      return '<img src="' + icon + '" style="width:' + size + 'px;height:' + size + 'px;object-fit:contain;" onerror="this.style.display=\'none\'">';
    }
    return '<span style="font-size:' + (size * 0.7) + 'px;">' + icon + '</span>';
  }

  function getCharacterPose(charName, pose) {
    // Use dev settings if configured
    if (data.devSettings?.characters?.[charName]?.[pose]) {
      return data.devSettings.characters[charName][pose];
    }
    // Fallback to actual pose files
    const poseMap = {
      azzam: {
        idle: 'assets/char/وضعيات عزام/ترحيب.jpeg',
        happy: 'assets/char/وضعيات عزام/حماس.jpeg',
        thinking: 'assets/char/وضعيات عزام/تفكير.jpeg',
        talking: 'assets/char/وضعيات عزام/يتكلم.jpeg',
        sad: 'assets/char/وضعيات عزام/حزين.jpeg',
        welcome: 'assets/char/وضعيات عزام/ترحيب.jpeg'
      },
      jadel: {
        idle: 'assets/char/وضعيات الجادل/ترحيب.jpeg',
        happy: 'assets/char/وضعيات الجادل/حماس.jpeg',
        thinking: 'assets/char/وضعيات الجادل/تفكير.jpeg',
        talking: 'assets/char/وضعيات الجادل/تتكلم.jpeg',
        sad: 'assets/char/وضعيات الجادل/حزين.jpeg',
        welcome: 'assets/char/وضعيات الجادل/ترحيب.jpeg',
        standing: 'assets/char/وضعيات الجادل/وقوف.jpeg'
      }
    };
    if (poseMap[charName]?.[pose]) return poseMap[charName][pose];
    // Final fallback
    const defaultImg = {
      azzam: 'assets/char/azzam.jpeg',
      jadel: 'assets/char/El jadel.jpeg'
    };
    return defaultImg[charName] || '';
  }

  function getCurrencyHTML(size = 20) {
    if (data.devSettings?.icons?.ui_currency) {
      return `<img src="${data.devSettings.icons.ui_currency}" style="width:${size}px; height:${size}px; vertical-align:middle; display:inline-block; object-fit:contain;">`;
    }
    return '⭐';
  }

  // Firebase Sync Receivers
  function loadGlobalData(globalData) {
    if (!data) load();
    if (!globalData) return;

    // ── Data Version Check ──────────────────────────────────────────────────
    // If Firebase reports a newer dataVersion than what's locally stored,
    // it means content (questions, puzzles, etc.) has been updated externally.
    // Wipe the stale local cache of game-content fields so users always get
    // the latest from Firebase without needing a hard refresh.
    const localVersion = data.dataVersion || 0;
    const remoteVersion = globalData.dataVersion || 0;
    if (remoteVersion > localVersion) {
      // Remote is newer: drop local content cache (player data is kept safe)
      data.quizGeneral = [];
      data.quizEpisodes = {};
      data.puzzles = [];
      data.regions = {};
      data.dataVersion = remoteVersion;
    }


    // All players (including Admin) get the authoritative game content from Firebase.
    // This ensures if questions were added from another device or via script, the admin gets them.
    data.quizGeneral = globalData.quizGeneral || [];
    data.quizEpisodes = globalData.quizEpisodes || {};
    data.puzzles = globalData.puzzles || [];
    data.regions = globalData.regions || {};
    data.competitions = globalData.competitions || [];
    data.storeItems = globalData.storeItems || [];

    // Deep-merge devSettings: Firebase values take priority for quiz/game settings,
    // but keep local characters/audio/icons if Firebase doesn't have them.
    if (globalData.devSettings) {
      const localDev = data.devSettings || {};
      data.devSettings = {
        ...localDev,
        ...globalData.devSettings,
        // Preserve local-only large blobs if Firebase version is empty
        characters: globalData.devSettings.characters || localDev.characters || { azzam: {}, jadel: {} },
        audio: localDev.audio || {},      // audio never comes from Firebase (too large)
        icons: globalData.devSettings.icons || localDev.icons || {},
        avatars: globalData.devSettings.avatars || localDev.avatars || {},
      };
    }
    data.points = globalData.points || data.points;
    // Merge allUsers: take Firebase list, but always preserve the local player
    // so a newly-registered user isn't logged out before appendUserToGlobal syncs.
    const firebaseUsers = globalData.allUsers || [];
    const localPlayer = data.player && data.player.name;
    if (localPlayer && !firebaseUsers.some(u => u.name === localPlayer)) {
      // Keep current player in the list so they are not auto-logged-out
      const localEntry = (data.allUsers || []).find(u => u.name === localPlayer);
      firebaseUsers.push(localEntry || { name: localPlayer });
    }
    data.allUsers = firebaseUsers;

    try {
      const dataToSave = { ...data };
      if (dataToSave.devSettings) {
        dataToSave.devSettings = { ...dataToSave.devSettings };
        delete dataToSave.devSettings.characters;
        delete dataToSave.devSettings.icons;
        delete dataToSave.devSettings.avatars;
        delete dataToSave.devSettings.audio;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch(e) {
      console.warn("Failed to update localStorage during sync (QuotaExceeded?)", e);
    }

    // Refresh UI if needed
    if (window.renderStore && document.getElementById('store-screen')?.classList.contains('active')) {
      window.renderStore();
    }
    if (window.AdminPanel && window.AdminPanel.isLoggedIn) {
      if (window.AdminPanel.refreshStoreAdmin) window.AdminPanel.refreshStoreAdmin();
      if (window.AdminPanel.refreshQuizAdmin) window.AdminPanel.refreshQuizAdmin();
    }

    // Dispatch an event
    window.dispatchEvent(new Event('HawdajDataUpdated'));
  }

  function loadLeaderboardData(lb) {
    if (!data) load();
    if (Array.isArray(lb)) {
      data.leaderboard = lb;
    } else if (lb && typeof lb === 'object') {
      data.leaderboard = Object.values(lb).sort((a, b) => b.score - a.score);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    // Try to update UI if leaderboard is open
    if (window.LeaderboardManager && document.getElementById('leaderboard')?.classList.contains('active')) {
      const activeTab = document.querySelector('#lb-tabs .tab.active');
      window.LeaderboardManager.renderLeaderboard(activeTab ? activeTab.dataset.lb : 'overall');
    }
  }

  function saveGlobalToFirebase() {
    if (window.HawdajFirebase && window.HawdajFirebase.isReady) {
      window.HawdajFirebase.pushGlobalData(data);
    }
  }

  return {
    load, save, get, reset,
    addScore, updateLeaderboard,
    addQuestion, deleteQuestion,
    importQuestions, exportAll, getAvatarHTML, getCurrencyHTML, getCharacterPose,
    loadGlobalData, loadLeaderboardData, saveGlobalToFirebase,
    EPISODE_NAMES, REGIONS_DATA
  };
})();
