# InterruptLog Changelog

All notable changes to InterruptLog will be documented in this file.

## [Unreleased] - 2025-01-19

### Added
- **Event Time Editing Feature**: Users can now edit the end time of the last completed event
  - Clock icon appears on the most recent completed event in history
  - Time editing modal with validation and gap activity naming
  - Automatic creation of "unknown activity" events to fill time gaps
  - Support for custom naming of gap activities (e.g., "other work", "meeting", "phone call")
  
- **Business Hours Mode**: Automatic time tracking during work hours
  - Configurable work start/end times (default: 9:00-18:00)
  - Automatic start of "Other Work" task during business hours
  - Smart pause/resume when specific tasks or interrupts are started/stopped
  - Auto-stop outside business hours (configurable)
  - Real-time business hours status display
  - Comprehensive validation for time settings

### Improved
- **Code Architecture**: Major refactoring for better maintainability
  - Extracted business hours utilities to `/src/lib/businessHours/`
  - Created dedicated `BusinessHoursSettings` component
  - Consolidated duplicate business hours restart logic
  - Added comprehensive validation functions
  - Improved type safety with stricter TypeScript types
  - Reduced settings page complexity (591 → ~430 lines)

- **Performance**: Optimized business hours checking
  - Centralized business hours status calculation
  - Reduced redundant code in store actions
  - Better error handling for time validation

### Technical Changes
- Added new utility modules:
  - `/src/lib/businessHours/utils.ts` - Time calculation and status checking
  - `/src/lib/businessHours/validation.ts` - Input validation and error handling
  - `/src/components/settings/BusinessHoursSettings.tsx` - Dedicated settings UI
- Enhanced type definitions:
  - Added `isUnknownActivity` meta field to Event type
  - Improved BusinessHoursSettings type validation
  - Added ValidationResult and ValidationError types
- Store improvements:
  - Added `_tryRestartBusinessTask()` helper function
  - Consolidated business hours restart logic
  - Better separation of concerns

### Bug Fixes
- Fixed time format validation edge cases
- Improved error messages for business hours configuration
- Better handling of business hours transitions

---

## [v1.2.0] - 2025-01-18

### Added
- **メモ機能** - イベントに後からメモを追加・編集できるようになりました
- **タスク名の編集機能** - タスク名をダブルクリックで編集可能
- **タスク分類機能** - カテゴリによるタスク分類と時間分析

### Changed
- イベント履歴の表示改善
- データ管理機能の追加（全データ削除）

## [v1.0.0] - 2025-01-16
- Initial release with core features
- Task tracking, interrupts, breaks
- Data persistence with IndexedDB
- Basic reporting functionality