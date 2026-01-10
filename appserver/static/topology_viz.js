/**
 * SA Topology Analyzer - Dynamic Topology Visualization
 *
 * This module creates an interactive tree visualization similar to ITSI's Service Analyzer.
 * It uses D3.js for rendering and integrates with Splunk's search results.
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

    // Load D3.js dynamically
    function loadD3(callback) {
        if (typeof d3 !== 'undefined') {
            callback();
            return;
        }

        var script = document.createElement('script');
        script.src = 'https://d3js.org/d3.v7.min.js';
        script.onload = callback;
        script.onerror = function() {
            console.error('Failed to load D3.js');
            $('#topology-container').html(
                '<div style="padding: 40px; text-align: center; color: #DC4E41;">' +
                '<h3>Error Loading Visualization</h3>' +
                '<p>Could not load D3.js library. Please check your network connection.</p>' +
                '</div>'
            );
        };
        document.head.appendChild(script);
    }

    // Configuration
    var CONFIG = {
        containerSelector: '#topology-container',
        width: 1200,
        height: 800,
        nodeRadius: 25,
        levelHeight: 150,
        animationDuration: 500,
        colors: {
            green: '#65A637',
            yellow: '#F8BE34',
            red: '#DC4E41',
            unknown: '#708794',
            link: '#B5B5B5',
            text: '#333333',
            background: '#FFFFFF'
        },
        icons: {
            search_head: '\uf002',      // search icon
            index: '\uf1c0',            // database icon
            forwarder: '\uf233',        // server icon
            indexer: '\uf0c2',          // cloud icon
            unknown: '\uf128'           // question icon
        }
    };

    /**
     * TopologyVisualizer Class
     * Main class for creating and managing the topology tree visualization
     */
    function TopologyVisualizer(container, options) {
        this.container = container;
        this.options = $.extend({}, CONFIG, options);
        this.svg = null;
        this.tree = null;
        this.root = null;
        this.nodes = [];
        this.links = [];
        this.init();
    }

    TopologyVisualizer.prototype = {
        /**
         * Initialize the visualization
         */
        init: function() {
            var self = this;

            // Clear existing content
            $(this.container).empty();

            // Create SVG container
            this.svg = d3.select(this.container)
                .append('svg')
                .attr('width', '100%')
                .attr('height', this.options.height)
                .attr('viewBox', '0 0 ' + this.options.width + ' ' + this.options.height)
                .attr('preserveAspectRatio', 'xMidYMid meet')
                .append('g')
                .attr('transform', 'translate(50, 50)');

            // Create tree layout
            this.tree = d3.tree()
                .size([this.options.width - 100, this.options.height - 150])
                .separation(function(a, b) {
                    return a.parent === b.parent ? 1.5 : 2;
                });

            // Add zoom behavior
            var zoom = d3.zoom()
                .scaleExtent([0.3, 3])
                .on('zoom', function(event) {
                    self.svg.attr('transform', event.transform);
                });

            d3.select(this.container + ' svg').call(zoom);

            // Add legend
            this.addLegend();
        },

        /**
         * Add legend to the visualization
         */
        addLegend: function() {
            var legendData = [
                { label: 'Healthy', color: this.options.colors.green },
                { label: 'Warning', color: this.options.colors.yellow },
                { label: 'Critical', color: this.options.colors.red },
                { label: 'Unknown', color: this.options.colors.unknown }
            ];

            var legend = d3.select(this.container + ' svg')
                .append('g')
                .attr('class', 'legend')
                .attr('transform', 'translate(20, 20)');

            var legendItems = legend.selectAll('.legend-item')
                .data(legendData)
                .enter()
                .append('g')
                .attr('class', 'legend-item')
                .attr('transform', function(d, i) {
                    return 'translate(0, ' + (i * 25) + ')';
                });

            legendItems.append('circle')
                .attr('r', 8)
                .attr('fill', function(d) { return d.color; });

            legendItems.append('text')
                .attr('x', 15)
                .attr('y', 4)
                .style('font-size', '12px')
                .style('fill', this.options.colors.text)
                .text(function(d) { return d.label; });
        },

        /**
         * Build hierarchy from flat data
         * @param {Array} data - Array of node objects with parent_id references
         * @returns {Object} Root node of hierarchy
         */
        buildHierarchy: function(data) {
            var nodeMap = {};
            var root = null;

            // First pass: create node map
            data.forEach(function(item) {
                nodeMap[item.node_id] = {
                    id: item.node_id,
                    name: item.node_name || item.node_id,
                    type: item.node_type,
                    health: item.health || 'unknown',
                    data: item,
                    children: []
                };
            });

            // Second pass: build hierarchy
            data.forEach(function(item) {
                var node = nodeMap[item.node_id];
                if (item.parent_id && item.parent_id !== 'root' && nodeMap[item.parent_id]) {
                    nodeMap[item.parent_id].children.push(node);
                } else if (!root || item.parent_id === 'root') {
                    if (!root) {
                        root = {
                            id: 'root',
                            name: 'Splunk Infrastructure',
                            type: 'root',
                            health: 'green',
                            children: []
                        };
                    }
                    root.children.push(node);
                }
            });

            // If no data, create mock hierarchy
            if (!root) {
                root = this.createMockHierarchy();
            }

            return root;
        },

        /**
         * Create mock hierarchy for demonstration
         * @returns {Object} Mock root node
         */
        createMockHierarchy: function() {
            return {
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
                                id: 'idx_security',
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
                                    { id: 'uf_6', name: 'monitoring-agent-01', type: 'forwarder', health: 'green', children: [] },
                                    { id: 'uf_7', name: 'monitoring-agent-02', type: 'forwarder', health: 'green', children: [] }
                                ]
                            }
                        ]
                    },
                    {
                        id: 'sh_2',
                        name: 'search-head-02',
                        type: 'search_head',
                        health: 'yellow',
                        children: [
                            {
                                id: 'idx_audit',
                                name: '_audit',
                                type: 'index',
                                health: 'green',
                                children: [
                                    { id: 'uf_8', name: 'domain-controller-01', type: 'forwarder', health: 'green', children: [] }
                                ]
                            }
                        ]
                    }
                ]
            };
        },

        /**
         * Update the visualization with new data
         * @param {Array|Object} data - Node data or pre-built hierarchy
         */
        update: function(data) {
            var self = this;

            // Build hierarchy if data is flat array
            if (Array.isArray(data)) {
                this.root = d3.hierarchy(this.buildHierarchy(data));
            } else {
                this.root = d3.hierarchy(data);
            }

            // Compute tree layout
            this.tree(this.root);

            // Get nodes and links
            var nodes = this.root.descendants();
            var links = this.root.links();

            // Update links
            var link = this.svg.selectAll('.link')
                .data(links, function(d) { return d.target.data.id; });

            // Enter links
            var linkEnter = link.enter()
                .append('path')
                .attr('class', 'link')
                .attr('fill', 'none')
                .attr('stroke', this.options.colors.link)
                .attr('stroke-width', 2)
                .attr('opacity', 0);

            // Merge and transition links
            link.merge(linkEnter)
                .transition()
                .duration(this.options.animationDuration)
                .attr('opacity', 1)
                .attr('d', function(d) {
                    return 'M' + d.source.x + ',' + d.source.y +
                           'C' + d.source.x + ',' + (d.source.y + d.target.y) / 2 +
                           ' ' + d.target.x + ',' + (d.source.y + d.target.y) / 2 +
                           ' ' + d.target.x + ',' + d.target.y;
                });

            // Exit links
            link.exit()
                .transition()
                .duration(this.options.animationDuration)
                .attr('opacity', 0)
                .remove();

            // Update nodes
            var node = this.svg.selectAll('.node')
                .data(nodes, function(d) { return d.data.id; });

            // Enter nodes
            var nodeEnter = node.enter()
                .append('g')
                .attr('class', 'node')
                .attr('transform', function(d) {
                    return 'translate(' + d.x + ',' + d.y + ')';
                })
                .style('cursor', 'pointer')
                .on('click', function(event, d) {
                    self.onNodeClick(d);
                })
                .on('mouseover', function(event, d) {
                    self.onNodeHover(d, true);
                })
                .on('mouseout', function(event, d) {
                    self.onNodeHover(d, false);
                });

            // Add node circles
            nodeEnter.append('circle')
                .attr('r', 0)
                .attr('fill', function(d) {
                    return self.options.colors[d.data.health] || self.options.colors.unknown;
                })
                .attr('stroke', '#fff')
                .attr('stroke-width', 3)
                .style('filter', 'drop-shadow(0px 2px 4px rgba(0,0,0,0.2))');

            // Add node icons (using text for simplicity - could use actual icons)
            nodeEnter.append('text')
                .attr('class', 'node-icon')
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'central')
                .attr('fill', '#fff')
                .attr('font-size', '14px')
                .attr('font-weight', 'bold')
                .text(function(d) {
                    var typeAbbrev = {
                        'root': 'R',
                        'search_head': 'SH',
                        'index': 'IX',
                        'forwarder': 'UF',
                        'indexer': 'ID'
                    };
                    return typeAbbrev[d.data.type] || '?';
                });

            // Add node labels
            nodeEnter.append('text')
                .attr('class', 'node-label')
                .attr('text-anchor', 'middle')
                .attr('y', self.options.nodeRadius + 15)
                .attr('fill', this.options.colors.text)
                .attr('font-size', '11px')
                .text(function(d) {
                    var name = d.data.name;
                    return name.length > 20 ? name.substring(0, 18) + '...' : name;
                });

            // Add child count badge
            nodeEnter.append('g')
                .attr('class', 'child-count')
                .attr('transform', 'translate(' + (self.options.nodeRadius - 5) + ',' + (-self.options.nodeRadius + 5) + ')')
                .each(function(d) {
                    if (d.data.children && d.data.children.length > 0) {
                        d3.select(this).append('circle')
                            .attr('r', 10)
                            .attr('fill', '#4A4A4A');
                        d3.select(this).append('text')
                            .attr('text-anchor', 'middle')
                            .attr('dominant-baseline', 'central')
                            .attr('fill', '#fff')
                            .attr('font-size', '10px')
                            .text(d.data.children.length);
                    }
                });

            // Merge and transition nodes
            var nodeUpdate = node.merge(nodeEnter);

            nodeUpdate.transition()
                .duration(this.options.animationDuration)
                .attr('transform', function(d) {
                    return 'translate(' + d.x + ',' + d.y + ')';
                });

            nodeUpdate.select('circle')
                .transition()
                .duration(this.options.animationDuration)
                .attr('r', this.options.nodeRadius)
                .attr('fill', function(d) {
                    return self.options.colors[d.data.health] || self.options.colors.unknown;
                });

            // Exit nodes
            node.exit()
                .transition()
                .duration(this.options.animationDuration)
                .attr('transform', function(d) {
                    return 'translate(' + d.x + ',' + d.y + ')';
                })
                .remove();

            node.exit().select('circle')
                .transition()
                .duration(this.options.animationDuration)
                .attr('r', 0);
        },

        /**
         * Handle node click event
         * @param {Object} d - Node data
         */
        onNodeClick: function(d) {
            console.log('Node clicked:', d.data);

            // Toggle children visibility (collapse/expand)
            if (d.children) {
                d._children = d.children;
                d.children = null;
            } else if (d._children) {
                d.children = d._children;
                d._children = null;
            }

            // Show node details panel
            this.showNodeDetails(d);
        },

        /**
         * Handle node hover event
         * @param {Object} d - Node data
         * @param {boolean} isHover - Whether hovering or not
         */
        onNodeHover: function(d, isHover) {
            var node = this.svg.selectAll('.node')
                .filter(function(n) { return n.data.id === d.data.id; });

            node.select('circle')
                .transition()
                .duration(200)
                .attr('r', isHover ? this.options.nodeRadius * 1.2 : this.options.nodeRadius);
        },

        /**
         * Show node details panel
         * @param {Object} d - Node data
         */
        showNodeDetails: function(d) {
            var detailsHtml = '<div class="node-details-panel">' +
                '<h3>' + d.data.name + '</h3>' +
                '<div class="detail-row"><span class="label">Type:</span> <span class="value">' + d.data.type + '</span></div>' +
                '<div class="detail-row"><span class="label">Health:</span> <span class="value health-' + d.data.health + '">' + d.data.health.toUpperCase() + '</span></div>';

            if (d.data.data) {
                var extraData = d.data.data;
                if (extraData.version) {
                    detailsHtml += '<div class="detail-row"><span class="label">Version:</span> <span class="value">' + extraData.version + '</span></div>';
                }
                if (extraData.total_kb) {
                    detailsHtml += '<div class="detail-row"><span class="label">Data Volume:</span> <span class="value">' + Math.round(extraData.total_kb / 1024) + ' MB</span></div>';
                }
                if (extraData.totalEventCount) {
                    detailsHtml += '<div class="detail-row"><span class="label">Event Count:</span> <span class="value">' + extraData.totalEventCount.toLocaleString() + '</span></div>';
                }
            }

            if (d.children || d._children) {
                var childCount = (d.children || d._children).length;
                detailsHtml += '<div class="detail-row"><span class="label">Children:</span> <span class="value">' + childCount + '</span></div>';
            }

            detailsHtml += '</div>';

            // Update or create details panel
            var panel = $('#node-details');
            if (panel.length === 0) {
                $('<div id="node-details"></div>').appendTo(this.container);
                panel = $('#node-details');
            }
            panel.html(detailsHtml).show();
        },

        /**
         * Calculate overall health status
         * @returns {Object} Health summary
         */
        calculateHealthSummary: function() {
            if (!this.root) return { green: 0, yellow: 0, red: 0, unknown: 0 };

            var summary = { green: 0, yellow: 0, red: 0, unknown: 0 };
            this.root.descendants().forEach(function(d) {
                var health = d.data.health || 'unknown';
                summary[health] = (summary[health] || 0) + 1;
            });

            return summary;
        },

        /**
         * Destroy the visualization
         */
        destroy: function() {
            $(this.container).empty();
            this.svg = null;
            this.root = null;
        }
    };

    // Initialize visualization when DOM is ready
    $(document).ready(function() {
        // Create topology visualizer instance
        var container = CONFIG.containerSelector;
        if ($(container).length === 0) {
            console.log('Topology container not found, skipping initialization');
            return;
        }

        // Load D3 and initialize
        loadD3(function() {
            console.log('D3.js loaded successfully, initializing topology visualization');

            window.topologyViz = new TopologyVisualizer(container);

            // Get search manager if available
            var searchManager = mvc.Components.get('topology_search');

            if (searchManager) {
                // Listen for search results
                var results = searchManager.data('results', { output_mode: 'json', count: 0 });

                results.on('data', function() {
                    if (results.hasData()) {
                        var data = results.data().results;
                        window.topologyViz.update(data);
                    }
                });
            } else {
                // Use mock data for demonstration
                console.log('No search manager found, using mock data');
                window.topologyViz.update(window.topologyViz.createMockHierarchy());
            }

            // Update health summary
            setTimeout(function() {
                var summary = window.topologyViz.calculateHealthSummary();
                $('#health-green').text(summary.green || 0);
                $('#health-yellow').text(summary.yellow || 0);
                $('#health-red').text(summary.red || 0);
            }, 1000);
        });
    });

    // Export for external use
    window.TopologyVisualizer = TopologyVisualizer;
});
