# Changelog

All notable changes to SA Topology Analyzer will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v1.0.6] - 2025-01-10

### Changed
- Complete redesign of topology visualization with realistic Splunk architecture
- New 4-tier layered layout: Collection → Forwarding → Indexing → Search
- Proper component terminology: Indexers (not "indexes"), Heavy Forwarders, Universal Forwarders
- Search Head Cluster (3 members) with visual cluster grouping
- Standalone Search Head adjacent to cluster
- Indexer Cluster (4 peer nodes) with visual cluster grouping
- Heavy Forwarders as intermediate aggregation layer
- 10 Universal Forwarders representing various source types (web servers, app servers, firewalls, cloud)

### Added
- Tiered background bands with color coding per tier
- Cluster boundary boxes with dashed borders
- Distinct connection types: solid lines for data flow, dashed for search queries
- Node hover effects with smooth transitions
- Dark theme with gradient background for better visual contrast
- Improved node details panel showing role and cluster membership

### Technical Details
- Custom layered layout algorithm (not tree-based)
- 21 nodes with 42 connections representing realistic data flow
- Search connections shown with lower opacity to reduce visual clutter

## [v1.0.5] - 2025-01-10

### Added
- Comprehensive Playwright test suite (5 tests)
- Test coverage for dashboard loading, health badges, SVG rendering, node interactions
- `.gitignore` for node_modules and test artifacts

### Fixed
- D3.js loading via RequireJS configuration
- Visualization now renders correctly in Splunk's sandboxed HTML panels
- Node click handler properly shows details panel

### Technical Details
- RequireJS `paths` config points to local D3.js bundle
- All tests passing (45.8s total)

## [v1.0.4] - 2025-01-10

### Fixed
- Bundled D3.js locally to avoid Splunk trusted domains warning
- No longer requires external CDN access

## [v1.0.2] - 2025-01-10

### Fixed
- Force mock data to load immediately on page load
- Clear loading spinner before initializing visualization

## [v1.0.1] - 2025-01-10

### Fixed
- Removed erroneous CDATA wrapper from topology.xml causing 400 error

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
- Classic XML dashboard for Splunk 8.x/9.x compatibility
- Splunk Cloud compatible design (AppInspect ready)

### Technical Details
- Built with Splunk Web Framework (RequireJS)
- D3.js v7 for tree visualization
- Responsive CSS design
- Saved searches for all discovery queries
