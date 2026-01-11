/**
 * SA Topology Analyzer - Dynamic Topology Visualization
 * ITSI-style Service Analyzer with KPIs, Sparklines, and Health Scores
 * Uses RequireJS to properly load D3.js in Splunk's environment
 */

// Configure RequireJS to find our local D3.js
require.config({
    paths: {
        'd3': '/static/app/sa-topology/d3.v7.min'
    },
    shim: {
        'd3': {
            exports: 'd3'
        }
    }
});

require([
    'jquery',
    'underscore',
    'd3',
    'splunkjs/mvc',
    'splunkjs/mvc/simplexml/ready!'
], function($, _, d3, mvc) {
    'use strict';

    console.log('SA Topology: Script loaded, D3 version:', d3.version);

    // ITSI-style severity colors (5 levels)
    var severityColors = {
        critical: '#DC4E41',  // Red
        high: '#F58220',      // Orange
        medium: '#F8BE34',    // Yellow
        low: '#6BA4B8',       // Blue
        normal: '#65A637',    // Green
        unknown: '#708794'    // Gray
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

    // Calculate severity from value and thresholds
    function getSeverity(value, thresholds) {
        if (value >= thresholds.critical) return 'critical';
        if (value >= thresholds.high) return 'high';
        if (value >= thresholds.medium) return 'medium';
        if (value >= thresholds.low) return 'low';
        return 'normal';
    }

    // Calculate severity for "lower is better" metrics
    function getSeverityInverse(value, thresholds) {
        if (value <= thresholds.critical) return 'critical';
        if (value <= thresholds.high) return 'high';
        if (value <= thresholds.medium) return 'medium';
        if (value <= thresholds.low) return 'low';
        return 'normal';
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
                // Higher is better
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
                // Lower is better
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

            // Generate sparkline trend
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
                inverse: def.inverse
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

    // Realistic Splunk topology data - layered architecture
    var mockData = {
        tiers: [
            { id: 'tier_sh', name: 'Search Tier', level: 0 },
            { id: 'tier_idx', name: 'Indexing Tier', level: 1 },
            { id: 'tier_hf', name: 'Forwarding Tier', level: 2 },
            { id: 'tier_uf', name: 'Collection Tier', level: 3 }
        ],
        nodes: [
            // Search Head Cluster (3 members) - Top tier
            { id: 'shc_member_1', name: 'sh-cluster-01', type: 'search_head_cluster', tier: 0, health: 'green', cluster: 'shc1', role: 'SHC Captain' },
            { id: 'shc_member_2', name: 'sh-cluster-02', type: 'search_head_cluster', tier: 0, health: 'green', cluster: 'shc1', role: 'SHC Member' },
            { id: 'shc_member_3', name: 'sh-cluster-03', type: 'search_head_cluster', tier: 0, health: 'green', cluster: 'shc1', role: 'SHC Member' },
            { id: 'sh_standalone', name: 'sh-standalone-01', type: 'search_head', tier: 0, health: 'green', role: 'Standalone SH' },

            // Indexer Cluster (4 peer nodes)
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
        ],
        connections: [
            // UFs -> HFs
            { source: 'uf_1', target: 'hf_1' },
            { source: 'uf_2', target: 'hf_1' },
            { source: 'uf_3', target: 'hf_1' },
            { source: 'uf_4', target: 'hf_1' },
            { source: 'uf_5', target: 'hf_2' },
            { source: 'uf_6', target: 'hf_2' },
            { source: 'uf_7', target: 'hf_2' },
            { source: 'uf_8', target: 'hf_2' },
            { source: 'uf_9', target: 'hf_3' },
            { source: 'uf_10', target: 'hf_3' },

            // HFs -> Indexers
            { source: 'hf_1', target: 'idx_1' },
            { source: 'hf_1', target: 'idx_2' },
            { source: 'hf_2', target: 'idx_2' },
            { source: 'hf_2', target: 'idx_3' },
            { source: 'hf_3', target: 'idx_3' },
            { source: 'hf_3', target: 'idx_4' },

            // Search Heads -> Indexers
            { source: 'shc_member_1', target: 'idx_1', type: 'search' },
            { source: 'shc_member_1', target: 'idx_2', type: 'search' },
            { source: 'shc_member_1', target: 'idx_3', type: 'search' },
            { source: 'shc_member_1', target: 'idx_4', type: 'search' },
            { source: 'shc_member_2', target: 'idx_1', type: 'search' },
            { source: 'shc_member_2', target: 'idx_2', type: 'search' },
            { source: 'shc_member_2', target: 'idx_3', type: 'search' },
            { source: 'shc_member_2', target: 'idx_4', type: 'search' },
            { source: 'shc_member_3', target: 'idx_1', type: 'search' },
            { source: 'shc_member_3', target: 'idx_2', type: 'search' },
            { source: 'shc_member_3', target: 'idx_3', type: 'search' },
            { source: 'shc_member_3', target: 'idx_4', type: 'search' },
            { source: 'sh_standalone', target: 'idx_1', type: 'search' },
            { source: 'sh_standalone', target: 'idx_2', type: 'search' },
            { source: 'sh_standalone', target: 'idx_3', type: 'search' },
            { source: 'sh_standalone', target: 'idx_4', type: 'search' }
        ]
    };

    // Pre-generate KPIs for all nodes
    mockData.nodes.forEach(function(node) {
        node.kpis = generateNodeKPIs(node);
        node.healthScore = calculateHealthScore(node.kpis);
    });

    // Wait for DOM to be ready
    $(document).ready(function() {
        console.log('SA Topology: DOM ready, looking for container...');

        var $container = $('#topology-container');
        if ($container.length === 0) {
            console.error('SA Topology: Container #topology-container not found!');
            return;
        }

        $container.empty();

        // Calculate health counts
        var healthCounts = { green: 0, yellow: 0, red: 0 };
        mockData.nodes.forEach(function(node) {
            if (node.health && healthCounts.hasOwnProperty(node.health)) {
                healthCounts[node.health]++;
            }
        });

        $('#health-green').text(healthCounts.green);
        $('#health-yellow').text(healthCounts.yellow);
        $('#health-red').text(healthCounts.red);

        // Setup dimensions
        var width = $container.width() || 1200;
        var height = 700;
        var margin = { top: 80, right: 150, bottom: 50, left: 150 };

        // Create SVG
        var svg = d3.select('#topology-container')
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .style('background', 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)');

        var g = svg.append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        // Calculate tier positions
        var numTiers = 4;
        var tierHeight = (height - margin.top - margin.bottom) / (numTiers - 1);
        var contentWidth = width - margin.left - margin.right;

        // Group and position nodes
        var nodesByTier = {};
        mockData.nodes.forEach(function(node) {
            if (!nodesByTier[node.tier]) nodesByTier[node.tier] = [];
            nodesByTier[node.tier].push(node);
        });

        var nodePositions = {};
        Object.keys(nodesByTier).forEach(function(tier) {
            var tierNodes = nodesByTier[tier];
            var tierY = (numTiers - 1 - tier) * tierHeight;
            var nodeSpacing = contentWidth / (tierNodes.length + 1);

            tierNodes.forEach(function(node, i) {
                nodePositions[node.id] = {
                    x: nodeSpacing * (i + 1),
                    y: tierY,
                    data: node
                };
            });
        });

        // Draw tier backgrounds
        var tierLabels = ['Search Tier', 'Indexing Tier', 'Forwarding Tier', 'Collection Tier'];
        var tierColors = ['rgba(100, 149, 237, 0.1)', 'rgba(255, 165, 0, 0.1)', 'rgba(147, 112, 219, 0.1)', 'rgba(60, 179, 113, 0.1)'];

        tierLabels.forEach(function(label, i) {
            var tierY = (numTiers - 1 - i) * tierHeight;

            g.append('rect')
                .attr('x', -margin.left + 10)
                .attr('y', tierY - 35)
                .attr('width', width - 20)
                .attr('height', 70)
                .attr('fill', tierColors[i])
                .attr('rx', 5);

            g.append('text')
                .attr('x', -margin.left + 20)
                .attr('y', tierY + 5)
                .attr('fill', '#8892b0')
                .attr('font-size', '11px')
                .attr('font-weight', '600')
                .attr('font-family', 'Arial, sans-serif')
                .text(label);
        });

        // Draw cluster boxes
        function drawClusterBox(clusterNodes, color, label) {
            if (clusterNodes.length === 0) return;
            var positions = clusterNodes.map(function(n) { return nodePositions[n.id]; });
            var minX = d3.min(positions, function(p) { return p.x; }) - 40;
            var maxX = d3.max(positions, function(p) { return p.x; }) + 40;
            var y = positions[0].y;

            g.append('rect')
                .attr('x', minX)
                .attr('y', y - 45)
                .attr('width', maxX - minX)
                .attr('height', 90)
                .attr('fill', 'none')
                .attr('stroke', color)
                .attr('stroke-width', 2)
                .attr('stroke-dasharray', '5,5')
                .attr('rx', 10);

            g.append('text')
                .attr('x', (minX + maxX) / 2)
                .attr('y', y - 52)
                .attr('text-anchor', 'middle')
                .attr('fill', color)
                .attr('font-size', '10px')
                .attr('font-weight', '600')
                .text(label);
        }

        drawClusterBox(mockData.nodes.filter(function(n) { return n.cluster === 'shc1'; }), '#6495ED', 'Search Head Cluster');
        drawClusterBox(mockData.nodes.filter(function(n) { return n.cluster === 'idxc1'; }), '#FFA500', 'Indexer Cluster');

        // Draw connections
        var linksGroup = g.append('g').attr('class', 'links');

        mockData.connections.forEach(function(conn) {
            var source = nodePositions[conn.source];
            var target = nodePositions[conn.target];
            if (!source || !target) return;

            var isSearchConn = conn.type === 'search';

            linksGroup.append('path')
                .attr('fill', 'none')
                .attr('stroke', isSearchConn ? '#6495ED' : '#4a5568')
                .attr('stroke-width', isSearchConn ? 1 : 2)
                .attr('stroke-dasharray', isSearchConn ? '4,4' : 'none')
                .attr('opacity', isSearchConn ? 0.4 : 0.7)
                .attr('d', function() {
                    var midY = (source.y + target.y) / 2;
                    return 'M' + source.x + ',' + source.y +
                           'C' + source.x + ',' + midY +
                           ' ' + target.x + ',' + midY +
                           ' ' + target.x + ',' + target.y;
                });
        });

        // Draw nodes
        var nodesGroup = g.append('g').attr('class', 'nodes');

        var nodeElements = nodesGroup.selectAll('.node')
            .data(mockData.nodes)
            .enter()
            .append('g')
            .attr('class', 'node')
            .attr('transform', function(d) {
                var pos = nodePositions[d.id];
                return 'translate(' + pos.x + ',' + pos.y + ')';
            })
            .style('cursor', 'pointer')
            .on('click', function(event, d) {
                event.stopPropagation();
                showKPIModal(d);
            })
            .on('mouseover', function(event, d) {
                d3.select(this).select('circle')
                    .transition()
                    .duration(200)
                    .attr('r', 28);
            })
            .on('mouseout', function(event, d) {
                d3.select(this).select('circle')
                    .transition()
                    .duration(200)
                    .attr('r', 22);
            });

        // Node circles
        nodeElements.append('circle')
            .attr('r', 22)
            .attr('fill', function(d) {
                return severityColors[healthToSeverity[d.health]] || severityColors.unknown;
            })
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .style('filter', 'drop-shadow(0px 0px 8px rgba(255,255,255,0.3))');

        // Node abbreviations
        var typeAbbrev = {
            search_head_cluster: 'SHC',
            search_head: 'SH',
            indexer: 'IDX',
            heavy_forwarder: 'HF',
            universal_forwarder: 'UF'
        };

        nodeElements.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', 5)
            .attr('fill', '#fff')
            .attr('font-weight', 'bold')
            .attr('font-size', '10px')
            .attr('font-family', 'Arial, sans-serif')
            .text(function(d) { return typeAbbrev[d.type] || '?'; });

        // Node labels
        nodeElements.append('text')
            .attr('text-anchor', 'middle')
            .attr('y', 38)
            .attr('fill', '#ccd6f6')
            .attr('font-size', '9px')
            .attr('font-family', 'Arial, sans-serif')
            .text(function(d) {
                return d.name.length > 18 ? d.name.substring(0, 16) + '...' : d.name;
            });

        // Add legend
        var legend = svg.append('g')
            .attr('class', 'legend')
            .attr('transform', 'translate(' + (width - 130) + ', 20)');

        legend.append('rect')
            .attr('x', -10)
            .attr('y', -10)
            .attr('width', 120)
            .attr('height', 180)
            .attr('fill', 'rgba(0,0,0,0.3)')
            .attr('rx', 8);

        legend.append('text')
            .attr('x', 0).attr('y', 10)
            .attr('fill', '#ccd6f6')
            .attr('font-size', '11px')
            .attr('font-weight', 'bold')
            .text('Severity Levels');

        var legendData = [
            { label: 'Normal', color: severityColors.normal },
            { label: 'Low', color: severityColors.low },
            { label: 'Medium', color: severityColors.medium },
            { label: 'High', color: severityColors.high },
            { label: 'Critical', color: severityColors.critical }
        ];

        legendData.forEach(function(item, i) {
            var lg = legend.append('g')
                .attr('transform', 'translate(0, ' + (28 + i * 22) + ')');

            lg.append('circle')
                .attr('r', 6)
                .attr('fill', item.color);

            lg.append('text')
                .attr('x', 14)
                .attr('y', 4)
                .attr('font-size', '10px')
                .attr('fill', '#ccd6f6')
                .text(item.label);
        });

        legend.append('text')
            .attr('x', 0).attr('y', 150)
            .attr('fill', '#ccd6f6')
            .attr('font-size', '10px')
            .attr('font-style', 'italic')
            .text('Click node for KPIs');

        // KPI Modal function
        function showKPIModal(node) {
            // Remove existing modal
            $('#kpi-modal-overlay').remove();

            var typeLabels = {
                search_head_cluster: 'Search Head (Cluster)',
                search_head: 'Search Head (Standalone)',
                indexer: 'Indexer',
                heavy_forwarder: 'Heavy Forwarder',
                universal_forwarder: 'Universal Forwarder'
            };

            var healthScoreColor = node.healthScore >= 80 ? severityColors.normal :
                                   node.healthScore >= 60 ? severityColors.low :
                                   node.healthScore >= 40 ? severityColors.medium :
                                   node.healthScore >= 20 ? severityColors.high :
                                   severityColors.critical;

            // Create modal overlay
            var $overlay = $('<div id="kpi-modal-overlay"></div>').css({
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

            // Create modal content
            var $modal = $('<div id="kpi-modal"></div>').css({
                background: '#1a1a2e',
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                width: '700px',
                maxHeight: '80vh',
                overflow: 'hidden',
                border: '1px solid #2d3748'
            });

            // Modal header
            var $header = $('<div class="modal-header"></div>').css({
                padding: '20px 24px',
                borderBottom: '1px solid #2d3748',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start'
            });

            var $titleSection = $('<div></div>');
            $titleSection.append($('<h2></h2>').text(node.name).css({
                margin: 0,
                color: '#e2e8f0',
                fontSize: '20px',
                fontWeight: '600'
            }));
            $titleSection.append($('<div></div>').text(typeLabels[node.type] + ' • ' + node.role).css({
                color: '#8892b0',
                fontSize: '13px',
                marginTop: '4px'
            }));

            var $healthScore = $('<div class="health-score"></div>').css({
                textAlign: 'center'
            });
            $healthScore.append($('<div></div>').text(node.healthScore).css({
                fontSize: '32px',
                fontWeight: '700',
                color: healthScoreColor,
                lineHeight: '1'
            }));
            $healthScore.append($('<div></div>').text('Health Score').css({
                fontSize: '11px',
                color: '#8892b0',
                marginTop: '4px'
            }));

            // Create sparkline for health score
            var $sparklineContainer = $('<div id="health-sparkline"></div>').css({
                width: '100px',
                height: '30px',
                marginTop: '8px'
            });
            $healthScore.append($sparklineContainer);

            $header.append($titleSection);
            $header.append($healthScore);

            // Close button
            var $closeBtn = $('<button>&times;</button>').css({
                position: 'absolute',
                top: '12px',
                right: '16px',
                background: 'none',
                border: 'none',
                color: '#8892b0',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '4px 8px'
            }).hover(
                function() { $(this).css('color', '#e2e8f0'); },
                function() { $(this).css('color', '#8892b0'); }
            ).on('click', function() {
                $overlay.remove();
            });

            // Modal body - KPI list
            var $body = $('<div class="modal-body"></div>').css({
                padding: '16px 24px',
                maxHeight: '50vh',
                overflowY: 'auto'
            });

            var $kpiList = $('<div class="kpi-list"></div>');

            node.kpis.forEach(function(kpi, index) {
                var $kpiRow = $('<div class="kpi-row"></div>').css({
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: index % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                    borderRadius: '6px',
                    marginBottom: '4px'
                });

                // Severity indicator
                var $severity = $('<div class="severity-indicator"></div>').css({
                    width: '8px',
                    height: '40px',
                    borderRadius: '4px',
                    background: severityColors[kpi.severity],
                    marginRight: '16px',
                    flexShrink: 0
                });

                // KPI info
                var $info = $('<div class="kpi-info"></div>').css({
                    flex: 1
                });

                $info.append($('<div class="kpi-name"></div>').text(kpi.name).css({
                    color: '#e2e8f0',
                    fontSize: '14px',
                    fontWeight: '500'
                }));

                $info.append($('<div class="kpi-severity"></div>').text(kpi.severity.toUpperCase()).css({
                    color: severityColors[kpi.severity],
                    fontSize: '11px',
                    fontWeight: '600',
                    marginTop: '2px'
                }));

                // Sparkline container
                var $sparkline = $('<div class="kpi-sparkline" id="sparkline-' + kpi.id + '"></div>').css({
                    width: '120px',
                    height: '35px',
                    marginRight: '16px',
                    flexShrink: 0
                });

                // Value
                var $value = $('<div class="kpi-value"></div>').css({
                    textAlign: 'right',
                    width: '80px',
                    flexShrink: 0
                });

                $value.append($('<div></div>').text(kpi.value + ' ' + kpi.unit).css({
                    color: '#e2e8f0',
                    fontSize: '16px',
                    fontWeight: '600'
                }));

                // Calculate trend
                var sparklineData = kpi.sparkline;
                var lastVal = sparklineData[sparklineData.length - 1];
                var firstVal = sparklineData[0];
                var trend = lastVal - firstVal;
                var trendSymbol = trend > 2 ? '↑' : (trend < -2 ? '↓' : '→');
                var trendColor = trend > 2 ? (kpi.inverse ? severityColors.critical : severityColors.normal) :
                                 (trend < -2 ? (kpi.inverse ? severityColors.normal : severityColors.critical) : '#8892b0');

                $value.append($('<div></div>').text(trendSymbol + ' ' + Math.abs(Math.round(trend)) + '%').css({
                    color: trendColor,
                    fontSize: '11px',
                    marginTop: '2px'
                }));

                $kpiRow.append($severity);
                $kpiRow.append($info);
                $kpiRow.append($sparkline);
                $kpiRow.append($value);

                $kpiList.append($kpiRow);
            });

            $body.append($kpiList);

            // Modal footer
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

            var $drilldownBtn = $('<button>View in Splunk Search</button>').css({
                background: '#6495ED',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '13px',
                cursor: 'pointer',
                fontWeight: '500'
            }).hover(
                function() { $(this).css('background', '#4a7fd4'); },
                function() { $(this).css('background', '#6495ED'); }
            );

            $footer.append($drilldownBtn);

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

            // Close on ESC key
            $(document).on('keydown.kpiModal', function(e) {
                if (e.keyCode === 27) {
                    $overlay.remove();
                    $(document).off('keydown.kpiModal');
                }
            });

            // Draw sparklines using D3
            setTimeout(function() {
                // Health score sparkline
                var healthData = generateSparklineData(node.healthScore, 5, 0);
                drawSparkline('#health-sparkline', healthData, 100, 30, healthScoreColor);

                // KPI sparklines
                node.kpis.forEach(function(kpi) {
                    drawSparkline('#sparkline-' + kpi.id, kpi.sparkline, 120, 35, severityColors[kpi.severity]);
                });
            }, 50);
        }

        // Draw sparkline function
        function drawSparkline(selector, data, width, height, color) {
            var container = d3.select(selector);
            if (container.empty()) return;

            container.selectAll('*').remove();

            var svg = container.append('svg')
                .attr('width', width)
                .attr('height', height);

            var xScale = d3.scaleLinear()
                .domain([0, data.length - 1])
                .range([2, width - 2]);

            var yScale = d3.scaleLinear()
                .domain([d3.min(data) - 5, d3.max(data) + 5])
                .range([height - 2, 2]);

            var line = d3.line()
                .x(function(d, i) { return xScale(i); })
                .y(function(d) { return yScale(d); })
                .curve(d3.curveMonotoneX);

            // Area fill
            var area = d3.area()
                .x(function(d, i) { return xScale(i); })
                .y0(height)
                .y1(function(d) { return yScale(d); })
                .curve(d3.curveMonotoneX);

            svg.append('path')
                .datum(data)
                .attr('fill', color)
                .attr('fill-opacity', 0.15)
                .attr('d', area);

            svg.append('path')
                .datum(data)
                .attr('fill', 'none')
                .attr('stroke', color)
                .attr('stroke-width', 1.5)
                .attr('d', line);

            // Current value dot
            svg.append('circle')
                .attr('cx', xScale(data.length - 1))
                .attr('cy', yScale(data[data.length - 1]))
                .attr('r', 3)
                .attr('fill', color);
        }

        // Add zoom behavior
        var zoom = d3.zoom()
            .scaleExtent([0.5, 2])
            .on('zoom', function(event) {
                g.attr('transform', event.transform.translate(margin.left, margin.top));
            });

        svg.call(zoom);

        console.log('SA Topology: Visualization complete with', mockData.nodes.length, 'nodes');
    });
});
