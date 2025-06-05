# InterruptLog - Complete Usage Guide

## Overview
InterruptLog is a task management application that tracks work sessions, interruptions, and breaks. It helps you monitor productivity by logging events with precise timing and categorization.

## Current State Summary

### Core Features
- **Task Management**: Start, pause, and complete tasks
- **Interrupt Tracking**: Log interruptions with details (who, type, urgency)
- **Break Logging**: Record different types of breaks (short, coffee, lunch, custom)
- **Real-time Timing**: Live elapsed time display for all active events
- **Event History**: Complete log of all activities with timestamps

### User Interface
- **Clean 3-Button Modal Design**: Each modal (Interrupt/Break) has consistent layout:
  - "Save & Resume" (returns to previous task)
  - "Save & End" (completes current event)
  - "Cancel" (discards current event)
- **Floating Action Controls**: Bottom bar with quick access buttons when task is active
- **Icon-based Navigation**: Bottom tabs for Home, Reports, Settings
- **Responsive Design**: Works on desktop and mobile devices

### Modal Behavior
- **Outside Tap**: Tapping outside any modal cancels the current action
- **Consistent UX**: Both Interrupt and Break modals behave identically
- **Visual Feedback**: Icons and colors indicate different event types

## How to Use the App

### Starting a Task
1. Navigate to the main page
2. Enter a task name in the input field
3. Click "Start" or press Enter
4. Timer begins automatically

### Handling Interruptions
1. While a task is running, click "Interrupt" in the floating bar
2. Fill in interruption details:
   - **Subject**: What the interruption was about
   - **Who/What**: Person or source of interruption
   - **Type**: Meeting, Call, Q&A, Visit, Chat, Other
   - **Urgency**: Low, Medium, High
3. Choose action:
   - **Save & Resume**: Log interrupt and return to original task
   - **Save & End**: Log interrupt and stop working
   - **Cancel**: Discard interrupt and continue original task

### Taking Breaks
1. Click "Break" in the floating bar during a task
2. Enter optional break label (e.g., "Coffee break")
3. Choose action:
   - **Save & Resume**: End break and return to task
   - **Save & End**: End break and stop working
   - **Cancel**: Cancel break and continue task

### Stopping Tasks
1. Click "Stop" in the floating bar
2. Task ends and timer stops
3. Event is saved to history

## Data Structure & Export

### Event Data Format
Each event in the system contains:

```json
{
  "id": "uuid-string",
  "type": "task|interrupt|break",
  "label": "Event description",
  "start": 1703123456789,
  "end": 1703123556789,
  "meta": {
    "myTaskId": "related-task-uuid"
  },
  // Interrupt-specific fields
  "who": "Person or source",
  "interruptType": "Meeting|Call|Q&A|Visit|Chat|Other", 
  "urgency": "Low|Medium|High",
  "originalTaskId": "uuid-of-interrupted-task",
  // Break-specific fields
  "breakType": "short|coffee|lunch|custom|indefinite",
  "breakDurationMinutes": 15
}
```

### Current Export Capabilities
The app uses IndexedDB for local storage with the following structure:

**Database**: `interruptlog-db`
**Store**: `events`
**Key**: Auto-generated UUID
**Data**: Event objects as shown above

### How to Export Data

#### Method 1: Browser Developer Tools
1. Open browser Developer Tools (F12)
2. Go to "Application" tab
3. Navigate to "Storage" > "IndexedDB" > "interruptlog-db" > "events"
4. Right-click on data entries and select "Copy"
5. Paste into text file and format as needed

#### Method 2: Export Function (If Implemented)
```javascript
// Run in browser console to export all data
async function exportData() {
  const request = indexedDB.open('interruptlog-db');
  request.onsuccess = function(event) {
    const db = event.target.result;
    const transaction = db.transaction(['events'], 'readonly');
    const store = transaction.objectStore('events');
    const getAllRequest = store.getAll();
    
    getAllRequest.onsuccess = function() {
      const data = getAllRequest.result;
      const jsonString = JSON.stringify(data, null, 2);
      
      // Download as file
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'interruptlog-export.json';
      a.click();
    };
  };
}
exportData();
```

### Export File Contents
The exported JSON file will contain an array of all events:

