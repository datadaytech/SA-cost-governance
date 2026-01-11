# SA Topology Analyzer - Architecture Redesign

## Research Sources
- Splunk Validated Architectures (SVA) M4/M14 Multisite documentation
- Splunk Lantern: Indexing/Search Architecture, Data Collection Architecture
- Splunk .conf23/.conf24 architecture sessions
- Enterprise deployment best practices (100k+ forwarders)

## Key Architectural Components (Per SVA)

### 1. Search Tier
- **Search Head Cluster (SHC)**: 3, 5, or 7 members (odd number for quorum)
- **Standalone Search Heads**: ES, ITSI, or dedicated app instances
- **SHC Captain**: Elected leader, coordinates searches

### 2. Indexing Tier
- **Indexer Cluster Peers**: Store and replicate data
- **Multisite Configuration**: site_replication_factor, search affinity
- **SmartStore**: Optional S3-backed storage (not visualized in topology)

### 3. Forwarding/Collection Tier
- **Universal Forwarders (UF)**: Lightweight, most common
- **Heavy Forwarders (HF)**: Used for parsing, routing, HEC
- **Intermediate Forwarders (IF)**: Optional aggregation layer
- **HTTP Event Collector (HEC)**: API-based ingestion

### 4. Management Tier (NEW - Critical Gap)
- **Cluster Manager (CM)**: Controls indexer cluster
- **SHC Deployer**: Manages search head cluster configs
- **License Manager (LM)**: Governs license pool
- **Deployment Server (DS)**: Distributes configs to forwarders
- **Monitoring Console (MC)**: Observability for the platform

## Connection Types (Per Splunk Docs)

| Type | Visual Style | Description |
|------|-------------|-------------|
| Data Flow | Solid line, green/blue | UF/HF → Indexers |
| Search Query | Dashed line, purple | SH → Indexers |
| Replication | Dotted line, orange | IDX ↔ IDX (multisite) |
| Control/Mgmt | Thin dotted, gray | CM → IDX, Deployer → SH |
| License | Very thin, gray | All → LM |

## New Layout Design

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MANAGEMENT TIER (Side Panel)                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │    CM    │ │ Deployer │ │    LM    │ │    DS    │ │    MC    │          │
│  │ (Cluster │ │  (SHC    │ │(License) │ │(Deploy   │ │(Monitor) │          │
│  │ Manager) │ │ Deployer)│ │          │ │ Server)  │ │          │          │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────────┘          │
│       │            │            │            │                              │
├───────┼────────────┼────────────┼────────────┼──────────────────────────────┤
│       │            │            │            │                              │
│       │            ▼            │            │     SEARCH TIER              │
│       │    ┌───────────────────────────┐     │                              │
│       │    │   Search Head Cluster     │     │     ┌─────────┐ ┌─────────┐ │
│       │    │  ┌────┐ ┌────┐ ┌────┐    │     │     │ SH-ES   │ │ SH-ITSI │ │
│       │    │  │SH1 │ │SH2 │ │SH3 │... │     │     │(Standal)│ │(Standal)│ │
│       │    │  │Cap │ │    │ │    │    │     │     └─────────┘ └─────────┘ │
│       │    │  └────┘ └────┘ └────┘    │     │                              │
│       │    └───────────┬───────────────┘     │                              │
│       │                │                     │                              │
│       │                ▼ (search queries)    │                              │
├───────┼────────────────┼─────────────────────┼──────────────────────────────┤
│       │                │                     │                              │
│       ▼ (control)      │                     │     INDEXING TIER            │
│  ┌─────────────────────┴─────────────────────────────────────────────────┐  │
│  │                    Indexer Cluster                                     │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │  │
│  │  │    SITE A       │  │    SITE B       │  │    SITE C       │        │  │
│  │  │ ┌───┐┌───┐┌───┐ │  │ ┌───┐┌───┐┌───┐ │  │ ┌───┐┌───┐┌───┐ │        │  │
│  │  │ │ID1││ID2││ID3│ │◄─┼─│ID4││ID5││ID6│─┼──│►│ID7││ID8││ID9│ │        │  │
│  │  │ └───┘└───┘└───┘ │  │ └───┘└───┘└───┘ │  │ └───┘└───┘└───┘ │        │  │
│  │  │ (replication)───┼──┼─(replication)───┼──┼─(replication)   │        │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘        │  │
│  └───────────────────────────────▲───────────────────────────────────────┘  │
│                                  │ (data flow)                              │
├──────────────────────────────────┼──────────────────────────────────────────┤
│                                  │                                          │
│                                  │              FORWARDING TIER (Optional)  │
│  ┌────────────────────────────┬──┴────────────────────────────────┐        │
│  │  ┌─────────┐ ┌─────────┐  │  ┌─────────┐ ┌─────────┐          │        │
│  │  │HF-Syslog│ │HF-WinEvt│  │  │HF-Cloud │ │HF-SecLog│          │        │
│  │  │ (IF)    │ │ (IF)    │  │  │ (DCN)   │ │ (IF)    │          │        │
│  │  └────┬────┘ └────┬────┘  │  └────┬────┘ └────┬────┘          │        │
│  └───────┼──────────┼────────┴───────┼──────────┼────────────────┘        │
│          │          │                │          │                          │
│          ▼          ▼                ▼          ▼                          │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                              COLLECTION TIER                                 │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐   │
│  │  Web Servers  │ │  App Servers  │ │   Databases   │ │   Firewalls   │   │
│  │   ▢▢▢▢▢ 12    │ │   ▢▢▢▢▢ 15    │ │   ▢▢▢▢ 8      │ │   ▢▢▢ 6       │   │
│  │   (UFs)       │ │   (UFs)       │ │   (UFs)       │ │   (UFs)       │   │
│  └───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘   │
│                                                                              │
│  ┌───────────────┐                                                          │
│  │    Cloud      │                DS manages all UFs ◄───────────────────   │
│  │   ▢▢▢▢ 10     │                                                          │
│  │   (UFs)       │                                                          │
│  └───────────────┘                                                          │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Visual Design Principles

