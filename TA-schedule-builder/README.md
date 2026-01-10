# TA-schedule-builder

A Splunk Technology Add-on that provides an enhanced cron expression builder for scheduling alerts and reports.

## Features

- **Granular Minute Selection**: Select any minute(s) from 0-59 (not just 00, 15, 30, 45)
- **Full Hour Control**: Select specific hour(s) from 0-23
- **Day of Week Selection**: Choose specific days for weekly schedules
- **Multi-Select Support**: Select multiple values for each field
- **Quick Select Buttons**: Common patterns like "Every 5 minutes", "Business Hours", "Weekdays"
- **Live Preview**: See a human-readable description of your schedule
- **One-Click Copy**: Copy the generated cron expression to clipboard

## Compatibility

- Splunk Enterprise 8.x and 9.x
- Splunk Cloud Platform
- Works with both Classic and Victoria Experience

## Installation

### On-Premises (Splunk Enterprise)

1. Download or clone this repository
2. Copy the `TA-schedule-builder` folder to `$SPLUNK_HOME/etc/apps/`
3. Restart Splunk: `$SPLUNK_HOME/bin/splunk restart`
4. Access the app from the Splunk web interface

### Splunk Cloud

1. Package the app: `tar -czvf TA-schedule-builder.tar.gz TA-schedule-builder`
2. Submit via Splunk Cloud Self-Service App Installation, or
3. Contact Splunk Support for assisted installation

## Usage

1. Navigate to the **Schedule Builder** app in Splunk
2. Click on minutes, hours, and days to toggle selection
3. Use quick-select buttons for common patterns
4. Copy the generated cron expression
5. Paste into the "Cron Expression" field when creating alerts or reports:
   - Settings > Searches, Reports, and Alerts > New Alert
   - Choose "Run on Cron Schedule"
   - Paste your expression

## Cron Expression Format

The builder generates standard 5-field cron expressions:

```
┌───────────── minute (0-59)
│ ┌───────────── hour (0-23)
│ │ ┌───────────── day of month (1-31) - always * in this builder
│ │ │ ┌───────────── month (1-12) - always * in this builder
│ │ │ │ ┌───────────── day of week (0-6, Sunday=0)
│ │ │ │ │
* * * * *
```

### Examples

| Expression | Description |
|------------|-------------|
| `0 * * * *` | Every hour at minute 0 |
| `30 9 * * 1,2,3,4,5` | 9:30 AM on weekdays |
| `0,15,30,45 * * * *` | Every 15 minutes |
| `0 8,12,17 * * *` | 8 AM, 12 PM, and 5 PM daily |
| `0 0 * * 0` | Midnight on Sundays |

## Support

For issues or feature requests, contact your Splunk administrator.

## Version History

- **1.0.0** - Initial release with minute, hour, and day-of-week selection
