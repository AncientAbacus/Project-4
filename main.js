// set up global constants and variables -----------------------------------------------------------
let data = [];
let commits = [];
let xScale, yScale;

// create custom color scale
const customColors = d3.schemePaired;
const colorScale = d3.scaleOrdinal()
    .domain(d3.range(customColors.length)) // Assigns colors to categories
    .range(customColors.reverse()); // reverse because otherwise the x axis displays backwards


    // Add this before your visualization code
const tooltip = d3.select('body')
    .append('div')
    .attr('class', 'tooltip');


// scroll widget ------------------------------------------------------------------------------------
window.addEventListener('scroll', () => {
    document.body.style.setProperty('--scroll', window.pageYOffset / (document.body.offsetHeight - window.innerHeight));
  }, false);

// load data-----------------------------------------------------------------------------------------
async function loadData() {
    data = await d3.csv('data/cases_clean.csv', (row) => ({
        ...row,
        caseid: row.caseid,
        subjectid: row.subjectid,
        age: Number(row.age),
        sex: row.sex,
        height: Number(row.height),
        weight: Number(row.weight),
        emop: row.emop,
        department: row.department,
        optype: row.optype,
        dx: row.dx,
        opname: row.opname,
        approach: row.approach,
        position: row.position,
        ane_type: row.ane_type,
        adm: row.adm,
        dis: row.dis,
        icu_days: Number(row.icu_days),
        case_duration: Number(row.case_duration),
        ane_duration: Number(row.ane_duration),
        op_duration: Number(row.op_duration),
        mortality: Number(row.mortality_rate),
        intraop_ebl: Number(row.intraop_ebl)
    }));
    

    console.log(data);
    // displayStats();
    createStreamGraph();
    createSurgicalPositionViz();
    createSurgicalViz();
  }


// execute loadData when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
});


// display stats -----------DYSFUNCTIONAL-------------------------------------------------------------------------
function displayStats() {  
    // Create the dl element
    const dl = d3.select('#stats').append('dl').attr('class', 'stats');

    // add total observations
    dl.append('dt').html('Total');
    dl.append('dd').text(data.length);

    // Add total cases by age bin
    const ageBins = d3.group(data, d => d.agebin);
    const sortedAgeBins = Array.from(ageBins).sort((a, b) => {
        const aStart = a[0] === "70+" ? 70 : Number(a[0].split('-')[0]);
        const bStart = b[0] === "70+" ? 70 : Number(b[0].split('-')[0]);
        return d3.ascending(aStart, bStart);
    });
    sortedAgeBins.forEach(([key, value]) => {
        dl.append('dt').text(`${key}`);
        dl.append('dd').text(value.length);
    });
}


