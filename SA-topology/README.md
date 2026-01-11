# SA Topology Analyzer

A Splunk app that provides dynamic topology visualization of your Splunk infrastructure, similar to ITSI's Service Analyzer Treeview.

## Version

**v1.0.0** - Initial Release

## Overview

SA Topology Analyzer automatically discovers and visualizes:

- **Search Heads** - Your Splunk search head(s) at the top of the hierarchy
- **Indexes** - All enabled indexes with data volume information
- **Universal Forwarders** - All UFs sending data, mapped to their destination indexes

The visualization shows real-time health status using a familiar traffic light system:

| Color | Status | Meaning |
|-------|--------|---------|
| 🟢 Green | Healthy | Component is operating normally |
| 🟡 Yellow | Warning | Component may need attention |
| 🔴 Red | Critical | Component has issues |

## Features

- **Dynamic Topology Tree** - Automatically builds hierarchy from internal logs
- **Health Monitoring** - Mock health indicators (ready for real metrics integration)
- **Interactive Visualization** - Click nodes to expand/collapse and view details
- **Zoom & Pan** - Navigate large topologies with ease
- **Responsive Design** - Works on different screen sizes
- **Splunk Cloud Compatible** - Designed to pass AppInspect

## Installation

### Manual Installation

1. Download or clone this repository
2. Copy the `sa-topology` folder to `$SPLUNK_HOME/etc/apps/`
3. Restart Splunk (or restart the container if using Docker)

```bash
# Example for on-premise
cp -r sa-topology $SPLUNK_HOME/etc/apps/

# Restart Splunk
$SPLUNK_HOME/bin/splunk restart
```

### Docker Installation

```bash
# Copy to container
docker cp sa-topology splunk:/opt/splunk/etc/apps/

# Restart container
docker restart splunk
```

## Usage

1. Navigate to the app: **Apps** → **SA Topology Analyzer**
2. The topology view loads automatically
3. Use the dropdown to switch between:
   - **Mock Demo** - Shows sample topology data
   - **Live Data** - Queries actual internal logs

### View Modes

- **Mock Demo**: Demonstrates the visualization with sample data
- **Live Data**: Queries `_internal` index for real forwarder connections

### Interacting with Nodes

- **Click** a node to view details in the side panel
- **Hover** over nodes to highlight them
- **Scroll** to zoom in/out
- **Drag** to pan the view

## Architecture

```
Search Head (SH)
    └── Indexes
        ├── main
        │   ├── web-server-01 (UF)
        │   └── web-server-02 (UF)
        ├── _internal
        │   └── firewall-01 (UF)
        └── _metrics
            └── monitoring-agent-01 (UF)
```

## File Structure

```
sa-topology/
├── default/
│   ├── app.conf              # App configuration
│   ├── web.conf              # Web settings
│   ├── savedsearches.conf    # Saved SPL searches
│   └── data/ui/
│       ├── nav/default.xml   # Navigation menu
│       └── views/
│           └── topology.xml  # Main dashboard
├── appserver/static/
│   ├── topology_viz.js       # D3.js visualization
│   └── topology.css          # Stylesheet
├── metadata/
│   └── default.meta          # Permissions
└── README.md
```

## Key SPL Searches

### Universal Forwarder Discovery

```spl
index=_internal sourcetype=splunkd group=tcpin_connections
| stats latest(version) as version,
        sum(kb) as total_kb,
        latest(_time) as last_seen
        by hostname
| eval health=case(
    last_seen > relative_time(now(), "-15m"), "green",
    last_seen > relative_time(now(), "-1h"), "yellow",
    1=1, "red")
```

### Index Discovery

```spl
| rest /services/data/indexes
| search disabled=0
| eval size_gb=round(currentDBSizeMB/1024, 2)
| eval health=if(currentDBSizeMB>0, "green", "yellow")
```

## Customization

### Adding Real Health Metrics

To integrate real health metrics, modify the `health` field calculations in `savedsearches.conf`:

```spl
| eval health=case(
    cpu_usage > 90, "red",
    cpu_usage > 70, "yellow",
    1=1, "green")
```

### Changing Colors

Edit the color configuration in `topology_viz.js`:

```javascript
var CONFIG = {
    colors: {
        green: '#65A637',
        yellow: '#F8BE34',
        red: '#DC4E41'
    }
};
```

## Requirements

- Splunk Enterprise 8.x or later
- Access to `_internal` index (for live data mode)
- `rest` command capability (admin or power user)
- D3.js v7 (loaded from CDN)

## Known Limitations

1. **Mock Data Default**: Currently defaults to mock data for demonstration
2. **Cluster Support**: Indexer cluster peer discovery requires cluster master access
3. **Large Deployments**: Performance may degrade with 1000+ forwarders

## Roadmap

- [ ] Real-time health metric integration
- [ ] Drilldown to component details
- [ ] Export topology as image/PDF
- [ ] Alert integration for health changes
- [ ] Heavy Forwarder support
- [ ] Deployment Server integration

## Changelog

### v1.0.0 (2025-01-10)
- Initial release
- Mock topology visualization
- UF discovery from internal logs
- Index discovery via REST API
- Health status indicators (mock)

## Author

**DataDay Technology Solutions**

## License

Proprietary - For internal use only

---

*This app is inspired by Splunk ITSI's Service Analyzer but is not affiliated with or endorsed by Splunk, Inc.*