### 1. Layout
- **Main Flow**: Vertical (top to bottom) - Search → Indexing → Forwarding → Collection
- **Management**: Side panel (left or collapsible) - shows control plane
- **Clusters**: Bounded boxes with internal grouping

### 2. Node Shapes (Per Component Type)
| Component | Shape | Color |
|-----------|-------|-------|
| Search Head | Rounded rectangle | Blue |
| Indexer | Rectangle | Purple |
| Heavy Forwarder | Hexagon | Orange |
| Universal Forwarder | Circle | Green |
| Cluster Manager | Diamond | Gray |
| License Manager | Diamond | Gray |
| Deployment Server | Diamond | Gray |

### 3. Health Indicators
- Border color: Green/Yellow/Red based on worst KPI
- Opacity/saturation: Indicates severity level
- Pulse animation: Critical alerts

### 4. Grouping Enhancements
- **SHC**: Single bounded box with captain indicator (star)
- **IDX Cluster Sites**: Separate bounded regions per site
- **HF Pool**: Grouped by function (Syslog, HEC, DCN)
- **UF Groups**: Stacked icons with count badges (existing)

### 5. Connection Styling
```css
/* Data Flow - Primary */
.connection-data { stroke: #65A637; stroke-width: 2px; }

/* Search Queries */
.connection-search { stroke: #7c3aed; stroke-dasharray: 5,3; }

/* Replication */
.connection-replication { stroke: #F58220; stroke-dasharray: 2,2; opacity: 0.6; }

/* Management/Control */
.connection-control { stroke: #708794; stroke-width: 1px; stroke-dasharray: 1,2; }
```

## Mock Data Structure Update

```javascript
var mockData = {
    tiers: [
        { id: 'tier_mgmt', name: 'Management', level: -1, position: 'side' },
        { id: 'tier_search', name: 'Search Tier', level: 0 },
        { id: 'tier_index', name: 'Indexing Tier', level: 1 },
        { id: 'tier_forward', name: 'Forwarding Tier', level: 2, optional: true },
        { id: 'tier_collect', name: 'Collection Tier', level: 3 }
    ],

    // Management components (NEW)
    management: [
        { id: 'cm_1', name: 'cluster-manager', type: 'cluster_manager', health: 'green',
          manages: 'idxc1', role: 'Indexer Cluster Manager' },
        { id: 'deployer_1', name: 'shc-deployer', type: 'shc_deployer', health: 'green',
          manages: 'shc1', role: 'SHC Deployer' },
        { id: 'lm_1', name: 'license-master', type: 'license_manager', health: 'green',
          role: 'License Manager' },
        { id: 'ds_1', name: 'deployment-server', type: 'deployment_server', health: 'green',
          manages: 'all_forwarders', role: 'Deployment Server' },
        { id: 'mc_1', name: 'monitoring-console', type: 'monitoring_console', health: 'green',
          role: 'Monitoring Console' }
    ],

    nodes: [...], // existing

    connections: [
        // Data flow connections
        { source: 'uf_group_web', target: 'hf_syslog_pool', type: 'data' },
        { source: 'hf_syslog_pool', target: 'idx_site_a', type: 'data' },

        // Search connections
        { source: 'shc_1', target: 'idx_cluster', type: 'search' },

        // Replication connections
        { source: 'idx_site_a', target: 'idx_site_b', type: 'replication' },
        { source: 'idx_site_b', target: 'idx_site_c', type: 'replication' },

        // Control connections
        { source: 'cm_1', target: 'idx_cluster', type: 'control' },
        { source: 'deployer_1', target: 'shc_1', type: 'control' },
        { source: 'ds_1', target: 'all_forwarders', type: 'control' }
    ]
};
```

