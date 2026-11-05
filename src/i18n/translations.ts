import { Language } from '../types';

export interface UIStrings {
  // Header
  appTitle: string;
  appSubtitle: string;
  liveTab: string;
  voiceLabTab: string;
  adminBtn: string;
  honeyShort: string;
  teaShort: string;
  liveTabTip: string;
  voiceLabTabTip: string;
  adminBtnTip: string;
  honeyTip: string;
  teaTip: string;

  // Stream Player
  featuredBadge: string;
  checkoutBtn: string;
  checkoutBtnTip: string;
  livePlaying: string;
  livePaused: string;

  // Checkout Sheet Modal
  checkoutTitle: string;
  checkoutSubtitle: string;
  checkoutVoiceTip: string;
  inStock: string;
  unitPrice: string;
  quantitySelect: string;
  voiceControllable: string;
  decreaseBtn: string;
  increaseBtn: string;
  cancelBtn: string;
  payBtn: string;
  paymentMethodTitle: string;
  paypalWallet: string;
  paypalCard: string;
  totalAmount: string;
  processingPayment: string;
  unitCount: string;

  // Chat / Agent
  agentTitle: string;
  agentStatusSpeaking: string;
  agentStatusListening: string;
  agentStatusConnected: string;
  agentStatusIdle: string;
  chatPlaceholder: string;
  sendBtn: string;
  welcomeMessage: string;
  checkoutOpenedMsg: string;
  startVoiceBtn: string;
  stopVoiceBtn: string;
  audioSettingsBtn: string;
  apiKeyBtn: string;
  clearChatBtn: string;

  // Voice Toast
  voiceToastPrefix: string;
}

