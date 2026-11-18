const messages = {
onboarding: {
        eyebrow: 'Interruption log',
        hero: ['A timer for your tasks.', 'Interruptions and breaks are kept apart', 'from the moment you tap.'],
        steps: {
          task: { title: 'Write a task and tap ▶', subtitle: 'Time counts toward it until you stop' },
          interrupt: { title: 'Tap Interrupt when something cuts in', subtitle: 'Pick call, chat and so on, then go back to the task' },
          break: { title: 'Tap Break the same way', subtitle: 'Breaks are recorded apart from interruptions' },
          fix: { title: 'Fix what you missed in History', subtitle: 'Correct times or add time you forgot to record' },
        },
        storage: 'Data stays in this browser and does not sync to other devices. Export a personal backup from Settings to keep important records.',
        start: 'Get started',
        note: 'No account needed',
      },
};

export default messages.onboarding;
