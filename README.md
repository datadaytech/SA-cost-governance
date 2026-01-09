# SA-cost-governance

Splunk Supporting Add-on for Cost Governance - Provides visibility into Splunk license usage, search costs, and resource consumption across the environment.

## Overview

This app is designed to run on **Search Heads (SH/SHC)** and provides:

- **License Usage Monitoring**: Track daily/weekly/monthly license consumption
- **Search Cost Analysis**: Identify expensive searches and resource-heavy users
- **Index Cost Allocation**: Assign costs to business units/cost centers
- **Budget Management**: Set and monitor usage budgets per user
- **Alerting**: Configurable thresholds for license and search cost warnings

## Installation

1. Copy the `SA-cost-governance` folder to `$SPLUNK_HOME/etc/apps/`
2. Restart Splunk or run: `splunk restart`
3. Access via: Settings > Apps > Cost Governance

## Dashboards

| Dashboard | Description |
|-----------|-------------|
| **Cost Dashboard** | Main overview with license usage, search activity, and top consumers |
| **License Usage** | Detailed license analysis by index, sourcetype, and host |
| **Search Costs** | Running searches, scheduled search performance, heavy queries |
| **Index Allocation** | Cost center assignment and index growth trends |
| **Cost Settings** | Configure thresholds, budgets, and notifications |

## Saved Searches

| Search | Schedule | Description |
|--------|----------|-------------|
| Daily License Usage | 6 AM daily | Summary of license consumption |
| Heavy Search Alert | Every 15 min | Alerts on searches with >10M scans |
| Weekly Cost Report | 8 AM Monday | Weekly cost summary by index/user |
| Index Growth Trend | 7 AM daily | 30-day growth tracking |
| User Search Activity | 6 AM daily | Daily user search summary |

## Configuration

### Cost Settings

Edit `lookups/cost_governance_settings.csv`:

| Field | Default | Description |
|-------|---------|-------------|
| cost_per_gb | 100 | Estimated cost per GB ingested |
| warning_threshold_percent | 80 | License warning threshold |
| critical_threshold_percent | 95 | License critical threshold |
| budget_period | monthly | Budget calculation period |

### Thresholds

Edit `lookups/cost_thresholds.csv` to configure alerting thresholds.

### Index Cost Allocation

Edit `lookups/index_cost_allocation.csv` to assign indexes to cost centers.

## Requirements

- Splunk Enterprise 8.0+
- Search Head or Search Head Cluster deployment
- Access to `_internal` and `_audit` indexes
- REST API access for job monitoring

## Version History

- **1.0.0** - Initial release with core dashboards and saved searches

## License

Copyright DataDay Technology Solutions. All rights reserved.