export const TRANSLATIONS: Record<Language, UIStrings> = {
  ko: {
    appTitle: 'Kiroween 에이전틱 라이브 스트림',
    appSubtitle: '규격 기반 멀티모달 자율 실행 아키텍처',
    liveTab: '방송',
    voiceLabTab: '음성랩',
    adminBtn: '관리자',
    honeyShort: '벌꿀',
    teaShort: '전통차',
    liveTabTip: '음성으로 "방송"이라고 말해도 전환됩니다',
    voiceLabTabTip: '음성으로 "음성랩"이라고 말해도 전환됩니다',
    adminBtnTip: '음성으로 "관리자"라고 말해도 열립니다',
    honeyTip: '음성으로 "벌꿀"이라고 말해도 선택됩니다',
    teaTip: '음성으로 "전통차"라고 말해도 선택됩니다',

    featuredBadge: '등록 상품',
    checkoutBtn: '결제창',
    checkoutBtnTip: '음성으로 "결제창"이라고 말해도 바로 열립니다',
    livePlaying: '생방송 재생 중',
    livePaused: '일시 정지됨',

    checkoutTitle: '실시간 음성 결제창',
    checkoutSubtitle: 'PayPal Instant Checkout',
    checkoutVoiceTip: '💡 버튼 이름을 음성으로 말씀하셔도 작동합니다! ("하나 더", "하나 빼", "결제하기", "취소")',
    inStock: '재고',
    unitPrice: '단가',
    quantitySelect: '구매 수량 선택',
    voiceControllable: '음성 제어 가능',
    decreaseBtn: '빼기',
    increaseBtn: '더하기',
    cancelBtn: '취소',
    payBtn: '결제',
    paymentMethodTitle: '결제 수단',
    paypalWallet: 'PayPal 간편결제',
    paypalCard: '신용/체크카드',
    totalAmount: '총 결제 금액',
    processingPayment: '결제 처리 중...',
    unitCount: '개',

    agentTitle: 'Kiroween AI 쇼호스트',
    agentStatusSpeaking: '🗣️ AI 발화 중 (끼어들기 가능)',
    agentStatusListening: '👂 실시간 음성 경청 중 (말씀하세요)',
    agentStatusConnected: '🟢 실시간 음성 통화 대기 중',
    agentStatusIdle: '● 실시간 음성 커머스 엔진 대기 중',
    chatPlaceholder: '질문이나 음성 명령을 입력하세요...',
    sendBtn: '전송',
    welcomeMessage: '안녕하세요! 라이브 쇼호스트 AI입니다. 현재 방송 화면 밑에 등록된 상품을 실시간 안내해 드립니다. "결제창", "더하기", "빼기", "결제", "취소" 등을 음성으로 말씀해보세요!',
    checkoutOpenedMsg: '현재 방송 상품의 결제창을 화면 앞에 띄워드렸습니다!',
    startVoiceBtn: '음성 대화 시작 (Start Voice)',
    stopVoiceBtn: '통화 종료 (Stop)',
    audioSettingsBtn: '오디오',
    apiKeyBtn: '키설정',
    clearChatBtn: '대화 지우기',

    voiceToastPrefix: '🗣️ 음성 버튼 작동: '
  },

  en: {
    appTitle: 'Kiroween Agentic Live Stream',
    appSubtitle: 'Spec-driven Multimodal Execution Architecture',
    liveTab: 'Live',
    voiceLabTab: 'Voice Lab',
    adminBtn: 'Admin',
    honeyShort: 'Honey',
    teaShort: 'Tea Set',
    liveTabTip: 'Say "Live" to switch view',
    voiceLabTabTip: 'Say "Voice Lab" to switch view',
    adminBtnTip: 'Say "Admin" to open settings',
    honeyTip: 'Say "Honey" to select product',
    teaTip: 'Say "Tea" to select product',

    featuredBadge: 'Featured Product',
    checkoutBtn: 'Checkout',
    checkoutBtnTip: 'Say "Checkout" to open payment sheet',
    livePlaying: 'Live Stream Playing',
    livePaused: 'Paused',

    checkoutTitle: 'Real-time Voice Checkout',
    checkoutSubtitle: 'PayPal Instant Checkout',
    checkoutVoiceTip: '💡 Speak button names to trigger: ("Add", "Minus", "Pay", "Cancel")',
    inStock: 'In Stock',
    unitPrice: 'Unit Price',
    quantitySelect: 'Select Quantity',
    voiceControllable: 'Voice Enabled',
    decreaseBtn: 'Minus',
    increaseBtn: 'Add',
    cancelBtn: 'Cancel',
    payBtn: 'Pay Now',
    paymentMethodTitle: 'Payment Method',
    paypalWallet: 'PayPal Balance',
    paypalCard: 'Credit/Debit Card',
    totalAmount: 'Total Amount',
    processingPayment: 'Processing Payment...',
    unitCount: 'pcs',

    agentTitle: 'Kiroween AI Co-Host',
    agentStatusSpeaking: '🗣️ AI Speaking (Interruptible)',
    agentStatusListening: '👂 Listening to your voice...',
    agentStatusConnected: '🟢 Voice Call Active',
    agentStatusIdle: '● Voice Commerce Engine Ready',
    chatPlaceholder: 'Type a question or voice command...',
    sendBtn: 'Send',
    welcomeMessage: 'Hello! I am your AI Live Shopping Co-Host. The featured product is registered below the video. Say "Checkout", "Add", "Minus", "Pay", or "Cancel" anytime!',
    checkoutOpenedMsg: 'I have opened the checkout sheet for you on the screen!',
    startVoiceBtn: 'Start Voice Call',
    stopVoiceBtn: 'Stop Call',
    audioSettingsBtn: 'Audio',
    apiKeyBtn: 'API Key',
    clearChatBtn: 'Clear Chat',

    voiceToastPrefix: '🗣️ Voice Command Executed: '
  },

  ja: {
    appTitle: 'Kiroween エージェンティック ライブ配信',
    appSubtitle: '仕様駆動型マルチモーダル自律実行アーキテクチャ',
    liveTab: '配信',
    voiceLabTab: '音声ラボ',
    adminBtn: '管理者',
    honeyShort: '蜂蜜',
    teaShort: '伝統茶',
    liveTabTip: '音声で「配信」と言っても切り替わります',
    voiceLabTabTip: '音声で「音声ラボ」と言っても切り替わります',
    adminBtnTip: '音声で「管理者」と言っても開きます',
    honeyTip: '音声で「蜂蜜」と言っても選択されます',
    teaTip: '音声で「伝統茶」と言っても選択されます',

    featuredBadge: '登録商品',
    checkoutBtn: '決済画面',
    checkoutBtnTip: '音声で「決済画面」と言っても開きます',
    livePlaying: 'ライブ配信中',
    livePaused: '一時停止中',

    checkoutTitle: 'リアルタイム音声決済画面',
    checkoutSubtitle: 'PayPal Instant Checkout',
    checkoutVoiceTip: '💡 ボタン名を音声で発声しても操作できます！（「増やす」「減らす」「決済」「キャンセル」）',
    inStock: '在庫',
    unitPrice: '単価',
    quantitySelect: '購入数量を選択',
    voiceControllable: '音声操作対応',
    decreaseBtn: '減らす',
    increaseBtn: '増やす',
    cancelBtn: 'キャンセル',
    payBtn: '決済する',
    paymentMethodTitle: 'お支払い方法',
    paypalWallet: 'PayPal ウォレット',
    paypalCard: 'クレジットカード',
    totalAmount: 'お支払い総額',
    processingPayment: '決済処理中...',
    unitCount: '個',

    agentTitle: 'Kiroween AI 共同MC',
    agentStatusSpeaking: '🗣️ AI 発話中（割り込み可能）',
    agentStatusListening: '👂 音声を聞き取り中...',
    agentStatusConnected: '🟢 音声通話接続中',
    agentStatusIdle: '● 音声コマースエンジン待機中',
    chatPlaceholder: '質問や音声コマンドを入力...',
    sendBtn: '送信',
    welcomeMessage: 'こんにちは！ライブショッピングAI共同MCです。動画の下に登録された商品をリアルタイムでご案内します。「決済画面」「増やす」「減らす」「決済」「キャンセル」と声に出してみてください！',
    checkoutOpenedMsg: '登録商品の決済画面を画面に表示しました！',
    startVoiceBtn: '音声通話開始 (Start Voice)',
    stopVoiceBtn: '通話終了 (Stop)',
    audioSettingsBtn: 'オーディオ',
    apiKeyBtn: 'APIキー',
    clearChatBtn: '履歴クリア',

    voiceToastPrefix: '🗣️ 音声コマンド作動: '
  },

  zh: {
    appTitle: 'Kiroween 智能体直播间',
    appSubtitle: '规范驱动的多模态自主执行架构',
    liveTab: '直播',
    voiceLabTab: '语音实验室',
    adminBtn: '管理后台',
    honeyShort: '洋槐蜜',
    teaShort: '传统茶',
    liveTabTip: '语音说“直播”也可切换',
    voiceLabTabTip: '语音说“语音实验室”也可切换',
    adminBtnTip: '语音说“管理后台”即可打开',
    honeyTip: '语音说“洋槐蜜”即可选择',
    teaTip: '语音说“传统茶”即可选择',

    featuredBadge: '正在销售',
    checkoutBtn: '结账',
    checkoutBtnTip: '语音说“结账”即可直接打开',
    livePlaying: '正在直播',
    livePaused: '已暂停',

    checkoutTitle: '实时语音结算窗口',
    checkoutSubtitle: 'PayPal Instant Checkout',
    checkoutVoiceTip: '💡 只要语音说出按钮名称即可执行！（“增加”、“减少”、“付款”、“取消”）',
    inStock: '库存',
    unitPrice: '单价',
    quantitySelect: '选择购买数量',
    voiceControllable: '支持语音控制',
    decreaseBtn: '减少',
    increaseBtn: '增加',
    cancelBtn: '取消',
    payBtn: '立即付款',
    paymentMethodTitle: '支付方式',
    paypalWallet: 'PayPal 快捷支付',
    paypalCard: '信用卡/借记卡',
    totalAmount: '合计付款金额',
    processingPayment: '正在处理付款...',
    unitCount: '件',

    agentTitle: 'Kiroween AI 助播',
    agentStatusSpeaking: '🗣️ AI 正在发声（可随时打断）',
    agentStatusListening: '👂 正在倾听您的语音...',
    agentStatusConnected: '🟢 语音通话中',
    agentStatusIdle: '● 实时语音电商引擎就绪',
    chatPlaceholder: '输入问题或语音指令...',
    sendBtn: '发送',
    welcomeMessage: '您好！我是您的直播带货AI助播。视频正下方已登记当前热卖商品。您可以随时语音说出“结账”、“增加”、“减少”、“付款”或“取消”！',
    checkoutOpenedMsg: '已为您在屏幕上打开该商品的结账页面！',
    startVoiceBtn: '开始语音通话 (Start Voice)',
    stopVoiceBtn: '结束通话 (Stop)',
    audioSettingsBtn: '音频设置',
    apiKeyBtn: 'API密钥',
    clearChatBtn: '清空记录',

    voiceToastPrefix: '🗣️ 语音指令触发: '
  },

  es: {
    appTitle: 'Kiroween Transmisión en Vivo Agéntica',
    appSubtitle: 'Arquitectura Multimodal Ejecutable',
    liveTab: 'En Vivo',
    voiceLabTab: 'Lab de Voz',
    adminBtn: 'Admin',
    honeyShort: 'Miel',
    teaShort: 'Té',
    liveTabTip: 'Di "En Vivo" para cambiar vista',
    voiceLabTabTip: 'Di "Lab de Voz" para cambiar vista',
    adminBtnTip: 'Di "Admin" para abrir ajustes',
    honeyTip: 'Di "Miel" para seleccionar',
    teaTip: 'Di "Té" para seleccionar',

    featuredBadge: 'Producto Destacado',
    checkoutBtn: 'Pagar',
    checkoutBtnTip: 'Di "Pagar" para abrir la ventana de pago',
    livePlaying: 'Reproduciendo En Vivo',
    livePaused: 'Pausado',

    checkoutTitle: 'Pago por Voz en Tiempo Real',
    checkoutSubtitle: 'PayPal Instant Checkout',
    checkoutVoiceTip: '💡 ¡Pronuncia el nombre del botón: ("Añadir", "Quitar", "Pagar", "Cancelar")!',
    inStock: 'Stock',
    unitPrice: 'Precio Unitario',
    quantitySelect: 'Seleccionar Cantidad',
    voiceControllable: 'Control por Voz',
    decreaseBtn: 'Quitar',
    increaseBtn: 'Añadir',
    cancelBtn: 'Cancelar',
    payBtn: 'Pagar Ahora',
    paymentMethodTitle: 'Método de Pago',
    paypalWallet: 'Monedero PayPal',
    paypalCard: 'Tarjeta Débito/Crédito',
    totalAmount: 'Importe Total',
    processingPayment: 'Procesando Pago...',
    unitCount: 'uds',

    agentTitle: 'Kiroween Co-Presentador IA',
    agentStatusSpeaking: '🗣️ IA Hablando (Interrumpible)',
    agentStatusListening: '👂 Escuchando tu voz...',
    agentStatusConnected: '🟢 Llamada Activa',
    agentStatusIdle: '● Motor de Voz Listo',
    chatPlaceholder: 'Escribe tu pregunta o comando...',
    sendBtn: 'Enviar',
    welcomeMessage: '¡Hola! Soy tu co-presentador de compras con IA. El producto está registrado bajo el video. ¡Di "Pagar", "Añadir", "Quitar" o "Cancelar" en cualquier momento!',
    checkoutOpenedMsg: '¡He abierto la ventana de pago para ti!',
    startVoiceBtn: 'Iniciar Voz (Start Voice)',
    stopVoiceBtn: 'Detener Llamada (Stop)',
    audioSettingsBtn: 'Audio',
    apiKeyBtn: 'Clave API',
    clearChatBtn: 'Borrar Chat',

    voiceToastPrefix: '🗣️ Comando de Voz Ejecutado: '
  },

  fr: {
    appTitle: 'Kiroween Diffusion en Direct Agentique',
    appSubtitle: 'Architecture Multimodale d\'Exécution Autonome',
    liveTab: 'En Direct',
    voiceLabTab: 'Lab Vocal',
    adminBtn: 'Admin',
    honeyShort: 'Miel',
    teaShort: 'Thé',
    liveTabTip: 'Dites "En Direct" pour changer de vue',
    voiceLabTabTip: 'Dites "Lab Vocal" pour changer de vue',
    adminBtnTip: 'Dites "Admin" pour ouvrir',
    honeyTip: 'Dites "Miel" pour sélectionner',
    teaTip: 'Dites "Thé" pour sélectionner',

    featuredBadge: 'Produit Vedette',
    checkoutBtn: 'Paiement',
    checkoutBtnTip: 'Dites "Paiement" pour ouvrir la commande',
    livePlaying: 'Lecture en Direct',
    livePaused: 'En Pause',

    checkoutTitle: 'Paiement Vocal en Direct',
    checkoutSubtitle: 'PayPal Instant Checkout',
    checkoutVoiceTip: '💡 Prononcez les boutons: ("Ajouter", "Moins", "Payer", "Annuler")!',
    inStock: 'En Stock',
    unitPrice: 'Prix Unitaire',
    quantitySelect: 'Choisir la Quantité',
    voiceControllable: 'Contrôlable par la Voix',
    decreaseBtn: 'Moins',
    increaseBtn: 'Ajouter',
    cancelBtn: 'Annuler',
    payBtn: 'Payer',
    paymentMethodTitle: 'Moyen de Paiement',
    paypalWallet: 'Portefeuille PayPal',
    paypalCard: 'Carte Bancaire',
    totalAmount: 'Montant Total',
    processingPayment: 'Traitement du paiement...',
    unitCount: 'pcs',

    agentTitle: 'Kiroween Co-Animateur IA',
    agentStatusSpeaking: '🗣️ L\'IA parle (Interrompable)',
    agentStatusListening: '👂 À l\'écoute de votre voix...',
    agentStatusConnected: '🟢 Appel Vocal Connecté',
    agentStatusIdle: '● Moteur Vocal Prêt',
    chatPlaceholder: 'Tapez votre question ou commande...',
    sendBtn: 'Envoyer',
    welcomeMessage: 'Bonjour ! Je suis votre co-animateur IA pour cette vente en direct. Le produit est affiché sous la vidéo. Dites "Paiement", "Ajouter", "Moins", "Payer" ou "Annuler" à tout moment !',
    checkoutOpenedMsg: 'J\'ai ouvert la fenêtre de commande pour vous !',
    startVoiceBtn: 'Démarrer la Voix (Start Voice)',
    stopVoiceBtn: 'Arrêter l\'appel (Stop)',
    audioSettingsBtn: 'Audio',
    apiKeyBtn: 'Clé API',
    clearChatBtn: 'Effacer Chat',

    voiceToastPrefix: '🗣️ Commande Vocale Exécutée: '
  }
};

export const getUIStrings = (lang: Language): UIStrings => {
  return TRANSLATIONS[lang] || TRANSLATIONS.ko;
};
