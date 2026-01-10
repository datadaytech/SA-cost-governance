# Changelog

All notable changes to SA Topology Analyzer will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v1.0.0] - 2025-01-10

### Added
- Initial release of SA Topology Analyzer
- Dynamic tree visualization using D3.js
- Universal Forwarder discovery from `_internal` index
- Index discovery via Splunk REST API
- Search Head discovery via REST API
- Mock health status indicators (green/yellow/red)
- Interactive node details panel
- Zoom and pan functionality
- Health summary badges
- Toolbar with refresh and fullscreen options
- Classic XML dashboard for Splunk 8.x/9.x compatibility
- Splunk Cloud compatible design (AppInspect ready)

### Technical Details
- Built with Splunk Web Framework (RequireJS)
- D3.js v7 for tree visualization
- Responsive CSS design
- Saved searches for all discovery queries
