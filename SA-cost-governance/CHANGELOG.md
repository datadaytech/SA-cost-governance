# Changelog

All notable changes to SA-cost-governance will be documented in this file.

## [v2.0.9] - 2025-01-12

### Added
- Comprehensive Playwright tests for modal count verification (7 tests)
- Reason column formatting for Flagged, Expiring, and Disabled modals
- PNG icon files for Splunk compatibility
- 10 hands-on exercises for interactive learning

### Changed
- Replaced mock lookup data with real scheduled searches from Splunk
- Hide Extend Deadline button by default in metric popup modal (only shows for flagged/expiring)

### Fixed
- Modal counts now match panel values across all metric types
- Flagged modal query now correctly shows only pending/notified statuses
- Disabled modal query now includes 7-day filter to match panel
- Runtime ratio values in lookup data corrected
- Removed Disable Selected button from metric popup modal

## [v2.0.8] - 2025-01-11

### Added
- Cron schedule comprehensive testing
- Runtime accuracy tests
- Auto-disable functionality

### Fixed
- Various bug fixes and stability improvements

## [v2.0.7] - 2025-01-10

### Added
- Initial governance dashboard implementation
- Scheduled search monitoring
- Flag/unflag workflow
- Notification system

---

For more details, see the [commit history](https://github.com/DataDay-Technology-Solutions/splunk-apps/commits/main).
