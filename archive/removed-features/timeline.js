/**
 * Timeline Module for HerData
 * D3.js histogram with brush selection for temporal filtering
 */

import { Debug } from './app.js';

export class Timeline {
    constructor(containerId) {
        this.containerId = containerId;
        this.svg = null;
        this.data = null;
        this.xScale = null;
        this.yScale = null;
        this.tooltip = null;

        // Dimensions
        this.margin = { top: 20, right: 30, bottom: 60, left: 60 };
        this.width = 0;
        this.height = 0;
    }

    /**
     * Load timeline data from persons.json metadata
     */
    async loadLetterData() {
        Debug.log('INIT', 'Loading timeline data...');

        try {
            const response = await fetch('data/persons.json');
            const json = await response.json();

            // Get timeline data from metadata
            if (json.meta && json.meta.timeline) {
                this.data = json.meta.timeline;
                Debug.log('INIT', `Loaded ${this.data.length} years with ${this.data.reduce((sum, d) => sum + d.count, 0)} total letters`);
            } else {
                Debug.log('ERROR', 'No timeline data in persons.json metadata');
                this.data = [];
            }

            return this.data;

        } catch (error) {
            Debug.log('ERROR', `Failed to load timeline data: ${error.message}`);
            throw error;
        }
    }

    /**
     * Initialize and render the timeline
     */
    async initialize() {
        Debug.log('INIT', 'Initializing timeline...');

        // Load data if not already loaded
        if (!this.data) {
            await this.loadLetterData();
        }

        // Setup dimensions
        const container = document.getElementById(this.containerId);
        const containerRect = container.getBoundingClientRect();
        this.width = containerRect.width - this.margin.left - this.margin.right;
        this.height = containerRect.height - this.margin.top - this.margin.bottom;

        // Clear any existing SVG
        d3.select(`#${this.containerId}`).selectAll('*').remove();

        // Create SVG
        this.svg = d3.select(`#${this.containerId}`)
            .append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom)
            .append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        // Create scales
        this.xScale = d3.scaleLinear()
            .domain([1762, 1824])
            .range([0, this.width]);

        this.yScale = d3.scaleLinear()
            .domain([0, d3.max(this.data, d => d.count)])
            .range([this.height, 0])
            .nice();

        // Add axes
        const xAxis = d3.axisBottom(this.xScale)
            .tickFormat(d3.format('d'))
            .ticks(10);

        const yAxis = d3.axisLeft(this.yScale)
            .ticks(5);

        this.svg.append('g')
            .attr('class', 'timeline-axis')
            .attr('transform', `translate(0,${this.height})`)
            .call(xAxis)
            .selectAll('text')
            .attr('transform', 'rotate(-45)')
            .style('text-anchor', 'end');

        this.svg.append('g')
            .attr('class', 'timeline-axis')
            .call(yAxis);

        // Add axis labels
        this.svg.append('text')
            .attr('x', this.width / 2)
            .attr('y', this.height + 50)
            .attr('text-anchor', 'middle')
            .style('font-size', '12px')
            .style('fill', '#666')
            .text('Jahr');

        this.svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -this.height / 2)
            .attr('y', -45)
            .attr('text-anchor', 'middle')
            .style('font-size', '12px')
            .style('fill', '#666')
            .text('Anzahl Briefe');

        // Create tooltip
        this.tooltip = d3.select('body')
            .append('div')
            .attr('class', 'timeline-tooltip')
            .style('opacity', 0);

        // Draw bars (make them wider for easier hover)
        const barWidth = this.width / this.data.length;

        this.svg.selectAll('.timeline-bar')
            .data(this.data)
            .enter()
            .append('rect')
            .attr('class', 'timeline-bar')
            .attr('x', d => this.xScale(d.year) - barWidth / 2)
            .attr('y', d => this.yScale(d.count))
            .attr('width', barWidth)
            .attr('height', d => this.height - this.yScale(d.count))
            .style('cursor', 'pointer')
            .on('mouseover', (event, d) => {
                // Highlight bar
                d3.select(event.currentTarget)
                    .style('opacity', 0.7);

                this.tooltip.transition()
                    .duration(200)
                    .style('opacity', 1);
                this.tooltip.html(`<strong>${d.year}</strong><br/>${d.count} Briefe`)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', (event) => {
                // Reset bar
                d3.select(event.currentTarget)
                    .style('opacity', 1);

                this.tooltip.transition()
                    .duration(500)
                    .style('opacity', 0);
            });

        Debug.log('RENDER', 'Timeline rendered successfully');
    }

    /**
     * Resize timeline on window resize
     */
    resize() {
        if (this.data) {
            this.initialize();
        }
    }
}
