const messages = {
toasts: {
        eventAdded: 'Record added',
        eventSaved: 'Record saved',
        eventDeleted: 'Record deleted',
        interruptSaved: 'Interruption recorded',
        breakSaved: 'Break recorded',
        sortDueOff: 'Sorting by due date was turned off because you reordered',
        repaired: 'Overlapping records repaired',
        jsonExported: 'JSON exported',
        exportCanceled: 'Export canceled',
        jsonImported: 'JSON imported',
        csvExported: 'CSV exported',
        dailyReportCopied: 'Daily report copied',
        workTableCopied: (count) => `Table copied (${count} rows)`,
        copyFailed: 'Could not copy',
        storageSaveFailed: 'Could not save in this browser. Check storage space or private browsing mode.',
      },
};

export default messages.toasts;
