const messages = {
common: {
        task: 'Task',
        interrupt: 'Interruption',
        break: 'Break',
        record: 'Record',
        count: (count) => `${count}`,
        rows: (count) => `${count} rows`,
        countUnit: '',
        fromSender: (sender) => `From ${sender}`,
      },
};

export default messages.common;
