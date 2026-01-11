# Changelog

All notable changes to SA Topology Analyzer will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v1.0.14] - 2025-01-10

### Added
- **Management Tier**: New side panel showing Splunk control plane components
  - **Cluster Manager (CM)**: Controls indexer cluster replication and search factor
  - **SHC Deployer**: Distributes apps and configs to SHC members
  - **License Manager (LM)**: Governs license pool for all instances
  - **Deployment Server (DS)**: Distributes configs to forwarders
  - **Monitoring Console (MC)**: Platform health monitoring

- **Connection Type Legend**: Visual differentiation of connection types
  - Data Flow (solid green): UF/HF → Indexers
  - Search Query (dashed purple): Search Heads → Indexers
  - Management (dotted gray): Control plane connections
  - Replication (dashed orange): Cross-site indexer replication

- **Visual Enhancements Based on Splunk Validated Architectures (SVA)**
  - Diamond-shaped nodes for management components
  - Captain indicator (★) for SHC captain
  - Side panel layout for management tier
  - Improved tier label styling

### Changed
- Redesigned layout to separate data flow from management/control plane
- Updated mock data with SVA-compliant component descriptions
- Improved connection curves for management connections
- Darker background gradient matching GitHub-inspired theme

### Technical Details
- Based on Splunk Validated Architectures M4/M14 multisite documentation
- `CONNECTION_STYLES` config for consistent connection rendering
- KPI definitions for all management component types
- Management nodes positioned in dedicated side panel (`tier: -1`)

