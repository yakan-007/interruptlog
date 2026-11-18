const messages = {
onboarding: {
        eyebrow: '割り込みログ',
        hero: ['タスクの時間を測るタイマー。', '割り込みと休憩は、', '押した瞬間から分けて残ります。'],
        steps: {
          task: { title: 'タスクを書いて ▶ で計測', subtitle: '止めるまで、そのタスクの時間になります' },
          interrupt: { title: '割り込みは「割り込み」を押すだけ', subtitle: '電話・チャットなどを選び、終わったら元のタスクに戻ります' },
          break: { title: '休憩も同じように「休憩」で', subtitle: '割り込みとは分けて記録されます' },
          fix: { title: '押し忘れは、あとから履歴で直せます', subtitle: '時刻の修正も、抜けた時間の追加もできます' },
        },
        storage: 'データはこのブラウザだけに保存され、ほかの端末とは同期しません。大事な記録は、設定から個人バックアップを書き出して控えてください。',
        start: 'はじめる',
        note: 'アカウント登録は不要です',
      },
};

export default messages.onboarding;
