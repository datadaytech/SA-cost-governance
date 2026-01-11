/**
 * SA Topology Analyzer - Tile View
 * ITSI-style Service Analyzer with tiles sorted by severity (worst first)
 *
 * @version 1.0.0
 * @author DataDay Technology Solutions
 */

require([
    'jquery',
    'underscore',
    'splunkjs/mvc',
    'splunkjs/mvc/searchmanager',
    'splunkjs/mvc/simplexml/ready!'
], function($, _, mvc, SearchManager) {
    'use strict';

    console.log('SA Tile View: Script loaded');

    // Get tokens
    var tokens = mvc.Components.get('default');
    var viewMode = tokens.get('view_mode') || 'mock';
    var minSeverity = tokens.get('min_severity') || 'all';

    // ITSI-style severity colors (5 levels)
    var severityColors = {
        critical: '#DC4E41',  // Red
        high: '#F58220',      // Orange
        medium: '#F8BE34',    // Yellow
        low: '#6BA4B8',       // Blue
        normal: '#65A637',    // Green
        unknown: '#708794'    // Gray
    };

    // Severity order for sorting (worst first)
    var severityOrder = {
        critical: 0,
        high: 1,
        medium: 2,
        low: 3,
        normal: 4,
        unknown: 5
    };

    // Map simple health to severity
    var healthToSeverity = {
        red: 'critical',
        yellow: 'medium',
        green: 'normal'
    };

    // Generate random sparkline data (24 data points for 24 hours)
    function generateSparklineData(baseValue, variance, trend) {
        var data = [];
        var value = baseValue;
        for (var i = 0; i < 24; i++) {
            value = value + (Math.random() - 0.5) * variance + trend;
            value = Math.max(0, Math.min(100, value));
            data.push(value);
        }
        return data;
    }

    // KPI definitions by node type
    var kpiDefinitions = {
        universal_forwarder: [
            { id: 'events_per_sec', name: 'Events/sec', unit: 'eps', thresholds: { critical: 0, high: 10, medium: 50, low: 100 }, inverse: true },
            { id: 'queue_fill', name: 'Queue Fill %', unit: '%', thresholds: { critical: 90, high: 80, medium: 60, low: 40 }, inverse: false },
            { id: 'cpu_usage', name: 'CPU Usage', unit: '%', thresholds: { critical: 95, high: 85, medium: 70, low: 50 }, inverse: false },
            { id: 'memory_usage', name: 'Memory Usage', unit: '%', thresholds: { critical: 95, high: 85, medium: 70, low: 50 }, inverse: false },
            { id: 'connection_status', name: 'Connection Health', unit: '%', thresholds: { critical: 50, high: 70, medium: 85, low: 95 }, inverse: true }
        ],
        heavy_forwarder: [
            { id: 'events_per_sec', name: 'Events/sec', unit: 'eps', thresholds: { critical: 0, high: 100, medium: 500, low: 1000 }, inverse: true },
            { id: 'parse_queue', name: 'Parse Queue %', unit: '%', thresholds: { critical: 90, high: 80, medium: 60, low: 40 }, inverse: false },
            { id: 'tcp_out_queue', name: 'TCP Out Queue %', unit: '%', thresholds: { critical: 90, high: 80, medium: 60, low: 40 }, inverse: false },
            { id: 'indexer_ack_time', name: 'Indexer Ack Time', unit: 'ms', thresholds: { critical: 5000, high: 2000, medium: 1000, low: 500 }, inverse: false },
            { id: 'cpu_usage', name: 'CPU Usage', unit: '%', thresholds: { critical: 95, high: 85, medium: 70, low: 50 }, inverse: false },
            { id: 'memory_usage', name: 'Memory Usage', unit: '%', thresholds: { critical: 95, high: 85, medium: 70, low: 50 }, inverse: false }
        ],
        indexer: [
            { id: 'events_per_sec', name: 'Events/sec', unit: 'eps', thresholds: { critical: 0, high: 500, medium: 2000, low: 5000 }, inverse: true },
            { id: 'index_latency', name: 'Index Latency', unit: 'ms', thresholds: { critical: 10000, high: 5000, medium: 2000, low: 1000 }, inverse: false },
            { id: 'disk_usage', name: 'Disk Usage', unit: '%', thresholds: { critical: 95, high: 85, medium: 70, low: 50 }, inverse: false },
            { id: 'bucket_count', name: 'Hot Buckets', unit: '', thresholds: { critical: 50, high: 30, medium: 20, low: 10 }, inverse: false },
            { id: 'replication_factor', name: 'Replication Health', unit: '%', thresholds: { critical: 50, high: 70, medium: 85, low: 95 }, inverse: true },
            { id: 'search_factor', name: 'Search Factor Health', unit: '%', thresholds: { critical: 50, high: 70, medium: 85, low: 95 }, inverse: true }
        ],
        search_head: [
            { id: 'concurrent_searches', name: 'Concurrent Searches', unit: '', thresholds: { critical: 50, high: 40, medium: 25, low: 15 }, inverse: false },
            { id: 'avg_search_time', name: 'Avg Search Time', unit: 's', thresholds: { critical: 300, high: 120, medium: 60, low: 30 }, inverse: false },
            { id: 'scheduled_searches', name: 'Scheduled Searches', unit: '', thresholds: { critical: 100, high: 75, medium: 50, low: 25 }, inverse: false },
            { id: 'skipped_searches', name: 'Skipped Searches', unit: '%', thresholds: { critical: 20, high: 10, medium: 5, low: 2 }, inverse: false },
            { id: 'cpu_usage', name: 'CPU Usage', unit: '%', thresholds: { critical: 95, high: 85, medium: 70, low: 50 }, inverse: false },
            { id: 'memory_usage', name: 'Memory Usage', unit: '%', thresholds: { critical: 95, high: 85, medium: 70, low: 50 }, inverse: false }
        ],
        search_head_cluster: [
            { id: 'concurrent_searches', name: 'Concurrent Searches', unit: '', thresholds: { critical: 50, high: 40, medium: 25, low: 15 }, inverse: false },
            { id: 'avg_search_time', name: 'Avg Search Time', unit: 's', thresholds: { critical: 300, high: 120, medium: 60, low: 30 }, inverse: false },
            { id: 'bundle_replication', name: 'Bundle Replication', unit: '%', thresholds: { critical: 50, high: 70, medium: 85, low: 95 }, inverse: true },
            { id: 'captain_stability', name: 'Captain Stability', unit: '%', thresholds: { critical: 50, high: 70, medium: 85, low: 95 }, inverse: true },
            { id: 'cpu_usage', name: 'CPU Usage', unit: '%', thresholds: { critical: 95, high: 85, medium: 70, low: 50 }, inverse: false },
            { id: 'shc_member_count', name: 'Active Members', unit: '', thresholds: { critical: 1, high: 2, medium: 2, low: 3 }, inverse: true }
        ]
    };

    // Generate mock KPI values for a node based on its health
    function generateNodeKPIs(node) {
        var definitions = kpiDefinitions[node.type] || kpiDefinitions.universal_forwarder;
        var kpis = [];
        var healthBias = node.health === 'green' ? 0.8 : (node.health === 'yellow' ? 0.5 : 0.2);

        definitions.forEach(function(def) {
            var value, severity;
            var random = Math.random();

            if (def.inverse) {
                if (random < healthBias) {
                    value = def.thresholds.low + Math.random() * (100 - def.thresholds.low);
                    severity = 'normal';
                } else if (random < healthBias + 0.15) {
                    value = def.thresholds.medium + Math.random() * (def.thresholds.low - def.thresholds.medium);
                    severity = 'low';
                } else {
                    value = Math.random() * def.thresholds.medium;
                    severity = random < healthBias + 0.25 ? 'medium' : (random < healthBias + 0.35 ? 'high' : 'critical');
                }
            } else {
                if (random < healthBias) {
                    value = Math.random() * def.thresholds.low;
                    severity = 'normal';
                } else if (random < healthBias + 0.15) {
                    value = def.thresholds.low + Math.random() * (def.thresholds.medium - def.thresholds.low);
                    severity = 'low';
                } else {
                    value = def.thresholds.medium + Math.random() * (def.thresholds.critical - def.thresholds.medium);
                    severity = random < healthBias + 0.25 ? 'medium' : (random < healthBias + 0.35 ? 'high' : 'critical');
                }
            }

            var trend = severity === 'normal' ? 0 : (severity === 'critical' ? 2 : 0.5);
            if (def.inverse) trend = -trend;

            kpis.push({
                id: def.id,
                name: def.name,
                value: Math.round(value * 10) / 10,
                unit: def.unit,
                severity: severity,
                sparkline: generateSparklineData(value, 10, trend),
                thresholds: def.thresholds,
                inverse: def.inverse,
                nodeId: node.id,
                nodeName: node.name
            });
        });

        return kpis;
    }

    // Calculate overall health score (0-100, 100 = healthy)
    function calculateHealthScore(kpis) {
        if (!kpis || kpis.length === 0) return 100;

        var weights = { critical: 0, high: 25, medium: 50, low: 75, normal: 100 };
        var totalScore = 0;

        kpis.forEach(function(kpi) {
            totalScore += weights[kpi.severity] || 100;
        });

        return Math.round(totalScore / kpis.length);
    }

    // Get overall severity from health score
    function getOverallSeverity(healthScore) {
        if (healthScore >= 80) return 'normal';
        if (healthScore >= 60) return 'low';
        if (healthScore >= 40) return 'medium';
        if (healthScore >= 20) return 'high';
        return 'critical';
    }

    // Mock data - same as tree view
    var mockData = {
        nodes: [
            // Search Head Cluster
            { id: 'shc_member_1', name: 'sh-cluster-01', type: 'search_head_cluster', tier: 0, health: 'green', cluster: 'shc1', role: 'SHC Captain' },
            { id: 'shc_member_2', name: 'sh-cluster-02', type: 'search_head_cluster', tier: 0, health: 'green', cluster: 'shc1', role: 'SHC Member' },
            { id: 'shc_member_3', name: 'sh-cluster-03', type: 'search_head_cluster', tier: 0, health: 'green', cluster: 'shc1', role: 'SHC Member' },
            { id: 'sh_standalone', name: 'sh-standalone-01', type: 'search_head', tier: 0, health: 'green', role: 'Standalone SH' },

            // Indexer Cluster
            { id: 'idx_1', name: 'indexer-01', type: 'indexer', tier: 1, health: 'green', cluster: 'idxc1', role: 'Peer Node' },
            { id: 'idx_2', name: 'indexer-02', type: 'indexer', tier: 1, health: 'green', cluster: 'idxc1', role: 'Peer Node' },
            { id: 'idx_3', name: 'indexer-03', type: 'indexer', tier: 1, health: 'yellow', cluster: 'idxc1', role: 'Peer Node' },
            { id: 'idx_4', name: 'indexer-04', type: 'indexer', tier: 1, health: 'green', cluster: 'idxc1', role: 'Peer Node' },

            // Heavy Forwarders
            { id: 'hf_1', name: 'hf-datacenter-01', type: 'heavy_forwarder', tier: 2, health: 'green', role: 'Aggregation' },
            { id: 'hf_2', name: 'hf-datacenter-02', type: 'heavy_forwarder', tier: 2, health: 'green', role: 'Aggregation' },
            { id: 'hf_3', name: 'hf-cloud-01', type: 'heavy_forwarder', tier: 2, health: 'yellow', role: 'Cloud Ingestion' },

            // Universal Forwarders
            { id: 'uf_1', name: 'web-prod-01', type: 'universal_forwarder', tier: 3, health: 'green', role: 'Web Server' },
            { id: 'uf_2', name: 'web-prod-02', type: 'universal_forwarder', tier: 3, health: 'green', role: 'Web Server' },
            { id: 'uf_3', name: 'web-prod-03', type: 'universal_forwarder', tier: 3, health: 'green', role: 'Web Server' },
            { id: 'uf_4', name: 'app-prod-01', type: 'universal_forwarder', tier: 3, health: 'green', role: 'App Server' },
            { id: 'uf_5', name: 'app-prod-02', type: 'universal_forwarder', tier: 3, health: 'yellow', role: 'App Server' },
            { id: 'uf_6', name: 'db-prod-01', type: 'universal_forwarder', tier: 3, health: 'green', role: 'Database' },
            { id: 'uf_7', name: 'fw-edge-01', type: 'universal_forwarder', tier: 3, health: 'green', role: 'Firewall' },
            { id: 'uf_8', name: 'fw-edge-02', type: 'universal_forwarder', tier: 3, health: 'red', role: 'Firewall' },
            { id: 'uf_9', name: 'aws-lambda-collector', type: 'universal_forwarder', tier: 3, health: 'green', role: 'Cloud Lambda' },
            { id: 'uf_10', name: 'azure-vm-collector', type: 'universal_forwarder', tier: 3, health: 'green', role: 'Cloud VM' }
        ]
    };

    // Pre-generate KPIs for all nodes
    mockData.nodes.forEach(function(node) {
        node.kpis = generateNodeKPIs(node);
        node.healthScore = calculateHealthScore(node.kpis);
        node.severity = getOverallSeverity(node.healthScore);
    });

    // Type labels
    var typeLabels = {
        search_head_cluster: 'Search Head Cluster',
        search_head: 'Search Head',
        indexer: 'Indexer',
        heavy_forwarder: 'Heavy Forwarder',
        universal_forwarder: 'Universal Forwarder'
    };

    // Sort services by severity (worst first)
    function sortBySeverity(items) {
        return items.slice().sort(function(a, b) {
            var severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
            if (severityDiff !== 0) return severityDiff;
            return a.healthScore - b.healthScore;
        });
    }

    // Sort KPIs by severity (worst first)
    function sortKPIsBySeverity(kpis) {
        return kpis.slice().sort(function(a, b) {
            var severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
            if (severityDiff !== 0) return severityDiff;
            return a.value - b.value;
        });
    }

    // Filter by minimum severity
    function filterBySeverity(items, minSev) {
        if (minSev === 'all') return items;
        var minOrder = severityOrder[minSev];
        return items.filter(function(item) {
            return severityOrder[item.severity] <= minOrder;
        });
    }

    // Update severity counts in header
    function updateSeverityCounts(services) {
        var counts = { critical: 0, high: 0, medium: 0, low: 0, normal: 0 };
        services.forEach(function(s) {
            if (counts.hasOwnProperty(s.severity)) {
                counts[s.severity]++;
            }
        });

        $('#count-critical').text(counts.critical);
        $('#count-high').text(counts.high);
        $('#count-medium').text(counts.medium);
        $('#count-low').text(counts.low);
        $('#count-normal').text(counts.normal);
    }

    // Create a service tile
    function createServiceTile(service) {
        var color = severityColors[service.severity] || severityColors.unknown;
        var textColor = service.severity === 'medium' || service.severity === 'low' ? '#333' : '#fff';

        var $tile = $('<div class="service-tile"></div>').css({
            background: color,
            borderRadius: '8px',
            padding: '16px',
            cursor: 'pointer',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            position: 'relative',
            minHeight: '120px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
        });

        // Health score (large number)
        var $score = $('<div class="tile-score"></div>').text(service.healthScore).css({
            fontSize: '36px',
            fontWeight: '700',
            color: textColor,
            lineHeight: '1'
        });

        // Service name
        var $name = $('<div class="tile-name"></div>').text(service.name).css({
            fontSize: '13px',
            fontWeight: '600',
            color: textColor,
            marginTop: '8px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
        });

        // Type label
        var $type = $('<div class="tile-type"></div>').text(typeLabels[service.type] || service.type).css({
            fontSize: '11px',
            color: textColor,
            opacity: 0.8,
            marginTop: '4px'
        });

        // Severity badge
        var $severity = $('<div class="tile-severity"></div>').text(service.severity.toUpperCase()).css({
            position: 'absolute',
            top: '8px',
            right: '8px',
            fontSize: '9px',
            fontWeight: '700',
            color: textColor,
            background: 'rgba(0,0,0,0.2)',
            padding: '2px 6px',
            borderRadius: '4px',
            textTransform: 'uppercase'
        });

        $tile.append($score);
        $tile.append($name);
        $tile.append($type);
        $tile.append($severity);

        // Hover effects
        $tile.on('mouseenter', function() {
            $(this).css({
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.25)'
            });
        }).on('mouseleave', function() {
            $(this).css({
                transform: 'translateY(0)',
                boxShadow: 'none'
            });
        });

        // Click handler - show modal
        $tile.on('click', function() {
            showServiceModal(service);
        });

        return $tile;
    }

    // Create a KPI tile
    function createKPITile(kpi) {
        var color = severityColors[kpi.severity] || severityColors.unknown;
        var textColor = kpi.severity === 'medium' || kpi.severity === 'low' ? '#333' : '#fff';

        var $tile = $('<div class="kpi-tile"></div>').css({
            background: color,
            borderRadius: '8px',
            padding: '14px',
            cursor: 'pointer',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            position: 'relative',
            minHeight: '100px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
        });

        // KPI value
        var $value = $('<div class="tile-value"></div>').text(kpi.value + ' ' + kpi.unit).css({
            fontSize: '24px',
            fontWeight: '700',
            color: textColor,
            lineHeight: '1'
        });

        // KPI name
        var $name = $('<div class="tile-kpi-name"></div>').text(kpi.name).css({
            fontSize: '12px',
            fontWeight: '600',
            color: textColor,
            marginTop: '8px'
        });

        // Source node
        var $source = $('<div class="tile-source"></div>').text(kpi.nodeName).css({
            fontSize: '10px',
            color: textColor,
            opacity: 0.8,
            marginTop: '4px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
        });

        // Severity badge
        var $severity = $('<div class="tile-severity"></div>').text(kpi.severity.toUpperCase()).css({
            position: 'absolute',
            top: '8px',
            right: '8px',
            fontSize: '9px',
            fontWeight: '700',
            color: textColor,
            background: 'rgba(0,0,0,0.2)',
            padding: '2px 6px',
            borderRadius: '4px'
        });

        $tile.append($value);
        $tile.append($name);
        $tile.append($source);
        $tile.append($severity);

        // Hover effects
        $tile.on('mouseenter', function() {
            $(this).css({
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.25)'
            });
        }).on('mouseleave', function() {
            $(this).css({
                transform: 'translateY(0)',
                boxShadow: 'none'
            });
        });

        // Click handler
        $tile.on('click', function() {
            showKPIModal(kpi);
        });

        return $tile;
    }

    // Show service detail modal
    function showServiceModal(service) {
        // Remove existing modal
        $('#tile-modal-overlay').remove();

        var $overlay = $('<div id="tile-modal-overlay"></div>').css({
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.7)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        });

        var borderColor = severityColors[service.severity] || severityColors.unknown;

        var $modal = $('<div id="tile-modal"></div>').css({
            background: '#1a1a2e',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            width: '600px',
            maxHeight: '80vh',
            overflow: 'hidden',
            border: '3px solid ' + borderColor
        });

        // Header
        var $header = $('<div class="modal-header"></div>').css({
            padding: '20px 24px',
            borderBottom: '1px solid #2d3748',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            background: borderColor
        });

        var textColor = service.severity === 'medium' || service.severity === 'low' ? '#333' : '#fff';

        var $titleSection = $('<div></div>');
        $titleSection.append($('<h2></h2>').text(service.name).css({
            margin: 0,
            color: textColor,
            fontSize: '20px',
            fontWeight: '600'
        }));
        $titleSection.append($('<div></div>').text(typeLabels[service.type] + ' - ' + service.role).css({
            color: textColor,
            opacity: 0.9,
            fontSize: '13px',
            marginTop: '4px'
        }));

        var $healthScore = $('<div></div>').css({
            textAlign: 'center'
        });
        $healthScore.append($('<div></div>').text(service.healthScore).css({
            fontSize: '36px',
            fontWeight: '700',
            color: textColor,
            lineHeight: '1'
        }));
        $healthScore.append($('<div></div>').text('Health Score').css({
            fontSize: '11px',
            color: textColor,
            opacity: 0.8
        }));

        $header.append($titleSection);
        $header.append($healthScore);

        // Close button
        var $closeBtn = $('<button>&times;</button>').css({
            position: 'absolute',
            top: '12px',
            right: '16px',
            background: 'none',
            border: 'none',
            color: textColor,
            fontSize: '24px',
            cursor: 'pointer',
            padding: '4px 8px'
        }).on('click', function() {
            $overlay.remove();
        });

        // Body - KPI list
        var $body = $('<div class="modal-body"></div>').css({
            padding: '16px 24px',
            maxHeight: '50vh',
            overflowY: 'auto'
        });

        var $kpiList = $('<div class="kpi-list"></div>');

        service.kpis.forEach(function(kpi, index) {
            var $row = $('<div class="kpi-row"></div>').css({
                display: 'flex',
                alignItems: 'center',
                padding: '12px 16px',
                background: index % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                borderRadius: '6px',
                marginBottom: '4px'
            });

            // Severity bar
            var $severity = $('<div></div>').css({
                width: '6px',
                height: '40px',
                borderRadius: '3px',
                background: severityColors[kpi.severity],
                marginRight: '16px'
            });

            // Info
            var $info = $('<div></div>').css({ flex: 1 });
            $info.append($('<div></div>').text(kpi.name).css({
                color: '#e2e8f0',
                fontSize: '14px',
                fontWeight: '500'
            }));
            $info.append($('<div></div>').text(kpi.severity.toUpperCase()).css({
                color: severityColors[kpi.severity],
                fontSize: '11px',
                fontWeight: '600',
                marginTop: '2px'
            }));

            // Value
            var $value = $('<div></div>').text(kpi.value + ' ' + kpi.unit).css({
                color: '#e2e8f0',
                fontSize: '16px',
                fontWeight: '600',
                textAlign: 'right',
                width: '100px'
            });

            $row.append($severity);
            $row.append($info);
            $row.append($value);
            $kpiList.append($row);
        });

        $body.append($kpiList);

        // Footer
        var $footer = $('<div class="modal-footer"></div>').css({
            padding: '16px 24px',
            borderTop: '1px solid #2d3748',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        });

        $footer.append($('<span></span>').text('Last updated: ' + new Date().toLocaleTimeString()).css({
            color: '#8892b0',
            fontSize: '12px'
        }));

        var $treeBtn = $('<button>View in Tree</button>').css({
            background: '#6495ED',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 16px',
            fontSize: '13px',
            cursor: 'pointer',
            fontWeight: '500'
        }).on('click', function() {
            window.location.href = '/app/sa-topology/topology';
        });

        $footer.append($treeBtn);

        // Assemble modal
        $modal.append($closeBtn);
        $modal.append($header);
        $modal.append($body);
        $modal.append($footer);
        $overlay.append($modal);
        $('body').append($overlay);

        // Close on overlay click
        $overlay.on('click', function(e) {
            if (e.target === this) {
                $overlay.remove();
            }
        });

        // Close on ESC
        $(document).on('keydown.tileModal', function(e) {
            if (e.keyCode === 27) {
                $overlay.remove();
                $(document).off('keydown.tileModal');
            }
        });
    }

    // Show KPI detail modal
    function showKPIModal(kpi) {
        $('#tile-modal-overlay').remove();

        var $overlay = $('<div id="tile-modal-overlay"></div>').css({
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.7)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        });

        var borderColor = severityColors[kpi.severity] || severityColors.unknown;
        var textColor = kpi.severity === 'medium' || kpi.severity === 'low' ? '#333' : '#fff';

        var $modal = $('<div id="tile-modal"></div>').css({
            background: '#1a1a2e',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            width: '400px',
            overflow: 'hidden',
            border: '3px solid ' + borderColor
        });

        // Header
        var $header = $('<div></div>').css({
            padding: '20px 24px',
            background: borderColor,
            textAlign: 'center'
        });

        $header.append($('<div></div>').text(kpi.value + ' ' + kpi.unit).css({
            fontSize: '42px',
            fontWeight: '700',
            color: textColor
        }));
        $header.append($('<div></div>').text(kpi.name).css({
            fontSize: '16px',
            fontWeight: '600',
            color: textColor,
            marginTop: '8px'
        }));
        $header.append($('<div></div>').text(kpi.severity.toUpperCase()).css({
            fontSize: '12px',
            fontWeight: '700',
            color: textColor,
            opacity: 0.9,
            marginTop: '4px'
        }));

        // Body
        var $body = $('<div></div>').css({
            padding: '20px 24px'
        });

        var details = [
            { label: 'Source', value: kpi.nodeName },
            { label: 'Critical Threshold', value: kpi.thresholds.critical + ' ' + kpi.unit },
            { label: 'High Threshold', value: kpi.thresholds.high + ' ' + kpi.unit },
            { label: 'Medium Threshold', value: kpi.thresholds.medium + ' ' + kpi.unit },
            { label: 'Low Threshold', value: kpi.thresholds.low + ' ' + kpi.unit }
        ];

        details.forEach(function(d) {
            var $row = $('<div></div>').css({
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: '1px solid #2d3748'
            });
            $row.append($('<span></span>').text(d.label).css({ color: '#8892b0', fontSize: '13px' }));
            $row.append($('<span></span>').text(d.value).css({ color: '#e2e8f0', fontSize: '13px', fontWeight: '500' }));
            $body.append($row);
        });

        // Close button
        var $closeBtn = $('<button>&times;</button>').css({
            position: 'absolute',
            top: '8px',
            right: '12px',
            background: 'none',
            border: 'none',
            color: textColor,
            fontSize: '24px',
            cursor: 'pointer'
        }).on('click', function() {
            $overlay.remove();
        });

        $modal.append($closeBtn);
        $modal.append($header);
        $modal.append($body);
        $overlay.append($modal);
        $('body').append($overlay);

        $overlay.on('click', function(e) {
            if (e.target === this) {
                $overlay.remove();
            }
        });

        $(document).on('keydown.tileModal', function(e) {
            if (e.keyCode === 27) {
                $overlay.remove();
                $(document).off('keydown.tileModal');
            }
        });
    }

    // Render tiles
    function renderTiles(data) {
        console.log('SA Tile View: Rendering', data.nodes.length, 'services');

        var currentMinSeverity = tokens.get('min_severity') || 'all';

        // Get filtered and sorted services
        var services = filterBySeverity(data.nodes, currentMinSeverity);
        services = sortBySeverity(services);
        services = services.slice(0, 20); // Top 20

        // Update severity counts (before filtering)
        updateSeverityCounts(data.nodes);

        // Render service tiles
        var $servicesContainer = $('#services-container');
        $servicesContainer.empty();

        if (services.length === 0) {
            $servicesContainer.html('<div class="no-data">No services match the current filter</div>');
        } else {
            services.forEach(function(service) {
                $servicesContainer.append(createServiceTile(service));
            });
        }

        // Collect all KPIs from all nodes
        var allKPIs = [];
        data.nodes.forEach(function(node) {
            if (node.kpis) {
                allKPIs = allKPIs.concat(node.kpis);
            }
        });

        // Filter and sort KPIs
        var kpis = filterBySeverity(allKPIs, currentMinSeverity);
        kpis = sortKPIsBySeverity(kpis);
        kpis = kpis.slice(0, 20); // Top 20

        // Render KPI tiles
        var $kpisContainer = $('#kpis-container');
        $kpisContainer.empty();

        if (kpis.length === 0) {
            $kpisContainer.html('<div class="no-data">No KPIs match the current filter</div>');
        } else {
            kpis.forEach(function(kpi) {
                $kpisContainer.append(createKPITile(kpi));
            });
        }
    }

    // Live topology discovery
    function discoverLiveTopology(callback) {
        console.log('SA Tile View: Discovering live topology...');

        var liveData = { nodes: [] };
        var discoveryComplete = { serverInfo: false, peers: false, forwarders: false };

        function checkComplete() {
            if (discoveryComplete.serverInfo && discoveryComplete.peers && discoveryComplete.forwarders) {
                liveData.nodes.forEach(function(node) {
                    node.kpis = generateNodeKPIs(node);
                    node.healthScore = calculateHealthScore(node.kpis);
                    node.severity = getOverallSeverity(node.healthScore);
                });
                console.log('SA Tile View: Live discovery complete', liveData);
                callback(liveData);
            }
        }

        // Server info search
        var serverInfoSearch = new SearchManager({
            id: 'tileServerInfo_' + Date.now(),
            search: '| rest /services/server/info | head 1 | table serverName, version, server_roles',
            earliest_time: '-1m',
            latest_time: 'now',
            autostart: true
        });

        serverInfoSearch.data('results').on('data', function(results) {
            if (results.hasData()) {
                var rows = results.data().rows;
                if (rows && rows.length > 0) {
                    liveData.nodes.push({
                        id: 'sh_current',
                        name: rows[0][0] || 'search-head',
                        type: 'search_head',
                        tier: 0,
                        health: 'green',
                        role: 'Current Instance'
                    });
                }
            }
            discoveryComplete.serverInfo = true;
            checkComplete();
        });

        // Peers search
        var peersSearch = new SearchManager({
            id: 'tilePeers_' + Date.now(),
            search: '| rest /services/search/distributed/peers | table peerName, status | head 20',
            earliest_time: '-1m',
            latest_time: 'now',
            autostart: true
        });

        peersSearch.data('results').on('data', function(results) {
            if (results.hasData()) {
                var rows = results.data().rows;
                rows.forEach(function(row, i) {
                    liveData.nodes.push({
                        id: 'idx_' + (i + 1),
                        name: row[0] || 'indexer-' + (i + 1),
                        type: 'indexer',
                        tier: 1,
                        health: row[1] === 'Up' ? 'green' : 'yellow',
                        cluster: 'idxc1',
                        role: 'Peer Node'
                    });
                });
            }
            discoveryComplete.peers = true;
            checkComplete();
        });

        // Forwarders search
        var forwardersSearch = new SearchManager({
            id: 'tileForwarders_' + Date.now(),
            search: 'index=_internal sourcetype=splunkd group=tcpin_connections earliest=-1h | stats latest(fwdType) as fwdType by hostname | head 20',
            earliest_time: '-1h',
            latest_time: 'now',
            autostart: true
        });

        forwardersSearch.data('results').on('data', function(results) {
            if (results.hasData()) {
                var rows = results.data().rows;
                var hfCount = 0;
                var ufCount = 0;
                rows.forEach(function(row) {
                    var hostname = row[0] || 'forwarder';
                    var fwdType = row[1] || 'uf';
                    if (fwdType === 'full' || fwdType === 'heavy') {
                        hfCount++;
                        liveData.nodes.push({
                            id: 'hf_' + hfCount,
                            name: hostname,
                            type: 'heavy_forwarder',
                            tier: 2,
                            health: 'green',
                            role: 'Heavy Forwarder'
                        });
                    } else {
                        ufCount++;
                        liveData.nodes.push({
                            id: 'uf_' + ufCount,
                            name: hostname,
                            type: 'universal_forwarder',
                            tier: 3,
                            health: 'green',
                            role: 'Universal Forwarder'
                        });
                    }
                });
            }
            discoveryComplete.forwarders = true;
            checkComplete();
        });

        serverInfoSearch.on('search:error', function() { discoveryComplete.serverInfo = true; checkComplete(); });
        peersSearch.on('search:error', function() { discoveryComplete.peers = true; checkComplete(); });
        forwardersSearch.on('search:error', function() { discoveryComplete.forwarders = true; checkComplete(); });
    }

    // Initialize on DOM ready
    $(document).ready(function() {
        console.log('SA Tile View: DOM ready');

        var currentViewMode = tokens.get('view_mode') || 'mock';

        if (currentViewMode === 'live') {
            $('#services-container').html('<div class="loading-indicator">Discovering live topology...</div>');
            $('#kpis-container').html('<div class="loading-indicator">Discovering live topology...</div>');
            discoverLiveTopology(function(liveData) {
                renderTiles(liveData);
            });
        } else {
            renderTiles(mockData);
        }

        // Listen for view mode changes
        tokens.on('change:view_mode', function(model, value) {
            console.log('SA Tile View: View mode changed to', value);
            if (value === 'live') {
                $('#services-container').html('<div class="loading-indicator">Discovering live topology...</div>');
                $('#kpis-container').html('<div class="loading-indicator">Discovering live topology...</div>');
                discoverLiveTopology(function(liveData) {
                    renderTiles(liveData);
                });
            } else {
                renderTiles(mockData);
            }
        });

        // Listen for severity filter changes
        tokens.on('change:min_severity', function(model, value) {
            console.log('SA Tile View: Severity filter changed to', value);
            var currentViewMode = tokens.get('view_mode') || 'mock';
            if (currentViewMode === 'live') {
                discoverLiveTopology(function(liveData) {
                    renderTiles(liveData);
                });
            } else {
                renderTiles(mockData);
            }
        });

        // Sort select handlers
        $('#service-sort-select').on('change', function() {
            var sortBy = $(this).val();
            console.log('SA Tile View: Service sort changed to', sortBy);
            // Re-render with new sort
            var currentViewMode = tokens.get('view_mode') || 'mock';
            var data = currentViewMode === 'mock' ? mockData : { nodes: [] };
            if (currentViewMode !== 'mock') {
                // For live mode, trigger re-discovery
                return;
            }
            var services = data.nodes.slice();
            if (sortBy === 'name') {
                services.sort(function(a, b) { return a.name.localeCompare(b.name); });
            } else if (sortBy === 'score') {
                services.sort(function(a, b) { return a.healthScore - b.healthScore; });
            } else {
                services = sortBySeverity(services);
            }
            var minSev = tokens.get('min_severity') || 'all';
            services = filterBySeverity(services, minSev).slice(0, 20);
            var $container = $('#services-container').empty();
            services.forEach(function(s) { $container.append(createServiceTile(s)); });
        });

        $('#kpi-sort-select').on('change', function() {
            var sortBy = $(this).val();
            console.log('SA Tile View: KPI sort changed to', sortBy);
            var currentViewMode = tokens.get('view_mode') || 'mock';
            if (currentViewMode !== 'mock') return;

            var allKPIs = [];
            mockData.nodes.forEach(function(node) {
                if (node.kpis) allKPIs = allKPIs.concat(node.kpis);
            });

            if (sortBy === 'name') {
                allKPIs.sort(function(a, b) { return a.name.localeCompare(b.name); });
            } else if (sortBy === 'value') {
                allKPIs.sort(function(a, b) { return b.value - a.value; });
            } else {
                allKPIs = sortKPIsBySeverity(allKPIs);
            }

            var minSev = tokens.get('min_severity') || 'all';
            allKPIs = filterBySeverity(allKPIs, minSev).slice(0, 20);
            var $container = $('#kpis-container').empty();
            allKPIs.forEach(function(k) { $container.append(createKPITile(k)); });
        });
    });
});
