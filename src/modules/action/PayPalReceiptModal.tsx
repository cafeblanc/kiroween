import React, { useState } from 'react';
import { ActionOrder, Language } from '../../types';

interface PayPalReceiptModalProps {
  order: ActionOrder | null;
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const PayPalReceiptModal: React.FC<PayPalReceiptModalProps> = ({
  order,
  isOpen,
  onClose,
  lang
}) => {
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  if (!isOpen || !order) return null;

  const usdAmount = (order.amount / 1350).toFixed(2);
  const now = new Date();
  const estimatedDate = new Date(now.getTime() + 24 * 60 * 60 * 1000).toLocaleDateString(
    lang === 'ko' ? 'ko-KR' : 'en-US',
    { month: 'short', day: 'numeric', weekday: 'short' }
  );

  const handleDownloadReceipt = () => {
    try {
      const receiptText = `=========================================
      PAYPAL OFFICIAL ORDER RECEIPT
=========================================
Transaction ID: ${order.orderId}
Tracking Number: ${order.trackingNumber}
Date: ${new Date().toLocaleString()}
Status: COMPLETED (Verified)
-----------------------------------------
Purchased Item: ${order.productName}
Quantity: ${order.quantity || 1}
Currency: ${order.currency}
Total Amount: ${order.currency} ${order.amount.toLocaleString()} (~$${usdAmount} USD)
Payment Gateway: PayPal Instant Express
-----------------------------------------
Logistics Dispatch: Yangpyeong Central Hub
Carrier: Express Courier (24h Guaranteed)
Estimated Arrival: ${estimatedDate}
=========================================
Thank you for shopping with Kiroween Live!
`;
      const blob = new Blob([receiptText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PayPal_Receipt_${order.orderId}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setDownloadNotice('✅ 영수증 파일이 다운로드되었습니다!');
      setTimeout(() => setDownloadNotice(null), 3000);
    } catch (_) {
      setDownloadNotice('✅ 영수증이 발급되었습니다.');
      setTimeout(() => setDownloadNotice(null), 3000);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border-2 border-emerald-500 w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden relative max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header Badge */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-purple-950 p-4 border-b border-blue-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🅿️</span>
            <div>
              <h3 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-2">
                PayPal Official Receipt
                <span className="text-[10px] bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full font-bold shadow">
                  결제 승인 완료
                </span>
              </h3>
              <p className="text-[10px] text-blue-300 font-mono">TxID: {order.orderId}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg p-1 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 flex flex-col gap-3.5 text-xs">
          
          {/* Success Callout */}
          <div className="bg-emerald-950/80 border border-emerald-500/40 p-3 rounded-xl flex items-center gap-3 shadow-inner">
            <span className="text-2xl">🎉</span>
            <div>
              <p className="font-bold text-emerald-300">
                {lang === 'ko' ? '인스트림 실시간 주문이 완료되었습니다!' : 'In-Stream Purchase Successful!'}
              </p>
              <p className="text-[11px] text-emerald-200/80">
                {lang === 'ko' ? 'AI 에이전트가 스마트 물류 센터로 즉시 출고 지시를 전송했습니다.' : 'Agent sent instant fulfillment instruction to logistics.'}
              </p>
            </div>
          </div>

          {/* Item & Price Summary */}
          <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl flex flex-col gap-2">
            <div className="flex justify-between items-center text-slate-400 text-[11px]">
              <span>주문 상품 (Purchased Item)</span>
              <span className="font-bold text-emerald-400">수량: {order.quantity || 1}개</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold text-white text-xs truncate max-w-[210px]">{order.productName}</span>
              <div className="text-right">
                <span className="font-extrabold text-amber-400 font-mono text-sm">{order.currency} {order.amount.toLocaleString()}</span>
                <span className="text-[10px] text-slate-400 block font-mono">(${usdAmount} USD)</span>
              </div>
            </div>
            <div className="border-t border-slate-800 pt-2 flex justify-between items-center text-[11px] text-slate-300">
              <span>결제 수단:</span>
              <span className="font-semibold text-blue-400 flex items-center gap-1">
                <span>🅿️</span>
                <span>PayPal Instant Express</span>
              </span>
            </div>
          </div>

          {/* Fulfillment Stepper */}
          <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl flex flex-col gap-2.5">
            <div className="flex justify-between items-center text-[11px]">
              <span className="font-bold text-slate-300">🚚 실시간 물류 배송 추적</span>
              <span className="text-[10px] font-mono text-purple-400 font-bold">{order.trackingNumber}</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-bold flex items-center justify-center shrink-0">✓</span>
                <span className="text-emerald-400 font-semibold">결제 승인 및 실시간 재고 차감 완료</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-4 h-4 rounded-full bg-blue-500 text-slate-950 text-[10px] font-bold flex items-center justify-center shrink-0 animate-ping">●</span>
                <span className="text-blue-300 font-semibold">양평 산지 직송 물류 센터 포장 및 출고 준비</span>
              </div>
              <div className="flex items-center gap-2.5 opacity-60">
                <span className="w-4 h-4 rounded-full bg-slate-700 text-[10px] flex items-center justify-center shrink-0">3</span>
                <span className="text-slate-400">특급 택배 익일 배송 출발</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg text-[10px] text-slate-400 flex justify-between items-center">
              <span>도착 예정일:</span>
              <span className="font-bold text-amber-300">{estimatedDate} (24시간 보장 특급 배송)</span>
            </div>
          </div>

          {/* Download Notice Toast */}
          {downloadNotice && (
            <div className="bg-blue-900/90 border border-blue-400/50 text-blue-200 text-center py-1.5 px-3 rounded-lg text-xs font-bold animate-in fade-in">
              {downloadNotice}
            </div>
          )}

          {/* Security & Buyer Protection */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
            <span className="flex items-center gap-1 text-blue-400 font-semibold">
              <span>🛡️</span> PayPal 구매자 안심 보호 프로그램 적용
            </span>
            <span>Ref: {order.orderId.slice(-6)}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleDownloadReceipt}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 rounded-xl transition text-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>📥</span>
              <span>영수증 다운로드</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-2.5 rounded-xl transition text-xs shadow-lg shadow-purple-900/40 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>📺</span>
              <span>방송 계속 시청하기</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayPalReceiptModal;