```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "type": "task",
    "label": "Write documentation",
    "start": 1703123456789,
    "end": 1703125456789,
    "meta": {}
  },
  {
    "id": "987f6543-e21c-34e5-b678-987654321000", 
    "type": "interrupt",
    "label": "Client phone call",
    "start": 1703124000000,
    "end": 1703124300000,
    "who": "John Smith",
    "interruptType": "Call",
    "urgency": "High",
    "originalTaskId": "123e4567-e89b-12d3-a456-426614174000"
  },
  {
    "id": "456a7890-b12c-45d6-e789-123456789000",
    "type": "break", 
    "label": "Coffee break",
    "start": 1703125000000,
    "end": 1703125900000,
    "breakType": "coffee",
    "breakDurationMinutes": 15
  }
]
```

## Data Import Instructions

### Import Process
1. **Backup Current Data**: Export existing data first as backup
2. **Prepare Import File**: Ensure JSON format matches expected structure
3. **Clear Existing Data** (if full replacement desired)
4. **Import New Data**: Use import function to load events

### Import Function
```javascript
// Run in browser console to import data
async function importData(jsonData) {
  const request = indexedDB.open('interruptlog-db');
  request.onsuccess = function(event) {
    const db = event.target.result;
    const transaction = db.transaction(['events'], 'readwrite');
    const store = transaction.objectStore('events');
    
    // Clear existing data (optional)
    // store.clear();
    
    // Import each event
    jsonData.forEach(event => {
      store.put(event);
    });
    
    transaction.oncomplete = function() {
      console.log('Import completed successfully');
      window.location.reload(); // Refresh to show imported data
    };
  };
}

// Usage:
// 1. Copy your JSON data
// 2. Run: importData(yourJsonDataArray)
```

### What Happens After Import

#### Immediate Effects
- **Data Refresh**: App automatically refreshes to show imported events
- **History Population**: All imported events appear in event history
- **State Reset**: Any active timers or sessions are cleared
- **UI Update**: Interface reflects the new data state

#### Data Validation
- **ID Conflicts**: Duplicate IDs will overwrite existing entries
- **Type Validation**: Invalid event types may cause display issues
- **Timestamp Integrity**: Malformed timestamps will affect time calculations
- **Reference Integrity**: Missing originalTaskId references may break interrupt chains

#### Potential Issues
- **Performance**: Large datasets may slow initial load
- **Memory Usage**: Extensive history consumes browser storage
- **Compatibility**: Data from different app versions may have schema differences

## Technical Details

### Browser Storage
- **Engine**: IndexedDB
- **Database**: `interruptlog-db`
- **Size Limit**: Varies by browser (typically 1GB+ available)
- **Persistence**: Data survives browser restarts and updates

### Data Persistence
- **Auto-save**: All events saved immediately upon creation/completion
- **No Manual Save**: Changes are automatically persisted
- **Offline Capable**: Works without internet connection
- **Local Only**: Data stays on your device

### Browser Compatibility
- **Chrome**: Full support
- **Firefox**: Full support  
- **Safari**: Full support
- **Edge**: Full support
- **Mobile Browsers**: Responsive design supported

## Troubleshooting

### Common Issues
1. **Data Not Saving**: Check browser storage permissions
2. **Performance Issues**: Clear old data or export/import subset
3. **Display Problems**: Refresh browser or clear browser cache
4. **Import Failures**: Validate JSON format and structure

### Data Recovery
- **Browser Backup**: Check browser sync if enabled
- **Export Regularly**: Create periodic backups of important data
- **Version Control**: Keep multiple export versions for safety

## Best Practices

### Data Management
- **Regular Exports**: Weekly backups recommended
- **Selective Import**: Import only necessary date ranges
- **Data Cleanup**: Remove test or erroneous entries before export

### Usage Tips
- **Consistent Labeling**: Use clear, descriptive event labels
- **Interrupt Details**: Fill in who/what for better tracking
- **Break Types**: Use appropriate break categories for reporting
- **Regular Reviews**: Check reports page for productivity insights

This guide covers the complete current state and usage of InterruptLog. The app is designed for simplicity while providing detailed tracking capabilities for productivity analysis.