### Research Sources
- [Splunk Validated Architectures](https://docs.splunk.com/Documentation/SVA/current/Architectures/About)
- [Multisite Indexer Cluster Architecture](https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Multisitearchitecture)
- [Data Collection Architecture - Splunk Lantern](https://lantern.splunk.com/Splunk_Success_Framework/Platform_Management/Data_collection_architecture)
- [ITSI Service Analyzer Tree View](https://help.splunk.com/en/splunk-it-service-intelligence/splunk-it-service-intelligence/visualize-and-assess-service-health/4.18/service-analyzer/use-the-service-analyzer-tree-view-in-itsi)

## [v1.0.13] - 2025-01-10

### Added
- **Multi-Tier Grouping System**: Automatically groups all tiers for large-scale visualization
  - **Search Head Cluster Grouping**: Groups SHC members when count exceeds threshold (default: 4)
  - **Standalone Search Head Grouping**: Groups standalone SHs by role when > 5
  - **Indexer Grouping by Site**: Groups indexers by site (Site A, Site B, Site C) for multisite clusters
  - **Heavy Forwarder Grouping**: Groups HFs by role (Syslog, Windows Events, Cloud, Security)
  - **Universal Forwarder Grouping**: Enhanced UF grouping with role-based categories

- **Large-Scale Mock Data**: Demo mode now represents enterprise environment
  - 7 SHC members (1 captain + 6 members)
  - 2 Standalone Search Heads (Enterprise Security, ITSI)
  - 15 Indexers across 3 sites (Site A, B, C with 5 each)
  - 12 Heavy Forwarders (Syslog, Windows, Cloud, Security roles)
  - 51 Universal Forwarders (Web, App, Database, Firewall, Cloud roles)

- **Generic Group Modal**: Click any group to see aggregate KPIs and member list
  - Two-column layout with aggregate KPIs on left
  - Scrollable member list on right with health indicators
  - Click-through navigation to individual member details

### Technical Details
- `GROUPING_CONFIG` object defines thresholds and grouping strategy per tier
- `groupNodesByType()` generic function for any node type grouping
- `applyMultiTierGrouping()` applies grouping across all tiers
- `isGroupType()` helper identifies grouped nodes for rendering
- Configurable thresholds: SH=5, SHC=4, IDX=8, HF=6, UF=8
- Connection aggregation: Groups inherit connections from members

## [v1.0.12] - 2025-01-10

### Changed
- **Settings Page Dark Theme Redesign**: Complete UI overhaul for better readability
  - GitHub-inspired dark color palette (#0d1117 primary, #161b22 secondary)
  - Premium toggle switches with smooth animations
  - Gradient buttons with hover effects and shadow depth
  - Card-based layout with hover animations
  - Status cards with gradient top borders
  - CSS variables for consistent theming
  - Responsive design for all screen sizes
  - Better visual hierarchy with proper contrast ratios

### Technical Details
- CSS custom properties (variables) for maintainable dark theme
- Splunk dashboard style overrides for seamless integration
- Notification system with slide-in animations
- Help section with numbered workflow cards

## [v1.0.11] - 2025-01-10

### Added
- **UF Grouping Visualization**: Automatically groups Universal Forwarders by role when count exceeds threshold
  - **Stacked Icon Design**: Visual representation showing multiple stacked cards for grouped UFs
  - **Count Badge**: Displays total number of UFs in each group (supports 1-1000+)
  - **Health Breakdown**: Mini-badges below each group showing count of green/yellow/red UFs
  - **Aggregate KPIs**: Group modal displays average, min, and max values for all KPIs across members
  - **Click-through Navigation**: Click group to see all members, click member to see individual KPIs
  - **Dynamic Grouping**: Automatically activates when more than 8 UFs are present (configurable)

- **Enhanced Mock Data**: Demo mode now includes 51 Universal Forwarders across 5 role categories
  - Web Servers (12 UFs)
  - App Servers (15 UFs)
  - Database (8 UFs)
  - Firewall (6 UFs)
  - Cloud (10 UFs)

### Changed
- Collection Tier now displays grouped icons instead of individual circles when many UFs present
- Connection lines from UF groups aggregate throughput from all members
- Improved scalability: Can effectively display 100-1000+ UFs without visual clutter

### Technical Details
- `groupUniversalForwarders()` function transforms UF nodes into role-based groups
- `generateGroupKPIs()` creates aggregate KPIs with min/max/avg calculations
- `showUFGroupModal()` displays two-column modal with KPIs and member list
- UF_GROUP_THRESHOLD constant controls when grouping activates (default: 8)
- CSS animations for group hover effects and critical-state badges

## [v1.0.10] - 2025-01-10

### Added
- **Settings Page**: New configuration page accessible from navigation
  - Schedule time configuration for topology discovery (cron-based)
  - Enable/disable scheduled discovery toggle
  - Discovery time range selector (1h to 7 days)
  - Run Discovery Now button for immediate execution
  - Clear KV Store Cache option
  - Health check threshold configuration
  - Default view mode selector

- **KV Store Caching**: Fast topology loading using Splunk KV Store
  - `sa_topology_nodes` collection for node data
  - `sa_topology_connections` collection for connection data
  - `sa_topology_settings` collection for user preferences
  - Sub-second load times for cached topology

- **Scheduled Discovery Searches**: Daily automatic topology discovery
  - "SA Topology - Scheduled Discovery - Nodes" (default: 2:03 AM)
  - "SA Topology - Scheduled Discovery - Connections" (default: 2:05 AM)
  - Automatic KV Store population via `outputlookup`

- **Cached View Mode**: New fastest-loading option in topology view
  - Reads pre-computed topology from KV Store
  - Helpful message when cache is empty
  - Links to Settings page for manual discovery

### Changed
- Default view mode changed from "Mock" to "Cached (Fastest)"
- Navigation updated: Added "Settings" link
- View mode dropdown: Cached (Fastest) | Live Discovery | Mock Demo

### Technical Details
- KV Store collections defined in `collections.conf`
- Lookups defined in `transforms.conf`
- Settings page uses REST API to update saved search schedules
- Discovery searches use multi-tier approach with REST APIs and internal logs

## [v1.0.9] - 2025-01-10

### Added
- **Service Analyzer Review (Tile View)**: New ITSI-style tile view page with severity-sorted tiles
  - Services sorted by severity (worst/critical at top, healthy at bottom)
  - Top 20 Services section with health score tiles
  - Top 20 KPIs section with value and severity tiles
  - Color-coded tiles matching ITSI severity colors (Critical=red, High=orange, Medium=yellow, Low=blue, Normal=green)
  - Severity filter dropdown to focus on specific severity levels
  - Sort controls for services (by severity, name, or health score)
  - Sort controls for KPIs (by severity, name, or value)
- **Navigation Update**: Added "Service Analyzer Review" as second nav item alongside "Tree View"
- **Tile Modals**: Click any tile to see detailed KPI breakdown
  - Service modal shows all KPIs with severity indicators
  - KPI modal shows threshold details and source node
- **Severity Summary Pills**: Header displays count of services at each severity level

### Technical Details
- Reuses same mock data model as Tree View for consistency
- Three new files: tile_view.xml, tile_view.js, tile_view.css
- Responsive grid layout adapts from 1-5 columns based on screen size
- Live mode discovery support (same as Tree View)

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
