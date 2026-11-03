import React from 'react';
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
  if (!isOpen || !order) return null;

  const usdAmount = (order.amount / 1350).toFixed(2);
  const now = new Date();
  const estimatedDate = new Date(now.getTime() + 24 * 60 * 60 * 1000).toLocaleDateString(
    lang === 'ko' ? 'ko-KR' : 'en-US',
    { month: 'short', day: 'numeric', weekday: 'short' }
  );

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3 sm:p-6 select-none"
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
                <span className="text-[10px] bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full font-bold">
                  COMPLETED
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
        <div className="p-4 sm:p-5 flex flex-col gap-4 text-xs">
          
          {/* Success Callout */}
          <div className="bg-emerald-950/80 border border-emerald-500/40 p-3 rounded-xl flex items-center gap-3">
            <span className="text-2xl">🎉</span>
            <div>
              <p className="font-bold text-emerald-300">
                {lang === 'ko' ? '인스트림 주문이 완료되었습니다!' : 'In-Stream Purchase Successful!'}
              </p>
              <p className="text-[11px] text-emerald-200/80">
                {lang === 'ko' ? '에이전트가 물류 센터로 출고 지시를 전송했습니다.' : 'Agent sent instant fulfillment instruction to logistics.'}
              </p>
            </div>
          </div>

          {/* Item & Price Summary */}
          <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl flex flex-col gap-2">
            <div className="flex justify-between items-center text-slate-400 text-[11px]">
              <span>Purchased Item</span>
              <span>Qty: {order.quantity || 1}개</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold text-white text-xs truncate max-w-[200px]">{order.productName}</span>
              <div className="text-right">
                <span className="font-extrabold text-amber-400">{order.currency} {order.amount.toLocaleString()}</span>
                <span className="text-[10px] text-slate-400 block font-mono">(${usdAmount} USD)</span>
              </div>
            </div>
            <div className="border-t border-slate-800 pt-2 flex justify-between items-center text-[11px] text-slate-300">
              <span>Payment Gateway:</span>
              <span className="font-semibold text-blue-400">PayPal Instant Express</span>
            </div>
          </div>

          {/* Fulfillment Stepper */}
          <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl flex flex-col gap-3">
            <div className="flex justify-between items-center text-[11px]">
              <span className="font-bold text-slate-300">🚚 Real-Time Logistics Tracking</span>
              <span className="text-[10px] font-mono text-purple-400">{order.trackingNumber}</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-bold flex items-center justify-center shrink-0">✓</span>
                <span className="text-emerald-400 font-semibold">Payment Captured & Inventory Locked</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-4 h-4 rounded-full bg-blue-500 text-slate-950 text-[10px] font-bold flex items-center justify-center shrink-0 animate-ping">●</span>
                <span className="text-blue-300 font-semibold">Logistics Dispatch in Progress (Yangpyeong Hub)</span>
              </div>
              <div className="flex items-center gap-2.5 opacity-60">
                <span className="w-4 h-4 rounded-full bg-slate-700 text-[10px] flex items-center justify-center shrink-0">3</span>
                <span className="text-slate-400">Carrier Express Delivery</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg text-[10px] text-slate-400 flex justify-between items-center">
              <span>Estimated Arrival:</span>
              <span className="font-bold text-amber-300">{estimatedDate} (Express 24h)</span>
            </div>
          </div>

          {/* Security & Buyer Protection */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
            <span className="flex items-center gap-1 text-blue-400 font-semibold">
              <span>🛡️</span> PayPal Buyer Protection Guarantee
            </span>
            <span>Ref: {order.orderId.slice(-6)}</span>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => alert('Receipt downloaded as PDF (Simulated)')}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 rounded-xl transition text-xs cursor-pointer"
            >
              📄 Download Receipt
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 rounded-xl transition text-xs shadow-lg shadow-purple-900/40 cursor-pointer"
            >
              Continue Stream
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default PayPalReceiptModal;
