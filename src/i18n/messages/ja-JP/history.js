const messages = {
history: {
        title: '履歴',
        emptyTitle: 'この日の履歴はありません',
        addMissed: '押し忘れを記録',
        previousDay: '前日から',
        nextDay: '翌日に続く',
        longEvent: '長時間',
        list: 'リスト',
        timeline: 'タイムライン',
        today: '今日',
        previous: '前日へ',
        next: '翌日へ',
        pickDate: '日付を選ぶ',
        missedShort: '押し忘れ',
        gapLabel: '空き時間',
        addGap: 'この空き時間を記録',
        viewMode: '履歴表示モード',
        summary: ({ count, total }) => `${count}件 / 合計 ${total}`,
        anomaliesTitle: (count) => `${count}件の記録の時刻を確認してください`,
        overlapTitle: (count) => `${count}件の重なった記録が未整理です`,
        repair: '重複を整理',
      },
};

export default messages.history;
