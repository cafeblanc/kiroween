import React, { useState, useEffect } from 'react';
import { ProductItem, Language } from '../../types';

interface LiveComment {
  id: string;
  user: string;
  avatar: string;
  badge?: string;
  text: Record<Language, string>;
  isPurchase?: boolean;
}

const SAMPLE_COMMENTS: LiveComment[] = [
  {
    id: 'c1',
    user: 'yuna_kr',
    avatar: '👩🏻',
    text: {
      en: 'Wow, the honey color looks so natural and thick! 🍯',
      ko: '와 벌꿀 색깔 진짜 진하고 자연 그대로네요! 🍯',
      ja: '蜂蜜の色がとても濃厚で自然ですね！🍯',
      zh: '哇，这蜂蜜颜色看起来非常纯正浓郁！🍯',
      es: '¡Guau, el color de la miel se ve tan natural y espeso! 🍯',
      fr: 'Le miel a une couleur tellement naturelle et dorée ! 🍯'
    }
  },
  {
    id: 'c2',
    user: 'sarah_ca',
    avatar: '👱🏼‍♀️',
    badge: 'VIP Buyer',
    text: {
      en: 'Just ordered 2 bottles with PayPal! Super fast checkout ⚡',
      ko: '페이팔로 방금 2병 주문 완료! 결제 진짜 빠르네요 ⚡',
      ja: 'PayPalで2本注文しました！決済がすごく早いです⚡',
      zh: '刚刚用PayPal订购了2瓶！极速结账⚡',
      es: '¡Acabo de pedir 2 botellas con PayPal! Compra súper rápida ⚡',
      fr: 'Je viens de commander 2 bouteilles avec PayPal ! Ultra rapide ⚡'
    },
    isPurchase: true
  },
  {
    id: 'c3',
    user: 'kenji_tokyo',
    avatar: '👨🏻‍💻',
    text: {
      en: 'Grandpa looks so healthy and trustworthy! 😊',
      ko: '할아버지 인상이 너무 좋으시고 신뢰가 가네요 😊',
      ja: 'おじいさんとても健康的で信頼できますね！😊',
      zh: '老爷爷看起来好健康慈祥，很有信任感！😊',
      es: '¡El abuelo se ve tan amable y confiable! 😊',
      fr: 'Le grand-père a l’air tellement chaleureux et digne de confiance ! 😊'
    }
  },
  {
    id: 'c4',
    user: 'alex_ny',
    avatar: '🧔🏼',
    text: {
      en: 'Is this harvested in 2026? Fresh harvest?',
      ko: '올해 갓 채밀한 신선한 햇꿀 맞나요?',
      ja: '今年採取された新鮮なハチミツですか？',
      zh: '这是今年新鲜采收的头茬蜂蜜吗？',
      es: '¿Esta miel es de cosecha reciente y fresca?',
      fr: 'Est-ce une récolte fraîche de cette saison ?'
    }
  },
  {
    id: 'c5',
    user: 'minji_seoul',
    avatar: '👧🏻',
    badge: 'Fan',
    text: {
      en: 'The traditional tea set is also gorgeous as a gift set! 🍵',
      ko: '전통차 선물세트도 포장이 정말 고급스럽네요 🍵',
      ja: '伝統茶ギフトセットもパッケージがとても上品です🍵',
      zh: '传统茶礼盒的包装看起来非常高档精致！🍵',
      es: '¡El set de té tradicional también es precioso como regalo! 🍵',
      fr: 'Le coffret de thé traditionnel est magnifique pour un cadeau ! 🍵'
    }
  },
  {
    id: 'c6',
    user: 'david_london',
    avatar: '👨🏼‍🦰',
    text: {
      en: 'Does PayPal express handle international shipping?',
      ko: '페이팔 익스프레스로 해외 배송도 바로 처리되나요?',
      ja: 'PayPalエクスプレスで海外発送も対応していますか？',
      zh: 'PayPal快捷结账支持国际直邮吗？',
      es: '¿PayPal express gestiona el envío internacional?',
      fr: 'PayPal Express gère-t-il la livraison internationale ?'
    }
  },
  {
    id: 'c7',
    user: 'chloe_sf',
    avatar: '👩🏼',
    badge: 'Buyer',
    text: {
      en: 'Bought the honey! Love the AI in-stream voice checkout!',
      ko: '꿀 구매완료! 음성으로 바로 결제창 뜨는거 대박이네요!',
      ja: '蜂蜜を購入しました！AI音声決済が素晴らしいです！',
      zh: '已下单蜂蜜！AI语音直接调出支付太酷了！',
      es: '¡Compré la miel! ¡Me encanta el pago por voz de la IA!',
      fr: 'Miel acheté ! J’adore le paiement vocal en direct par l’IA !'
    },
    isPurchase: true
  }
];

