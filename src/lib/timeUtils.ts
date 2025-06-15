/**
 * 時間関連のユーティリティ関数
 */

/**
 * イベント時刻をフォーマット（今日なら時刻のみ、他の日なら日付付き）
 */
export const formatEventTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  
  if (isToday) {
    return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  } else {
    return date.toLocaleDateString('ja-JP', { 
      month: 'numeric', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
};

/**
 * 経過時間をhh:mm:ss形式でフォーマット
 */
export const formatElapsedTime = (startTime: number): string => {
  const now = Date.now();
  const totalSeconds = Math.floor((now - startTime) / 1000);
  if (totalSeconds < 0) return '00:00:00';
  
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

/**
 * ミリ秒を時間・分形式でフォーマット
 */
export const formatDuration = (ms: number): string => {
  if (ms <= 0) return '0分';
  
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours > 0) {
    return minutes > 0 ? `${hours}時間 ${minutes}分` : `${hours}時間`;
  }
  return `${minutes}分`;
};