// update stats for nested stacked bar chart -------------------------------------------------------
function updateStats(filteredData) {  
    // Create the dl element
    const dl = d3.select('#stats').append('dl').attr('class', 'stats');

    // add total observations
    dl.append('dt').html('Total');
    dl.append('dd').text(filteredData.length);

    // Add total cases by age bin
    const ageBins = d3.group(filteredData, d => d.agebin);
    const sortedAgeBins = Array.from(ageBins).sort((a, b) => {
        const aStart = a[0] === "70+" ? 70 : Number(a[0].split('-')[0]);
        const bStart = b[0] === "70+" ? 70 : Number(b[0].split('-')[0]);
        return d3.ascending(aStart, bStart);
    });
    sortedAgeBins.forEach(([key, value]) => {
        dl.append('dt').text(`${key}`);
        dl.append('dd').text(value.length);
    });
}
// create STREAMGRAPH --------------------------------------------------------------------------------
function createStreamGraph() {
    const width = 1000;
    const height = 500;
    const margin = { top: 20, right: 30, bottom: 40, left: 40 };

    const svg = d3
        .select('#stream')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');
    
    const ageBins = d3.group(data, d => {
        const binStart = Math.floor(d.age / 5) * 5;
        const binEnd = binStart + 4;
        return `${binStart}-${binEnd}`;
    });

    const ageBinKeys = Array.from(ageBins.keys()).sort((a, b) => d3.ascending(Number(a.split('-')[0]), Number(b.split('-')[0])));
    const optypes = Array.from(new Set(data.map(d => d.optype))).sort(d3.descending);
    
    // reorderthe data to make sure it's stacked in the correct order
    const orderedAgeBins = ageBinKeys.map(key => ageBins.get(key));

    const stack = d3.stack()
        .keys(optypes)
        .value((d, key) => d.filter(v => v.optype === key).length);

    const series = stack(orderedAgeBins);

    // Set up scales for axes
    const xScale = d3.scaleBand()
        .domain(ageBinKeys)  // Keep this as is for correct axis order
        .range([margin.left, width - margin.right])
        .padding(0.1);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(series, d => d3.max(d, d => d[1]))])
        .range([height - margin.bottom, margin.top]);

    const color = d3.scaleOrdinal()
        .domain(optypes)
        .range(d3.schemePaired);

  // Draw the grid lines for the x-axis (without the spine)
    svg.append('g')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .attr('class', 'x-axis-grid')
    .call(d3.axisBottom(xScale).ticks(10).tickSize(-height + margin.top + margin.bottom))
    .style('stroke', 'lightgrey')  // Set light grey color for grid lines
    .style('stroke-opacity', 0.2); // Make the grid lines very faint

    // Draw the grid lines for the y-axis (without the spine)
    svg.append('g')
    .attr('transform', `translate(${margin.left},0)`)
    .attr('class', 'y-axis-grid')
    .call(d3.axisLeft(yScale).ticks(10).tickSize(-width + margin.left + margin.right))
    .style('stroke', 'lightgrey')  // Set light grey color for grid lines
    .style('stroke-opacity', 0.2); // Make the grid lines very faint

    // Remove the axis domain lines (spines)
    svg.selectAll('.domain').remove();

    // Change the font of the axis ticks to Roboto
    svg.selectAll('.tick text')
    .style('font-family', 'Sora')
    .style('font-size', '11px');  // Optional: adjust font size for readability


    // define mouseover event
    const mouseover = function(event,d) {
        tooltip.style("opacity", 1)
        d3.selectAll(".myArea").style("opacity", .2)
        d3.select(this)
          .style("stroke", "black")
          .style("opacity", 1)
      }

    const mousemove = function(event,d,i) {
        let grp = d.key
        tooltip.text(grp)
        tooltip.style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
      }
    const mouseleave = function(event,d) {
        tooltip.style("opacity", 0)
        d3.selectAll(".myArea").style("opacity", 1)
        d3.select(this).style("stroke", "none").style("opacity",1);
       }

    // Draw the area chart
    const area = d3.area()
        .x((d, i) => xScale(ageBinKeys[i]))  // Correct x-axis position for each bin
        .y0(d => yScale(d[0]))
        .y1(d => yScale(d[1]));

        svg.append('g')
        .selectAll('path')
        .data(series)
        .join('path')
        .attr('fill', d => color(d.key))
        .attr('d', area)
        .attr("class", "myArea")
        .on("mouseover", mouseover)
        .on("mousemove",mousemove)
        .on("mouseleave", mouseleave);
    

    

    // Draw the legend
    const legend = svg.append('g')
        .attr('transform', `translate(${width - margin.right + 40},${margin.top})`)
        .selectAll('g')
        .data(optypes)
        .join('g')
        .attr('transform', (d, i) => `translate(0,${i * 20})`);

    legend.append('rect')
        .attr('class', 'legend-rect')
        .attr('x', -25)
        .attr('width', 19)
        .attr('height', 19)
        .attr('fill', color)
        .style('rx', '25%');

    legend.append('text')
        .attr('x', 0)
        .attr('y', 9.5)
        .attr('dy', '0.32em')
        .text(d => d);

    // Add x-axis label
    svg.append('text')
        .attr('x', width / 2)  // Center horizontally
        .attr('y', margin.bottom + 465)  // Position below x-axis
        .attr('text-anchor', 'middle')
        .attr('font-size', '17px')
        .attr('fill', 'black')  // Set text color to grey
        .style('font-weight', 'lighter')  // Make text bold
        .text('Age');

    // Add y-axis label
    svg.append('text')
        .attr('transform', 'rotate(-90)')  // Rotate for vertical text
        .attr('y', margin.left - 55)  // Position left of y-axis
        .attr('x', -(height / 2))  // Center vertically
        .attr('text-anchor', 'middle')
        .attr('font-size', '17px')
        .attr('fill', 'black')  // Set text color to grey
        .style('font-weight', 'lighter')  // Make text bold
        .text('Number of Cases');
}

// Create surgical position visualization
function createSurgicalPositionViz() {
    // Set dimensions
    const width = 600;
    const height = 400;

    // Create SVGs for both plots
    const topSvg = d3.select("#topPositionPlot")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("border", "1px solid #ccc");

    const bottomSvg = d3.select("#bottomPositionPlot")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("border", "1px solid #ccc");

    // Load CSV and create dropdown
    d3.csv("data/cases_new.csv").then(function(data) {
        const positions = [...new Set(data.map(d => d.position))];
        
        const dropdown = d3.select(".position-dropdown")
            .append("select")
            .attr("id", "positionSelect")
            .style("width", "200px")
            .style("margin", "10px");

        dropdown.append("option")
            .text("Select Position")
            .attr("value", "");

        dropdown.selectAll("option.position")
            .data(positions)
            .enter()
            .append("option")
            .text(d => d)
            .attr("value", d => d);

        // Update function for position image
        function updatePositionImage(position) {
            bottomSvg.selectAll("*").remove();
            
            bottomSvg.append("image")
                .attr("xlink:href", `surgical positions/${position}.png`)
                .attr("width", width)
                .attr("height", height)
                .attr("preserveAspectRatio", "xMidYMid meet");
        }

        // Add dropdown event listener
        dropdown.on("change", function() {
            const selectedPosition = d3.select(this).property("value");
            console.log("Selected position:", selectedPosition);
            if (selectedPosition) {
                updatePositionImage(selectedPosition);
                console.log("Calling updateTopPlot with data:", data.length, "rows");
                updateTopPlot(data, selectedPosition, 'op_duration');
            }
        });
    });
}

