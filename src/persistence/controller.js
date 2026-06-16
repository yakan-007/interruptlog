export function createSerializedPersistenceController(writeState) {
  let latestState = null;
  let queue = Promise.resolve();

  const drain = async () => {
    while (latestState !== null) {
      const nextState = latestState;
      latestState = null;
      await writeState(nextState);
    }
  };

  return {
    schedule(state) {
      latestState = state;
      queue = queue.catch(() => null).then(drain);
      return queue;
    },
  };
}
