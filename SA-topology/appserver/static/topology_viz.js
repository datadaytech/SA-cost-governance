/**
 * SA Topology Analyzer - Dynamic Topology Visualization
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

    // Colors for health status
    var colors = {
        green: '#65A637',
        yellow: '#F8BE34',
        red: '#DC4E41',
        unknown: '#708794'
    };

    // Realistic Splunk topology data - layered architecture
    // Data flows: UF -> HF -> Indexer, Search Heads query Indexers
    var mockData = {
        // Tier definitions for layered layout
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
            // Standalone Search Head
            { id: 'sh_standalone', name: 'sh-standalone-01', type: 'search_head', tier: 0, health: 'green', role: 'Standalone SH' },

            // Indexer Cluster (4 peer nodes) - Second tier
            { id: 'idx_1', name: 'indexer-01', type: 'indexer', tier: 1, health: 'green', cluster: 'idxc1', role: 'Peer Node' },
            { id: 'idx_2', name: 'indexer-02', type: 'indexer', tier: 1, health: 'green', cluster: 'idxc1', role: 'Peer Node' },
            { id: 'idx_3', name: 'indexer-03', type: 'indexer', tier: 1, health: 'yellow', cluster: 'idxc1', role: 'Peer Node' },
            { id: 'idx_4', name: 'indexer-04', type: 'indexer', tier: 1, health: 'green', cluster: 'idxc1', role: 'Peer Node' },

            // Heavy Forwarders - Third tier
            { id: 'hf_1', name: 'hf-datacenter-01', type: 'heavy_forwarder', tier: 2, health: 'green', role: 'Aggregation' },
            { id: 'hf_2', name: 'hf-datacenter-02', type: 'heavy_forwarder', tier: 2, health: 'green', role: 'Aggregation' },
            { id: 'hf_3', name: 'hf-cloud-01', type: 'heavy_forwarder', tier: 2, health: 'yellow', role: 'Cloud Ingestion' },

            // Universal Forwarders - Bottom tier
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
        // Connections define data flow (source -> target)
        connections: [
            // UFs -> HFs (data ingestion flow)
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

            // HFs -> Indexers (load balanced)
            { source: 'hf_1', target: 'idx_1' },
            { source: 'hf_1', target: 'idx_2' },
            { source: 'hf_2', target: 'idx_2' },
            { source: 'hf_2', target: 'idx_3' },
            { source: 'hf_3', target: 'idx_3' },
            { source: 'hf_3', target: 'idx_4' },

            // Search Heads -> Indexers (search distribution, shown as dashed)
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

    // Wait for DOM to be ready
    $(document).ready(function() {
        console.log('SA Topology: DOM ready, looking for container...');

        // Find the topology container
        var $container = $('#topology-container');

        if ($container.length === 0) {
            console.error('SA Topology: Container #topology-container not found!');
            return;
        }

        console.log('SA Topology: Container found, dimensions:', $container.width(), 'x', $container.height());

        // Clear any existing content
        $container.empty();

        // Calculate health counts from nodes
        var healthCounts = { green: 0, yellow: 0, red: 0 };
        mockData.nodes.forEach(function(node) {
            if (node.health && healthCounts.hasOwnProperty(node.health)) {
                healthCounts[node.health]++;
            }
        });

        console.log('SA Topology: Health counts:', healthCounts);

        // Update health badges
        $('#health-green').text(healthCounts.green);
        $('#health-yellow').text(healthCounts.yellow);
        $('#health-red').text(healthCounts.red);

        // Setup dimensions
        var width = $container.width() || 1200;
        var height = 700;
        var margin = { top: 80, right: 150, bottom: 50, left: 150 };

        console.log('SA Topology: Creating SVG with dimensions:', width, 'x', height);

        // Create SVG
        var svg = d3.select('#topology-container')
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .style('background', 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)');

        var g = svg.append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        // Calculate tier heights (bottom to top: UF -> HF -> IDX -> SH)
        var numTiers = 4;
        var tierHeight = (height - margin.top - margin.bottom) / (numTiers - 1);
        var contentWidth = width - margin.left - margin.right;

        // Group nodes by tier
        var nodesByTier = {};
        mockData.nodes.forEach(function(node) {
            if (!nodesByTier[node.tier]) {
                nodesByTier[node.tier] = [];
            }
            nodesByTier[node.tier].push(node);
        });

        // Position nodes within each tier
        var nodePositions = {};
        Object.keys(nodesByTier).forEach(function(tier) {
            var tierNodes = nodesByTier[tier];
            var tierY = (numTiers - 1 - tier) * tierHeight; // Invert so tier 0 is at top
            var nodeSpacing = contentWidth / (tierNodes.length + 1);

            tierNodes.forEach(function(node, i) {
                nodePositions[node.id] = {
                    x: nodeSpacing * (i + 1),
                    y: tierY,
                    data: node
                };
            });
        });

        // Create node lookup for connections
        var nodeMap = {};
        mockData.nodes.forEach(function(node) {
            nodeMap[node.id] = node;
        });

        // Draw tier labels and backgrounds
        var tierLabels = ['Search Tier', 'Indexing Tier', 'Forwarding Tier', 'Collection Tier'];
        var tierColors = ['rgba(100, 149, 237, 0.1)', 'rgba(255, 165, 0, 0.1)', 'rgba(147, 112, 219, 0.1)', 'rgba(60, 179, 113, 0.1)'];

        tierLabels.forEach(function(label, i) {
            var tierY = (numTiers - 1 - i) * tierHeight;

            // Tier background band
            g.append('rect')
                .attr('x', -margin.left + 10)
                .attr('y', tierY - 35)
                .attr('width', width - 20)
                .attr('height', 70)
                .attr('fill', tierColors[i])
                .attr('rx', 5);

            // Tier label on left
            g.append('text')
                .attr('x', -margin.left + 20)
                .attr('y', tierY + 5)
                .attr('fill', '#8892b0')
                .attr('font-size', '11px')
                .attr('font-weight', '600')
                .attr('font-family', 'Arial, sans-serif')
                .text(label);
        });

        // Draw cluster boxes for SHC and Indexer Cluster
        // SHC cluster box
        var shcNodes = mockData.nodes.filter(function(n) { return n.cluster === 'shc1'; });
        if (shcNodes.length > 0) {
            var shcPositions = shcNodes.map(function(n) { return nodePositions[n.id]; });
            var shcMinX = d3.min(shcPositions, function(p) { return p.x; }) - 40;
            var shcMaxX = d3.max(shcPositions, function(p) { return p.x; }) + 40;
            var shcY = shcPositions[0].y;

            g.append('rect')
                .attr('x', shcMinX)
                .attr('y', shcY - 45)
                .attr('width', shcMaxX - shcMinX)
                .attr('height', 90)
                .attr('fill', 'none')
                .attr('stroke', '#6495ED')
                .attr('stroke-width', 2)
                .attr('stroke-dasharray', '5,5')
                .attr('rx', 10);

            g.append('text')
                .attr('x', (shcMinX + shcMaxX) / 2)
                .attr('y', shcY - 52)
                .attr('text-anchor', 'middle')
                .attr('fill', '#6495ED')
                .attr('font-size', '10px')
                .attr('font-weight', '600')
                .text('Search Head Cluster');
        }

        // Indexer cluster box
        var idxNodes = mockData.nodes.filter(function(n) { return n.cluster === 'idxc1'; });
        if (idxNodes.length > 0) {
            var idxPositions = idxNodes.map(function(n) { return nodePositions[n.id]; });
            var idxMinX = d3.min(idxPositions, function(p) { return p.x; }) - 40;
            var idxMaxX = d3.max(idxPositions, function(p) { return p.x; }) + 40;
            var idxY = idxPositions[0].y;

            g.append('rect')
                .attr('x', idxMinX)
                .attr('y', idxY - 45)
                .attr('width', idxMaxX - idxMinX)
                .attr('height', 90)
                .attr('fill', 'none')
                .attr('stroke', '#FFA500')
                .attr('stroke-width', 2)
                .attr('stroke-dasharray', '5,5')
                .attr('rx', 10);

            g.append('text')
                .attr('x', (idxMinX + idxMaxX) / 2)
                .attr('y', idxY - 52)
                .attr('text-anchor', 'middle')
                .attr('fill', '#FFA500')
                .attr('font-size', '10px')
                .attr('font-weight', '600')
                .text('Indexer Cluster');
        }

        // Draw connections
        var linksGroup = g.append('g').attr('class', 'links');

        mockData.connections.forEach(function(conn) {
            var source = nodePositions[conn.source];
            var target = nodePositions[conn.target];

            if (!source || !target) return;

            var isSearchConn = conn.type === 'search';

            // Draw curved path
            var path = linksGroup.append('path')
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

            // Add animated flow for data connections (not search)
            if (!isSearchConn) {
                path.attr('class', 'data-flow');
            }
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
                showNodeDetails(d);
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

        // Node circles with glow effect
        nodeElements.append('circle')
            .attr('r', 22)
            .attr('fill', function(d) {
                return colors[d.health] || colors.unknown;
            })
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .style('filter', 'drop-shadow(0px 0px 8px rgba(255,255,255,0.3))');

        // Node type abbreviations
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
            .text(function(d) {
                return typeAbbrev[d.type] || '?';
            });

        // Node name labels
        nodeElements.append('text')
            .attr('text-anchor', 'middle')
            .attr('y', 38)
            .attr('fill', '#ccd6f6')
            .attr('font-size', '9px')
            .attr('font-family', 'Arial, sans-serif')
            .text(function(d) {
                var name = d.name;
                return name.length > 18 ? name.substring(0, 16) + '...' : name;
            });

        // Add legend
        var legend = svg.append('g')
            .attr('class', 'legend')
            .attr('transform', 'translate(' + (width - 130) + ', 20)');

        // Legend background
        legend.append('rect')
            .attr('x', -10)
            .attr('y', -10)
            .attr('width', 120)
            .attr('height', 160)
            .attr('fill', 'rgba(0,0,0,0.3)')
            .attr('rx', 8);

        legend.append('text')
            .attr('x', 0)
            .attr('y', 10)
            .attr('fill', '#ccd6f6')
            .attr('font-size', '11px')
            .attr('font-weight', 'bold')
            .text('Health Status');

        var legendData = [
            { label: 'Healthy', color: colors.green },
            { label: 'Warning', color: colors.yellow },
            { label: 'Critical', color: colors.red }
        ];

        legendData.forEach(function(item, i) {
            var lg = legend.append('g')
                .attr('transform', 'translate(0, ' + (30 + i * 25) + ')');

            lg.append('circle')
                .attr('r', 8)
                .attr('fill', item.color);

            lg.append('text')
                .attr('x', 18)
                .attr('y', 4)
                .attr('font-size', '11px')
                .attr('font-family', 'Arial, sans-serif')
                .attr('fill', '#ccd6f6')
                .text(item.label);
        });

        // Connection type legend
        legend.append('text')
            .attr('x', 0)
            .attr('y', 115)
            .attr('fill', '#ccd6f6')
            .attr('font-size', '11px')
            .attr('font-weight', 'bold')
            .text('Connections');

        legend.append('line')
            .attr('x1', 0).attr('y1', 132)
            .attr('x2', 30).attr('y2', 132)
            .attr('stroke', '#4a5568')
            .attr('stroke-width', 2);

        legend.append('text')
            .attr('x', 38).attr('y', 136)
            .attr('fill', '#ccd6f6')
            .attr('font-size', '10px')
            .text('Data');

        // Node details panel
        function showNodeDetails(data) {
            var $panel = $('#node-details');
            if ($panel.length === 0) {
                $panel = $('<div id="node-details"></div>').appendTo($container);
            }

            var typeLabels = {
                search_head_cluster: 'Search Head (Cluster)',
                search_head: 'Search Head (Standalone)',
                indexer: 'Indexer',
                heavy_forwarder: 'Heavy Forwarder',
                universal_forwarder: 'Universal Forwarder'
            };

            $panel.html(
                '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
                    '<h3 style="margin:0;color:#1a1a2e">' + data.name + '</h3>' +
                    '<span style="width:12px;height:12px;border-radius:50%;background:' + colors[data.health] + '"></span>' +
                '</div>' +
                '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e2e8f0"><span style="color:#666">Type:</span><span style="font-weight:600">' + (typeLabels[data.type] || data.type) + '</span></div>' +
                '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e2e8f0"><span style="color:#666">Role:</span><span style="font-weight:600">' + (data.role || 'N/A') + '</span></div>' +
                '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e2e8f0"><span style="color:#666">Health:</span><span style="font-weight:600;color:' + colors[data.health] + '">' + data.health.toUpperCase() + '</span></div>' +
                (data.cluster ? '<div style="display:flex;justify-content:space-between;padding:8px 0"><span style="color:#666">Cluster:</span><span style="font-weight:600">' + data.cluster + '</span></div>' : '')
            ).css({
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: '#fff',
                borderRadius: '8px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                padding: '16px',
                minWidth: '280px',
                zIndex: 1000,
                borderTop: '4px solid ' + colors[data.health]
            }).show();
        }

        // Add zoom behavior
        var zoom = d3.zoom()
            .scaleExtent([0.5, 2])
            .on('zoom', function(event) {
                g.attr('transform', event.transform.translate(margin.left, margin.top));
            });

        svg.call(zoom);

        console.log('SA Topology: Visualization complete with', mockData.nodes.length, 'nodes and', mockData.connections.length, 'connections');
    });
});