function createSurgicalViz() {
    // Duration types configuration
    const durationTypes = [
        {id: 'op_duration', label: 'Operation Duration'},
        {id: 'case_duration', label: 'Case Duration'},
        {id: 'ane_duration', label: 'Anesthesia Duration'}
    ];

    // Create button container
    const buttonContainer = d3.select(".position-dropdown")
        .append("div")
        .attr("class", "duration-buttons");

    // Add duration buttons
    buttonContainer.selectAll("button")
        .data(durationTypes)
        .enter()
        .append("button")
        .attr("class", d => `duration-btn ${d.id}`)
        .classed("active", d => d.id === "op_duration")
        .text(d => d.label)
        .on("click", function(event, d) {
            // Update active state
            buttonContainer.selectAll(".duration-btn")
                .classed("active", false);
            d3.select(this).classed("active", true);
            
            // Update plot
            const selectedPosition = d3.select("#positionSelect").property("value");
            if (selectedPosition) {
                updateTopPlot(data, selectedPosition, d.id);
            }
        });

    // Update dropdown event listener
    dropdown.on("change", function() {
        const selectedPosition = d3.select(this).property("value");
        if (selectedPosition) {
            updatePositionImage(selectedPosition);
            const activeDurationType = d3.select(".duration-btn.active").datum().id;
            updateTopPlot(data, selectedPosition, activeDurationType);
        }
    });
}

function updateTopPlot(data, position, durationType) {
    const margin = { top: 40, right: 30, bottom: 40, left: 50 };
    const width = 800 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    // Get duration label
    const durationLabel = {
        'op_duration': 'Operation',
        'case_duration': 'Case',
        'ane_duration': 'Anesthesia'
    }[durationType];

    // Filter data for selected position and duration type
    const filteredData = data
        .filter(d => d.position === position)
        .map(d => +d[durationType]);

    // Create histogram bins
    const histogram = d3.histogram()
        .domain([0, d3.max(filteredData)])
        .thresholds(20); // 20 bins for duration distribution

    const bins = histogram(filteredData);

    // Clear existing plot
    d3.select("#topPositionPlot").selectAll("*").remove();

    // Create new SVG
    const svg = d3.select("#topPositionPlot")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Scales
    const x = d3.scaleLinear()
        .domain([0, d3.max(filteredData)])
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(bins, d => d.length)])
        .range([height, 0]);

    // Draw X-Axis
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(10).tickFormat(d => `${d}m`))
        .selectAll("text")
        .style("font-family", "Sora")
        .style("font-size", "11px");

    // Draw Y-Axis
    svg.append("g")
        .call(d3.axisLeft(y).ticks(10))
        .selectAll("text")
        .style("font-family", "Sora")
        .style("font-size", "11px");

    // Add X-Axis Grid Lines
    svg.append("g")
        .attr("class", "x-axis-grid")
        .attr("transform", `translate(0,${height})`)
        .call(
            d3.axisBottom(x)
                .ticks(10)
                .tickSize(-height)
                .tickFormat("")
        )
        .selectAll("line")
        .style("stroke", "lightgrey")
        .style("stroke-opacity", 0.2);

    // Add Y-Axis Grid Lines
    svg.append("g")
        .attr("class", "y-axis-grid")
        .call(
            d3.axisLeft(y)
                .ticks(10)
                .tickSize(-width)
                .tickFormat("")
        )
        .selectAll("line")
        .style("stroke", "lightgrey")
        .style("stroke-opacity", 0.2);

    // Remove axis domain lines (spines)
    svg.selectAll(".domain").remove();

    // Add bars
    svg.selectAll("rect")
        .data(bins)
        .enter()
        .append("rect")
        .attr("x", d => x(d.x0))
        .attr("width", d => x(d.x1) - x(d.x0))
        .attr("y", d => y(d.length))
        .attr("height", d => height - y(d.length))
        .attr("fill", "#69b3a2")
        .on("mouseover", function (event, d) {
            d3.select(this).attr("opacity", 0.8);
            svg.append("text")
                .attr("class", "tooltip")
                .attr("x", x(d.x0) + (x(d.x1) - x(d.x0)) / 2)
                .attr("y", y(d.length) - 5)
                .attr("text-anchor", "middle")
                .style("font-size", "12px")
                .text(`${d.length} cases: ${Math.round(d.x0)}-${Math.round(d.x1)} mins`);
        })
        .on("mouseout", function () {
            d3.select(this).attr("opacity", 1);
            svg.selectAll(".tooltip").remove();
        });

    // Add title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -margin.top / 2)
        .attr("text-anchor", "middle")
        .attr("class", "plot-title")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text(`${durationLabel} Duration Distribution for ${position} Position`);
}
