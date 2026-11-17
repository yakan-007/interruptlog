const messages = {
common: {
        task: 'Task',
        interrupt: 'Interruption',
        break: 'Break',
        record: 'Record',
        count: (count) => `${count}`,
        people: (count) => `${count} people`,
        rows: (count) => `${count} rows`,
        countUnit: '',
        fromSender: (sender) => `From ${sender}`,
      },
};

export default messages.common;
