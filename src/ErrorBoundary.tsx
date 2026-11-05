import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
  compact?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Kiroween ErrorBoundary caught error]:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, copied: false });
    this.props.onReset?.();
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearStorageAndReload = () => {
    try {
      localStorage.removeItem('kiroween_active_product');
      localStorage.removeItem('kiroween_live_products');
      localStorage.removeItem('kiroween_last_action');
    } catch (e) {
      console.warn('Storage cleanup notice:', e);
    }
    window.location.reload();
  };

  private handleCopyDiagnostics = () => {
    const diagnostics = [
      `[Kiroween Runtime Error Diagnostics]`,
      `Time: ${new Date().toISOString()}`,
      `Error: ${this.state.error?.name}: ${this.state.error?.message}`,
      `Stack:\n${this.state.error?.stack || 'N/A'}`,
      `ComponentStack:\n${this.state.errorInfo?.componentStack || 'N/A'}`
    ].join('\n\n');

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(diagnostics);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2500);
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.compact) {
        return (
          <div className="p-4 bg-red-950/80 border border-red-500/60 rounded-xl text-red-200 text-xs flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5 text-red-300">
                <span>⚠️</span>
                <span>{this.props.fallbackTitle || '모듈 일시 오류 발생'}</span>
              </span>
              <button
                type="button"
                onClick={this.handleRetry}
                className="bg-red-800 hover:bg-red-700 text-white px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer transition"
              >
                재시도
              </button>
            </div>
            <p className="text-[11px] text-red-300/90 truncate">
              {this.state.error?.message || '일시적 렌더링 예외가 포착되었습니다.'}
            </p>
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 flex items-center justify-center font-sans">
          <div className="max-w-2xl w-full bg-slate-900/90 border border-red-500/40 rounded-2xl p-6 shadow-2xl backdrop-blur flex flex-col gap-5">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-3xl">
                🛡️
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-full">
                    에러 방어선 작동됨 (Resilient Defense)
                  </span>
                </div>
                <h1 className="text-lg md:text-xl font-black text-white mt-1">
                  {this.props.fallbackTitle || '실시간 라이브 커머스 세션 보호 모드'}
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Kiroween의 실시간 예외 격리 시스템이 동작하여 화면 전체 크래시를 방지했습니다.
                </p>
              </div>
            </div>

            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 text-xs">
              <p className="font-semibold text-red-400 flex items-center gap-1.5">
                <span>⚠️</span>
                <span>{this.state.error?.name || 'Error'}: {this.state.error?.message || '알 수 없는 런타임 오류'}</span>
              </p>
            </div>

            <details className="text-[11px] text-slate-400 bg-slate-950/60 border border-slate-800 rounded-xl p-3 cursor-pointer">
              <summary className="font-semibold text-slate-300 select-none hover:text-white">
                🔍 개발자 디버그 진단 정보 (Stack Trace)
              </summary>
              <pre className="mt-2.5 p-2 bg-slate-950 border border-slate-800/80 rounded-lg text-[10px] text-red-300/80 overflow-x-auto font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                {this.state.error?.stack || 'No stack trace available'}
                {this.state.errorInfo?.componentStack ? `\n\nComponent Hierarchy:\n${this.state.errorInfo.componentStack}` : ''}
              </pre>
            </details>

            <div className="flex flex-wrap items-center gap-2.5 pt-1 border-t border-slate-800">
              <button
                type="button"
                onClick={this.handleRetry}
                className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-lg shadow-purple-950/50 cursor-pointer flex items-center gap-1.5"
              >
                <span>🔄</span>
                <span>컴포넌트 복구 재시도</span>
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2 rounded-xl border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
              >
                <span>🌐</span>
                <span>페이지 새로고침</span>
              </button>

              <button
                type="button"
                onClick={this.handleClearStorageAndReload}
                className="bg-red-950/60 hover:bg-red-900/80 text-red-300 text-xs font-semibold px-3 py-2 rounded-xl border border-red-500/30 transition cursor-pointer"
                title="로컬 저장소 상태를 초기화하고 새로고침합니다"
              >
                <span>🧹</span>
                <span>캐시 초기화 후 재시작</span>
              </button>

              <button
                type="button"
                onClick={this.handleCopyDiagnostics}
                className="ml-auto text-xs text-slate-400 hover:text-white px-3 py-2 rounded-xl hover:bg-slate-800 transition cursor-pointer"
              >
                {this.state.copied ? '✅ 복사됨!' : '📋 진단 로그 복사'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
