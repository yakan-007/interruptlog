const messages = {
common: {
        task: 'タスク',
        interrupt: '割り込み',
        break: '休憩',
        record: '記録',
        count: (count) => `${count}件`,
        people: (count) => `${count}人`,
        rows: (count) => `${count}行`,
        countUnit: '件',
        fromSender: (sender) => `${sender}から`,
      },
};

export default messages.common;
