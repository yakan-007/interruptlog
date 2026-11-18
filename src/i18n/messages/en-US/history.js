const messages = {
history: {
        title: 'History',
        emptyTitle: 'No history for this day',
        addMissed: 'Add missed time',
        previousDay: 'From previous day',
        nextDay: 'Continues tomorrow',
        longEvent: 'Long event',
        list: 'List',
        timeline: 'Timeline',
        today: 'Today',
        previous: 'Previous day',
        next: 'Next day',
        pickDate: 'Pick date',
        missedShort: 'Missed',
        gapLabel: 'Open time',
        addGap: 'Record this open time',
        viewMode: 'History view mode',
        summary: ({ count, total }) => `${count} items / ${total} total`,
        anomaliesTitle: (count) => `Check the times of ${count} records`,
        overlapTitle: (count) => `${count} overlapping records need review`,
        repair: 'Repair overlaps',
      },
};

export default messages.history;
