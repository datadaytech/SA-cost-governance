# TA-splunk_diagnostic

A diagnostic app for **both Splunk Cloud and Splunk Enterprise** that analyzes your environment health, SVC/resource usage, scheduled search behavior, and license metrics.

## Overview

This TA runs 13 sequential diagnostic searches overnight to collect comprehensive metrics about your Splunk environment. It **automatically detects** whether it's running on Splunk Cloud or Enterprise and adapts its data sources accordingly:

| Category | Metrics Collected |
|----------|-------------------|
| **Search Inventory** | Total searches, scheduled vs ad hoc, dashboard-driven, data model acceleration |
| **SVC Consumption** | Per-search SVC, peak windows, rolling averages |
| **Schedule Quality** | Minute-of-hour distribution (skew detection), runtime vs lookback gaps |
| **User Activity** | Unique users, top querying users, search patterns |
| **License Health** | Daily usage, quota status, violations |
| **Indexing Health** | Queue depths, throughput, throttling events |
| **Storage** | Index sizes, usage percentages, internal vs metrics indexes |

## Installation

### Splunk Cloud
1. Package the app: `tar -czvf TA-splunk_diagnostic.tar.gz TA-splunk_diagnostic/`
2. Submit via Splunk Cloud Admin Console or open a support case for app vetting
3. Once installed, navigate to the app and access the dashboard

### Splunk Enterprise
1. Copy the `TA-splunk_diagnostic` folder to `$SPLUNK_HOME/etc/apps/`
2. Restart Splunk: `$SPLUNK_HOME/bin/splunk restart`
3. Navigate to the app in Splunk Web

## Configuration

### 1. Enable Scheduled Searches

All diagnostic searches are **disabled by default**. To enable:

1. Go to **Settings > Searches, reports, and alerts**
2. Filter by app: `TA-splunk_diagnostic`
3. Enable all searches starting with `diag_`

### 2. Configure Output Delivery

Edit `diag_99_finalize` to configure how results are delivered:

**Webhook:**
```ini
action.webhook = 1
action.webhook.param.url = https://your-endpoint.com/api/diagnostics
```

**Email:**
```ini
action.email = 1
action.email.to = admin@yourcompany.com, ops@yourcompany.com
action.email.subject = Splunk Environment Diagnostics Report
```

### 3. Adjust Schedule (Optional)

Default schedule runs from 2:00 AM - 3:00 AM. Modify cron expressions in `savedsearches.conf`:

| Search | Default | Cron |
|--------|---------|------|
| diag_00_initialize | 2:00 AM | `0 2 * * *` |
| diag_01 - diag_11 | 2:05 - 2:55 AM | 5-min intervals |
| diag_99_finalize | 3:00 AM | `0 3 * * *` |

### 4. Adjust Lookback Period (Optional)

Default lookback is 7 days. Modify in `macros.conf`:

```ini
[diag_earliest]
definition = -14d@d
```

## Usage

### Manual Run
1. Open the **Environment Diagnostics** dashboard
2. Click **Run Diagnostics Now**
3. Wait for all searches to complete (~5-10 minutes)
4. Download results via CSV or view in dashboard

### Scheduled Run
- Runs automatically at 2:00 AM daily (when enabled)
- Results available by 3:00 AM
- Webhook/email triggered on completion

### Access Results

**Via SPL:**
```spl
| inputlookup diagnostic_results_lookup
| where run_id="<run_id>"
```

**Via CSV Download:**
- Dashboard: Click "Download CSV" button
- Direct: `/splunkd/__raw/servicesNS/nobody/TA-splunk_diagnostic/data/lookup-table-files/diagnostic_results_export.csv`

## Environment Compatibility

The app automatically detects and adapts to your Splunk deployment type:

| Feature | Splunk Cloud | Splunk Enterprise |
|---------|--------------|-------------------|
| **SVC Data Source** | `_cmc_summary` (native SVC) | `_introspection` (estimated from CPU/runtime) |
| **Fallback** | N/A | `_internal` scheduler metrics |
| **Environment Detection** | Automatic | Automatic |

### Data Source Priority

For SVC/resource consumption metrics, the app tries data sources in this order:
1. **`_cmc_summary`** (Cloud) - Native SVC consumption data
2. **`_introspection`** (Enterprise) - Resource usage with `splunk_resource_usage` sourcetype
3. **`_internal` scheduler** (Enterprise fallback) - Estimated from run_time metrics

The `data_source` field in results indicates which source was used.

## Required Permissions

The app requires access to these indexes:

| Index | Purpose | Required |
|-------|---------|----------|
| `_internal` | Scheduler logs, search metrics, queue health | Yes (both) |
| `_audit` | User activity tracking | Yes (both) |
| `_cmc_summary` | Native SVC consumption data | Cloud only |
| `_introspection` | Resource usage monitoring | Enterprise (recommended) |

**REST API endpoints** used:
- `/services/saved/searches` - Saved search metadata
- `/services/data/indexes` - Index storage metrics
- `/services/data/models` - Data model acceleration status
- `/services/licenser/pools` - License quota information
- `/services/server/info` - Server environment info

## Output Schema

Results are stored in the `diagnostic_results` KV Store collection:

| Field | Type | Description |
|-------|------|-------------|
| `run_id` | string | Unique identifier for the diagnostic run |
| `run_time` | number | Unix timestamp when metric was collected |
| `category` | string | Metric category (svc, schedule, users, license, etc.) |
| `metric_name` | string | Specific metric identifier |
| `metric_value` | string | Primary value (search name, user, etc.) |
| `details` | string | JSON object with full metric data |
| `search_name` | string | Source saved search that collected this metric |

## Troubleshooting

### Searches Not Running
- Verify searches are enabled in Settings > Searches, reports, and alerts
- Check user has `admin` or `sc_admin` role
- Review `_internal` for scheduler errors

### Missing SVC Data (Enterprise)
- Ensure `_introspection` index is enabled: Settings > Instrumentation > Enable
- If `_introspection` is unavailable, the app falls back to scheduler-based estimates
- Check the `data_source` field in results to see which source was used

### Missing SVC Data (Cloud)
- Verify access to `_cmc_summary` index
- Contact Splunk support if index is not available

### No Results in KV Store
- Ensure `diag_00_initialize` runs first (clears/initializes)
- Check KV Store permissions in `default.meta`

### Enabling Introspection (Enterprise)
To get better resource metrics on Splunk Enterprise:
```bash
# Enable via CLI
$SPLUNK_HOME/bin/splunk enable instrumentation

# Or via web: Settings > Instrumentation > Enable
```

## Version History

- **1.1.0** - Dual-environment support
  - Added automatic Cloud vs Enterprise detection
  - SVC searches now work on both platforms
  - Enterprise uses `_introspection` with `_internal` fallback
  - Environment info captured in diagnostic metadata
  - Added `data_source` field to track metric origins

- **1.0.0** - Initial release
  - 13 diagnostic searches covering SVC, schedule, users, license, indexing, storage
  - KV Store output with CSV export
  - Dashboard with manual trigger and results viewer
  - Webhook and email delivery options

## Support

For issues or feature requests, contact your Splunk administrator or the app maintainer.
