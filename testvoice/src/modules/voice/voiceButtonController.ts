// Universal Voice Button Controller
// Enables any button to be clicked/triggered instantly when the user speaks its short name
// Supports full multilingual speech commands across KO, EN, JA, ZH, ES, FR.

export interface VoiceButtonMatch {
  matched: boolean;
  buttonName: string;
  commandType: string;
  payload?: any;
}

let isCheckoutModalOpen = false;
let lastExecutedTime = 0;
let lastCommandType = '';

if (typeof window !== 'undefined') {
  window.addEventListener('kiroween:open_checkout', () => {
    isCheckoutModalOpen = true;
  });
  window.addEventListener('kiroween:close_modal', () => {
    isCheckoutModalOpen = false;
  });
}

export const setCheckoutModalState = (isOpen: boolean) => {
  isCheckoutModalOpen = isOpen;
};

export const executeVoiceButtonCommand = (spokenText: string): VoiceButtonMatch | null => {
  if (!spokenText || !spokenText.trim()) return null;
  const t = spokenText.replace(/\s+/g, '').toLowerCase();
  const now = Date.now();

  const isDebounced = (cmd: string) => {
    if (cmd === lastCommandType && now - lastExecutedTime < 600) {
      return true;
    }
    lastCommandType = cmd;
    lastExecutedTime = now;
    return false;
  };

  // 1. If Checkout Sheet is ALREADY OPEN: Handle In-Modal Buttons First
  if (isCheckoutModalOpen) {
    // A. Quantity Increase
    if (
      // KO
      t === '더하기' || t === '하나더' || t.includes('더하기') || t.includes('하나더') || t === '플러스' || t === '+1' || t === '추가' ||
      // EN
      t === 'add' || t === 'plus' || t === 'more' || t.includes('onemore') || t.includes('increase') ||
      // JA
      t === '増やす' || t === 'ふやす' || t.includes('増やす') || t.includes('プラス') || t.includes('もう一つ') ||
      // ZH
      t === '增加' || t === '加' || t.includes('多一个') || t.includes('加一') ||
      // ES / FR
      t.includes('añadir') || t.includes('ajouter')
    ) {
      if (isDebounced('checkout_increase')) return null;
      dispatch('kiroween:checkout_action', { action: 'increase' });
      return { matched: true, buttonName: '➕ 더하기/Add', commandType: 'checkout_increase' };
    }

    // B. Quantity Decrease
    if (
      // KO
      t === '빼기' || t === '하나빼' || t.includes('빼기') || t.includes('하나빼') || t === '마이너스' || t === '-1' || t === '줄여' ||
      // EN
      t === 'minus' || t === 'less' || t.includes('decrease') || t.includes('oneless') || t.includes('reduce') ||
      // JA
      t === '減らす' || t === 'へらす' || t.includes('減らす') || t.includes('マイナス') ||
      // ZH
      t === '减少' || t === '减' || t.includes('少一个') || t.includes('减一') ||
      // ES / FR
      t.includes('quitar') || t.includes('moins')
    ) {
      if (isDebounced('checkout_decrease')) return null;
      dispatch('kiroween:checkout_action', { action: 'decrease' });
      return { matched: true, buttonName: '➖ 빼기/Minus', commandType: 'checkout_decrease' };
    }

    // C. Confirm Payment
    if (
      // KO (결제, 결제하기, 구매, 구매하라, 구매해, 결제하라, 결제해줘, 살래, 사자 등)
      t.includes('결제') || t.includes('결재') || t.includes('구매') || t.includes('주문') ||
      t.includes('살래') || t.includes('살게') || t.includes('사자') || t.includes('산다') ||
      t.includes('승인') || t.includes('확인') ||
      // EN
      t.includes('pay') || t.includes('buy') || t.includes('confirm') || t.includes('order') ||
      // JA
      t.includes('決済') || t.includes('購入') || t.includes('支払') || t.includes('買う') ||
      // ZH
      t.includes('付款') || t.includes('支付') || t.includes('买单') ||
      // ES / FR
      t.includes('pagar') || t.includes('payer')
    ) {
      if (isDebounced('checkout_pay')) return null;
      dispatch('kiroween:checkout_action', { action: 'pay' });
      return { matched: true, buttonName: '🚀 결제/Pay', commandType: 'checkout_pay' };
    }

    // D. Cancel / Close Checkout
    if (
      // KO
      t === '취소' || t === '취소하기' || t === '닫기' || t.includes('취소') || t.includes('닫기') || t.includes('그만') || t.includes('안살래') ||
      // EN
      t === 'cancel' || t === 'close' || t === 'exit' || t === 'stop' ||
      // JA
      t === 'キャンセル' || t === '閉じる' || t.includes('キャンセル') ||
      // ZH
      t === '取消' || t === '关闭' || t.includes('取消') ||
      // ES / FR
      t === 'cancelar' || t === 'annuler'
    ) {
      if (isDebounced('checkout_cancel')) return null;
      isCheckoutModalOpen = false;
      dispatch('kiroween:checkout_action', { action: 'cancel' });
      dispatch('kiroween:close_modal', {});
      return { matched: true, buttonName: '✕ 취소/Cancel', commandType: 'checkout_cancel' };
    }
  }

  // 2. Open Checkout Sheet (Works when modal is closed, or user explicitly asks for checkout)
  if (
    // KO (결제, 구매, 주문, 살래, 구매하라, 결제해 등 모든 구매 의도)
    t.includes('결제') || t.includes('결재') || t.includes('구매') || t.includes('주문') ||
    t.includes('살래') || t.includes('살게요') || t.includes('살게') ||
    t.includes('사고싶') || t.includes('사겠') || t.includes('사자') || t.includes('산다') ||
    // EN
    t.includes('checkout') || t.includes('buy') || t.includes('order') || t.includes('pay') ||
    // JA
    t.includes('決済') || t.includes('購入') || t.includes('買') || t.includes('注文') ||
    // ZH
    t.includes('结账') || t.includes('结算') || t.includes('买') || t.includes('下单') ||
    // ES
    t.includes('pagar') || t.includes('comprar') || t.includes('abrirpago') ||
    // FR
    t.includes('paiement') || t.includes('acheter') || t.includes('commander')
  ) {
    if (isDebounced('open_checkout')) return null;
    isCheckoutModalOpen = true;
    dispatch('kiroween:open_checkout', {});
    return { matched: true, buttonName: '⚡ 결제창/Checkout', commandType: 'open_checkout' };
  }

  // 3. View Switcher Buttons ("방송/Live", "음성랩/Voice Lab")
  if (
    t === '방송' || t === '라이브' || t === '메인' || t.includes('방송복귀') || t.includes('라이브방송') ||
    t === 'live' || t === 'stream' || t === '配信' || t === '直播' || t === 'envivo'
  ) {
    if (isDebounced('switch_view_main')) return null;
    dispatch('kiroween:switch_view', { view: 'main' });
    return { matched: true, buttonName: '📺 방송/Live', commandType: 'switch_view_main' };
  }

  if (
    t === '음성랩' || t === '보이스랩' || t === '랩' || t.includes('음성랩') || t.includes('보이스랩') ||
    t === 'voicelab' || t === 'lab' || t === '音声ラボ' || t === '语音实验室' || t === 'labdevoz'
  ) {
    if (isDebounced('switch_view_voicelab')) return null;
    dispatch('kiroween:switch_view', { view: 'voicelab' });
    return { matched: true, buttonName: '🎙️ 음성랩/Voice Lab', commandType: 'switch_view_voicelab' };
  }

  // 4. Admin Studio Button ("관리자/Admin")
  if (
    t === '관리자' || t === '어드민' || t.includes('관리자') || t.includes('어드민') ||
    t === 'admin' || t === '管理者' || t === '管理后台'
  ) {
    if (isDebounced('open_admin')) return null;
    dispatch('kiroween:open_admin', {});
    return { matched: true, buttonName: '⚙️ 관리자/Admin', commandType: 'open_admin' };
  }

  // 5. Product Switcher Buttons ("벌꿀/Honey", "전통차/Tea")
  if (
    t === '벌꿀' || t === '꿀' || t.includes('벌꿀') || t.includes('아카시아') ||
    t === 'honey' || t.includes('honey') || t.includes('蜂蜜') || t.includes('洋槐') || t.includes('miel')
  ) {
    if (isDebounced('select_product_honey')) return null;
    dispatch('kiroween:select_product', { productId: 'prod-honey' });
    return { matched: true, buttonName: '🍯 벌꿀/Honey', commandType: 'select_product_honey' };
  }

  if (
    t === '전통차' || t === '차' || t.includes('전통차') || t.includes('차세트') ||
    t === 'tea' || t.includes('tea') || t.includes('お茶') || t.includes('茶') || t.includes('thé')
  ) {
    if (isDebounced('select_product_tea')) return null;
    dispatch('kiroween:select_product', { productId: 'prod-tea' });
    return { matched: true, buttonName: '🍵 전통차/Tea', commandType: 'select_product_tea' };
  }

  // 6. Action Utility Buttons ("지우기", "도구", "오디오", "키설정")
  if (t === '지우기' || t === '삭제' || t.includes('로그지우기') || t.includes('대화지우기') || t === 'clear') {
    if (isDebounced('clear_logs')) return null;
    dispatch('kiroween:clear_logs', {});
    return { matched: true, buttonName: '지우기/Clear', commandType: 'clear_logs' };
  }

  if (t === '도구' || t === '도구실행' || t.includes('도구실행') || t.includes('도구수동') || t === 'tool') {
    if (isDebounced('trigger_tool')) return null;
    dispatch('kiroween:trigger_tool', {});
    return { matched: true, buttonName: '도구/Tool', commandType: 'trigger_tool' };
  }

  if (t === '오디오' || t === '마이크' || t === '보청기' || t.includes('오디오설정') || t === 'audio') {
    if (isDebounced('open_audio_modal')) return null;
    dispatch('kiroween:open_audio_modal', {});
    return { matched: true, buttonName: '오디오/Audio', commandType: 'open_audio_modal' };
  }

  if (t === '키' || t === '키설정' || t === 'api키' || t.includes('키설정') || t === 'key' || t === 'apikey') {
    if (isDebounced('open_key_modal')) return null;
    dispatch('kiroween:open_key_modal', {});
    return { matched: true, buttonName: '키설정/Key', commandType: 'open_key_modal' };
  }

  // 7. 20 Specialized Domain Query Buttons
  const domainShortMap: Array<{ key: string; name: string; domain: string }> = [
    { key: '과학', name: '과학', domain: 'science' },
    { key: '수학', name: '수학', domain: 'math' },
    { key: '천문', name: '천문', domain: 'astronomy' },
    { key: '운세', name: '운세', domain: 'fortune' },
    { key: '철학', name: '철학', domain: 'philosophy' },
    { key: '심리', name: '심리', domain: 'psychology' },
    { key: '자연', name: '자연', domain: 'nature' },
    { key: '의학', name: '의학', domain: 'medicine' },
    { key: '물리', name: '물리', domain: 'physics' },
    { key: '문학', name: '문학', domain: 'literature' },
    { key: '역사', name: '역사', domain: 'history' },
    { key: '패션', name: '패션', domain: 'fashion' },
    { key: '악세서리', name: '악세서리', domain: 'accessories' },
    { key: '법률', name: '법률', domain: 'legal' },
    { key: '금융', name: '금융', domain: 'finance' },
    { key: 'it', name: 'IT', domain: 'tech' },
    { key: '요리', name: '요리', domain: 'culinary' },
    { key: '반려동물', name: '반려동물', domain: 'pets' },
    { key: '여행', name: '여행', domain: 'travel' },
    { key: '환경', name: '환경', domain: 'environment' }
  ];

  for (const item of domainShortMap) {
    if (t === item.key || t.includes(item.key)) {
      if (isDebounced(`domain_${item.domain}`)) return null;
      dispatch('kiroween:select_domain_prompt', { domain: item.domain, name: item.name });
      return { matched: true, buttonName: item.name, commandType: `select_domain_${item.domain}`, payload: item.domain };
    }
  }

  return null;
};

const dispatch = (eventName: string, detail: any) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
    window.dispatchEvent(new CustomEvent('kiroween:voice_button_toast', { detail: { eventName, detail } }));
  }
};