## Implementation Phases

### Phase 1: Add Management Tier
- Add management node types and KPI definitions
- Create side panel layout for management components
- Add control connection rendering

### Phase 2: Improve Cluster Visualization
- Bounded cluster boxes for SHC and IDX cluster
- Site separation within indexer cluster
- Captain/leader indicators

### Phase 3: Connection Type Differentiation
- Implement 4 connection types with distinct styling
- Add connection legend
- Optional: toggle visibility per connection type

### Phase 4: Layout Optimization
- Responsive layout for different screen sizes
- Collapsible management panel
- Zoom to fit clusters

## Enterprise Scale Representation

For the user's environment (50,000 UFs, 153 Indexers, 7 SHC members):

```
┌─────────────────────────────────────────────────┐
│ MANAGEMENT │        SEARCH TIER                 │
│ ┌───┐      │  ┌──────────────────────┐         │
│ │CM │──────┼─►│ SHC (7 members)      │ ┌────┐  │
│ └───┘      │  │ ▢▢▢▢▢▢▢             │ │ES  │  │
│ ┌───┐      │  └──────────────────────┘ │ITSI│  │
│ │DEP│──────┼─►         │               └────┘  │
│ └───┘      │           ▼                       │
├────────────┼───────────────────────────────────┤
│            │      INDEXING TIER                │
│            │  ┌────────────────────────────┐   │
│            │  │ Indexer Cluster (153 nodes) │   │
│            │  │ ┌─────┐ ┌─────┐ ┌─────┐    │   │
│            │  │ │SiteA│ │SiteB│ │SiteC│    │   │
│            │  │ │ 51  │◄►│ 51 │◄►│ 51 │    │   │
│            │  │ └─────┘ └─────┘ └─────┘    │   │
│            │  └────────────────────────────┘   │
│            │           ▲                       │
├────────────┼───────────┼───────────────────────┤
│ ┌───┐      │      COLLECTION TIER              │
│ │DS │──────┼─►  ┌──────┴──────────────────┐   │
│ └───┘      │    │ 50,000 Universal Forwarders │ │
│            │    │ ┌────────┐ ┌────────┐ ...  │ │
│            │    │ │Servers │ │Network │      │ │
│            │    │ │ 25,000 │ │ 15,000 │      │ │
│            │    │ └────────┘ └────────┘      │ │
│            │    └────────────────────────────┘ │
└────────────┴───────────────────────────────────┘
```

## Sources

- [Splunk Validated Architectures](https://docs.splunk.com/Documentation/SVA/current/Architectures/About)
- [Multisite Indexer Cluster Architecture](https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Multisitearchitecture)
- [Data Collection Architecture - Splunk Lantern](https://lantern.splunk.com/Splunk_Success_Framework/Platform_Management/Data_collection_architecture)
- [Indexing and Search Architecture - Splunk Lantern](https://lantern.splunk.com/Splunk_Success_Framework/Platform_Management/Indexing_and_search_architecture)
- [Forwarder Deployment Topologies](https://docs.splunk.com/Documentation/Splunk/latest/Forwarding/Forwarderdeploymenttopologies)
- [ITSI Service Analyzer Tree View](https://help.splunk.com/en/splunk-it-service-intelligence/splunk-it-service-intelligence/visualize-and-assess-service-health/4.18/service-analyzer/use-the-service-analyzer-tree-view-in-itsi)
