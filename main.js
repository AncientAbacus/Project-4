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

    // Draw the axes
    svg.append('g')
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(xScale))
        .select(".domain").remove()
        ;

    svg.append('g')
        .attr('transform', `translate(${margin.left},0)`)
        .call(d3.axisLeft(yScale))
        .select(".domain").remove();


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
        .attr('transform', `translate(${width - margin.right + 20},${margin.top})`)
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
        .attr('y', margin.left - 65)  // Position left of y-axis
        .attr('x', -(height / 2))  // Center vertically
        .attr('text-anchor', 'middle')
        .attr('font-size', '17px')
        .attr('fill', 'black')  // Set text color to grey
        .style('font-weight', 'lighter')  // Make text bold
        .text('Amount of Cases');
}
