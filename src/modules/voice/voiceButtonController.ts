// Universal Voice Button Controller
// Enables any button to be clicked/triggered instantly when the user speaks its short name.

export interface VoiceButtonMatch {
  matched: boolean;
  buttonName: string;
  commandType: string;
  payload?: any;
}

export const executeVoiceButtonCommand = (spokenText: string): VoiceButtonMatch | null => {
  if (!spokenText || !spokenText.trim()) return null;
  const t = spokenText.replace(/\s+/g, '').toLowerCase();

  // 1. In-Checkout Sheet Action Buttons (최우선 처리)
  if (t === '더하기' || t === '하나더' || t.includes('더하기') || t.includes('하나더') || t === '플러스' || t === '+1') {
    dispatch('kiroween:checkout_action', { action: 'increase' });
    return { matched: true, buttonName: '더하기', commandType: 'checkout_increase' };
  }

  if (t === '빼기' || t === '하나빼' || t.includes('빼기') || t.includes('하나빼') || t === '마이너스' || t === '-1') {
    dispatch('kiroween:checkout_action', { action: 'decrease' });
    return { matched: true, buttonName: '빼기', commandType: 'checkout_decrease' };
  }

  if (t === '결제' || t === '결제하기' || t === '구매' || t === '구매하기' || t.includes('결제하기') || t.includes('구매하기')) {
    dispatch('kiroween:checkout_action', { action: 'pay' });
    return { matched: true, buttonName: '결제', commandType: 'checkout_pay' };
  }

  if (t === '취소' || t === '취소하기' || t === '닫기' || t.includes('취소') || t.includes('닫기')) {
    dispatch('kiroween:checkout_action', { action: 'cancel' });
    dispatch('kiroween:close_modal', {});
    return { matched: true, buttonName: '취소', commandType: 'checkout_cancel' };
  }

  // 2. Open Checkout Sheet Button ("결제창", "구매창")
  if (t === '결제창' || t === '구매창' || t.includes('결제창') || t.includes('구매창')) {
    dispatch('kiroween:open_checkout', {});
    return { matched: true, buttonName: '결제창', commandType: 'open_checkout' };
  }

  // 3. View Switcher Buttons ("방송", "음성랩")
  if (t === '방송' || t === '라이브' || t === '메인' || t.includes('방송복귀') || t.includes('라이브방송')) {
    dispatch('kiroween:switch_view', { view: 'main' });
    return { matched: true, buttonName: '방송', commandType: 'switch_view_main' };
  }

  if (t === '음성랩' || t === '보이스랩' || t === '랩' || t.includes('음성랩') || t.includes('보이스랩')) {
    dispatch('kiroween:switch_view', { view: 'voicelab' });
    return { matched: true, buttonName: '음성랩', commandType: 'switch_view_voicelab' };
  }

  // 4. Admin Studio Button ("관리자", "어드민")
  if (t === '관리자' || t === '어드민' || t.includes('관리자') || t.includes('어드민')) {
    dispatch('kiroween:open_admin', {});
    return { matched: true, buttonName: '관리자', commandType: 'open_admin' };
  }

  // 5. Product Switcher Buttons ("벌꿀", "전통차")
  if (t === '벌꿀' || t === '꿀' || t.includes('벌꿀') || t.includes('아카시아')) {
    dispatch('kiroween:select_product', { productId: 'prod-honey' });
    return { matched: true, buttonName: '벌꿀', commandType: 'select_product_honey' };
  }

  if (t === '전통차' || t === '차' || t.includes('전통차') || t.includes('차세트')) {
    dispatch('kiroween:select_product', { productId: 'prod-tea' });
    return { matched: true, buttonName: '전통차', commandType: 'select_product_tea' };
  }

  // 6. Action Utility Buttons ("지우기", "도구", "오디오", "키설정")
  if (t === '지우기' || t === '삭제' || t.includes('로그지우기') || t.includes('대화지우기')) {
    dispatch('kiroween:clear_logs', {});
    return { matched: true, buttonName: '지우기', commandType: 'clear_logs' };
  }

  if (t === '도구' || t === '도구실행' || t.includes('도구실행') || t.includes('도구수동')) {
    dispatch('kiroween:trigger_tool', {});
    return { matched: true, buttonName: '도구', commandType: 'trigger_tool' };
  }

  if (t === '오디오' || t === '마이크' || t === '보청기' || t.includes('오디오설정') || t.includes('마이크설정')) {
    dispatch('kiroween:open_audio_modal', {});
    return { matched: true, buttonName: '오디오', commandType: 'open_audio_modal' };
  }

  if (t === '키' || t === '키설정' || t === 'api키' || t.includes('키설정')) {
    dispatch('kiroween:open_key_modal', {});
    return { matched: true, buttonName: '키설정', commandType: 'open_key_modal' };
  }

  // 7. 20 Specialized Domain Query Buttons (단어 하나로 즉시 질문 실행!)
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
      dispatch('kiroween:select_domain_prompt', { domain: item.domain, name: item.name });
      return { matched: true, buttonName: item.name, commandType: `select_domain_${item.domain}`, payload: item.domain };
    }
  }

  return null;
};

const dispatch = (eventName: string, detail: any) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
    // Also broadcast a visual toast notification event
    window.dispatchEvent(new CustomEvent('kiroween:voice_button_toast', { detail: { eventName, detail } }));
  }
};
