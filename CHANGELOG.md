# Changelog

All notable changes to SA Topology Analyzer will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v1.0.8] - 2025-01-10

### Added
- **Comprehensive Live Dependency Mapping**: Full data flow chain discovery (UF→HF→IDX→SH)
- **Throughput Visualization**: Connection lines scale by data volume (KB/MB)
- **Multi-hop Path Detection**: Discovers UF→HF→IDX forwarding chains
- **Connection Details in Modal**: Shows inbound/outbound connections per node
- **Real-time Throughput Metrics**: Displays total KB transferred and avg KB/s
- **Search Head Cluster Discovery**: Auto-discovers SHC members and captain
- **Indexer Cluster Discovery**: Identifies cluster peers with site information

### Enhanced
- **tcpin_connections Analysis**: Extracts actual receiver relationships from logs
- **Visual Connection Styling**:
  - Line thickness indicates data volume
  - Color coding: green (high), yellow (medium), gray (low throughput)
  - Throughput labels on significant connections
- **Node Deduplication**: Proper handling of duplicate hostnames across queries
- **Error Handling**: Graceful fallback when cluster APIs unavailable

### Technical Details
- 5 parallel SearchManager queries for comprehensive discovery
- Normalized hostname handling (removes ports, case-insensitive)
- Connection tracking with inbound/outbound relationship maps
- Multi-value field parsing for receiver lists

## [v1.0.7] - 2025-01-10

### Added
- **ITSI-style KPI Modal**: Click any node to open a detailed modal with KPIs
- **Health Score**: 0-100 scale calculated from weighted KPI severities
- **5-Level Severity System**: Critical (red), High (orange), Medium (yellow), Low (blue), Normal (green)
- **Sparkline Visualizations**: 24-hour trend graphs for each KPI and health score
- **KPI Definitions by Node Type**:
  - Universal Forwarders: Events/sec, Queue Fill %, CPU, Memory, Connection Health
  - Heavy Forwarders: Events/sec, Parse Queue, TCP Out Queue, Indexer Ack Time, CPU, Memory
  - Indexers: Events/sec, Index Latency, Disk Usage, Hot Buckets, Replication Health, Search Factor
  - Search Heads: Concurrent Searches, Avg Search Time, Scheduled/Skipped Searches, CPU, Memory
  - SHC Members: Bundle Replication, Captain Stability, Active Members
- **Trend Indicators**: Arrows showing KPI direction with color-coded severity impact
- **Modal Features**: ESC to close, click outside to close, "View in Splunk Search" drilldown button

### Technical Details
- Mock KPI values generated based on node health status
- Inverse threshold support for "higher is better" metrics
- D3.js-powered sparklines with area fills and current value dots

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