interface LiveViewerOverlayProps {
  product: ProductItem | null;
  lang: Language;
}

export const LiveViewerOverlay: React.FC<LiveViewerOverlayProps> = ({ lang }) => {
  const [comments, setComments] = useState<LiveComment[]>(SAMPLE_COMMENTS.slice(0, 2));
  const [viewerCount, setViewerCount] = useState(1482);
  const [hearts, setHearts] = useState<Array<{ id: number; left: number; emoji: string }>>([]);
  const [isOverlayVisible, setIsOverlayVisible] = useState(true);

  // Periodic incoming comment stream (every 3.5s, keep at most 3 comments)
  useEffect(() => {
    let commentIndex = 3;
    const interval = setInterval(() => {
      const nextComment = SAMPLE_COMMENTS[commentIndex % SAMPLE_COMMENTS.length];
      const uniqueComment = { ...nextComment, id: Date.now().toString() };
      // Keep maximum 3 comments so it never covers the video
      setComments(prev => [...prev.slice(-2), uniqueComment]);
      commentIndex++;

      // Jitter viewer count realistically
      setViewerCount(prev => prev + Math.floor(Math.random() * 5) - 2);
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  // Periodic floating reaction hearts
  useEffect(() => {
    const emojis = ['❤️', '🍯', '🔥', '✨', '👏', '💛'];
    const heartInterval = setInterval(() => {
      const newHeart = {
        id: Date.now() + Math.random(),
        left: 65 + Math.random() * 25, // percentage
        emoji: emojis[Math.floor(Math.random() * emojis.length)]
      };
      setHearts(prev => [...prev.slice(-8), newHeart]);

      setTimeout(() => {
        setHearts(prev => prev.filter(h => h.id !== newHeart.id));
      }, 2000);
    }, 1800);

    return () => clearInterval(heartInterval);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-3 overflow-hidden select-none">
      {/* Top Bar Indicators (Viewer count & Live Chat toggle) */}
      <div className="flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-bold text-white border border-white/10 shadow">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>👁️ {viewerCount.toLocaleString()}</span>
          <span className="text-slate-400 font-normal text-[10px]">watching</span>
        </div>

        <button
          type="button"
          onClick={() => setIsOverlayVisible(prev => !prev)}
          className="bg-black/60 hover:bg-black/80 backdrop-blur-md text-white px-2 py-0.5 rounded-full text-[10px] font-semibold border border-white/10 transition cursor-pointer"
        >
          {isOverlayVisible ? '💬 Chat ON' : '💬 Chat OFF'}
        </button>
      </div>

      {/* Floating Animated Reaction Hearts (Right side stream) */}
      <div className="absolute right-4 bottom-16 w-16 h-48 pointer-events-none overflow-hidden">
        {hearts.map(h => (
          <div
            key={h.id}
            style={{ left: `${h.left}%` }}
            className="absolute bottom-0 text-xl animate-float-heart"
          >
            {h.emoji}
          </div>
        ))}
      </div>

      {/* Bottom Live Comments Overlay Feed */}
      {isOverlayVisible && (
        <div className="w-full max-w-[85%] sm:max-w-[75%] flex flex-col gap-1.5 pointer-events-auto transition-all">
          {comments.map(c => (
            <div
              key={c.id}
              className={`p-1.5 sm:p-2 rounded-xl text-xs backdrop-blur-md flex items-start gap-2 shadow-lg transition-all animate-in slide-in-from-bottom-2 duration-300 ${
                c.isPurchase
                  ? 'bg-gradient-to-r from-amber-950/90 to-purple-950/90 border border-amber-500/60 text-amber-200'
                  : 'bg-black/60 border border-white/10 text-white'
              }`}
            >
              <span className="text-sm shrink-0">{c.avatar}</span>
              <div className="min-w-0 leading-tight">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="font-bold text-[10px] text-purple-300">@{c.user}</span>
                  {c.badge && (
                    <span className="text-[8px] bg-purple-900/80 text-purple-200 px-1 py-0.2 rounded font-semibold border border-purple-400/40">
                      {c.badge}
                    </span>
                  )}
                  {c.isPurchase && (
                    <span className="text-[8px] bg-amber-500 text-slate-950 px-1 py-0.2 rounded font-extrabold uppercase">
                      PURCHASED
                    </span>
                  )}
                </div>
                <p className="text-[11px] leading-snug break-words">
                  {c.text[lang] || c.text.en}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default LiveViewerOverlay;
