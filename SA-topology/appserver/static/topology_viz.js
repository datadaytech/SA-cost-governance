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

    // Mock topology data
    var mockData = {
        id: 'root',
        name: 'Splunk Infrastructure',
        type: 'root',
        health: 'green',
        children: [
            {
                id: 'sh_1',
                name: 'search-head-01',
                type: 'search_head',
                health: 'green',
                children: [
                    {
                        id: 'idx_main',
                        name: 'main',
                        type: 'index',
                        health: 'green',
                        children: [
                            { id: 'uf_1', name: 'web-server-01', type: 'forwarder', health: 'green', children: [] },
                            { id: 'uf_2', name: 'web-server-02', type: 'forwarder', health: 'green', children: [] },
                            { id: 'uf_3', name: 'app-server-01', type: 'forwarder', health: 'yellow', children: [] }
                        ]
                    },
                    {
                        id: 'idx_internal',
                        name: '_internal',
                        type: 'index',
                        health: 'green',
                        children: [
                            { id: 'uf_4', name: 'firewall-01', type: 'forwarder', health: 'green', children: [] },
                            { id: 'uf_5', name: 'ids-sensor-01', type: 'forwarder', health: 'red', children: [] }
                        ]
                    },
                    {
                        id: 'idx_metrics',
                        name: '_metrics',
                        type: 'index',
                        health: 'yellow',
                        children: [
                            { id: 'uf_6', name: 'monitor-01', type: 'forwarder', health: 'green', children: [] }
                        ]
                    }
                ]
            },
            {
                id: 'sh_2',
                name: 'search-head-02',
                type: 'search_head',
                health: 'green',
                children: [
                    {
                        id: 'idx_audit',
                        name: '_audit',
                        type: 'index',
                        health: 'green',
                        children: [
                            { id: 'uf_7', name: 'dc-01', type: 'forwarder', health: 'green', children: [] },
                            { id: 'uf_8', name: 'dc-02', type: 'forwarder', health: 'green', children: [] }
                        ]
                    }
                ]
            }
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

        // Calculate health counts
        var healthCounts = { green: 0, yellow: 0, red: 0 };
        function countHealth(node) {
            if (node.health && healthCounts.hasOwnProperty(node.health)) {
                healthCounts[node.health]++;
            }
            if (node.children) {
                node.children.forEach(countHealth);
            }
        }
        countHealth(mockData);

        console.log('SA Topology: Health counts:', healthCounts);

        // Update health badges
        $('#health-green').text(healthCounts.green);
        $('#health-yellow').text(healthCounts.yellow);
        $('#health-red').text(healthCounts.red);

        // Setup dimensions
        var width = $container.width() || 1000;
        var height = 600;

        console.log('SA Topology: Creating SVG with dimensions:', width, 'x', height);

        // Create SVG
        var svg = d3.select('#topology-container')
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .style('background', 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)');

        var g = svg.append('g')
            .attr('transform', 'translate(50, 50)');

        // Create tree layout
        var treeLayout = d3.tree()
            .size([width - 100, height - 150]);

        // Create hierarchy
        var root = d3.hierarchy(mockData);
        treeLayout(root);

        console.log('SA Topology: Tree layout computed, nodes:', root.descendants().length);

        // Draw links (curved paths)
        g.selectAll('.link')
            .data(root.links())
            .enter()
            .append('path')
            .attr('class', 'link')
            .attr('fill', 'none')
            .attr('stroke', '#B5B5B5')
            .attr('stroke-width', 2)
            .attr('d', function(d) {
                return 'M' + d.source.x + ',' + d.source.y +
                       'C' + d.source.x + ',' + (d.source.y + d.target.y) / 2 +
                       ' ' + d.target.x + ',' + (d.source.y + d.target.y) / 2 +
                       ' ' + d.target.x + ',' + d.target.y;
            });

        // Draw nodes
        var nodes = g.selectAll('.node')
            .data(root.descendants())
            .enter()
            .append('g')
            .attr('class', 'node')
            .attr('transform', function(d) {
                return 'translate(' + d.x + ',' + d.y + ')';
            })
            .style('cursor', 'pointer')
            .on('click', function(event, d) {
                showNodeDetails(d.data);
            });

        // Node circles
        nodes.append('circle')
            .attr('r', 25)
            .attr('fill', function(d) {
                return colors[d.data.health] || colors.unknown;
            })
            .attr('stroke', '#fff')
            .attr('stroke-width', 3)
            .style('filter', 'drop-shadow(0px 2px 4px rgba(0,0,0,0.2))');

        // Node type abbreviations
        nodes.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', 4)
            .attr('fill', '#fff')
            .attr('font-weight', 'bold')
            .attr('font-size', '12px')
            .attr('font-family', 'Arial, sans-serif')
            .text(function(d) {
                var abbrev = {
                    root: 'R',
                    search_head: 'SH',
                    index: 'IX',
                    forwarder: 'UF'
                };
                return abbrev[d.data.type] || '?';
            });

        // Node name labels
        nodes.append('text')
            .attr('text-anchor', 'middle')
            .attr('y', 40)
            .attr('fill', '#333')
            .attr('font-size', '10px')
            .attr('font-family', 'Arial, sans-serif')
            .text(function(d) {
                var name = d.data.name;
                return name.length > 15 ? name.substring(0, 13) + '...' : name;
            });

        // Add legend
        var legend = svg.append('g')
            .attr('class', 'legend')
            .attr('transform', 'translate(20, 20)');

        var legendData = [
            { label: 'Healthy', color: colors.green },
            { label: 'Warning', color: colors.yellow },
            { label: 'Critical', color: colors.red }
        ];

        legendData.forEach(function(item, i) {
            var lg = legend.append('g')
                .attr('transform', 'translate(0, ' + (i * 25) + ')');

            lg.append('circle')
                .attr('r', 8)
                .attr('fill', item.color);

            lg.append('text')
                .attr('x', 15)
                .attr('y', 4)
                .attr('font-size', '12px')
                .attr('font-family', 'Arial, sans-serif')
                .attr('fill', '#333')
                .text(item.label);
        });

        // Node details panel
        function showNodeDetails(data) {
            var $panel = $('#node-details');
            if ($panel.length === 0) {
                $panel = $('<div id="node-details"></div>').appendTo($container);
            }

            $panel.html(
                '<h3 style="margin:0 0 10px 0;padding-bottom:10px;border-bottom:2px solid ' + colors[data.health] + '">' + data.name + '</h3>' +
                '<div style="display:flex;justify-content:space-between;padding:5px 0"><span style="color:#666">Type:</span><span style="font-weight:600">' + data.type + '</span></div>' +
                '<div style="display:flex;justify-content:space-between;padding:5px 0"><span style="color:#666">Health:</span><span style="font-weight:600;color:' + colors[data.health] + '">' + data.health.toUpperCase() + '</span></div>' +
                '<div style="display:flex;justify-content:space-between;padding:5px 0"><span style="color:#666">Children:</span><span style="font-weight:600">' + (data.children ? data.children.length : 0) + '</span></div>'
            ).css({
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: '#fff',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                padding: '15px',
                minWidth: '250px',
                zIndex: 1000
            }).show();
        }

        // Add zoom behavior
        var zoom = d3.zoom()
            .scaleExtent([0.5, 3])
            .on('zoom', function(event) {
                g.attr('transform', event.transform);
            });

        svg.call(zoom);

        console.log('SA Topology: Visualization complete!');
    });
});
