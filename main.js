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
    
    // displayStats();
    // createStreamGraph();
    createRidgeline();
    createSurgicalPositionViz();
    createSurgicalViz();
    testMortality();
  }


// execute loadData when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();      
});

// scrolling behavior ----------------------------------------------------------------------------------------------
// Wait for the DOM to fully load
document.addEventListener("DOMContentLoaded", function() {
    // Get the scrollArrow and opening2 elements
    const scrollArrow = document.getElementById("scrollArrow");
    const opening2 = document.getElementById("opening2");
  
    // Add event listener to scrollArrow for the click event
    scrollArrow.addEventListener("click", function() {
      // Scroll to the opening2 element smoothly
      opening2.scrollIntoView({
        behavior: "smooth",  // Smooth scrolling
        block: "start"       // Align to the top of the viewport
      });
    });
  });

  document.addEventListener("DOMContentLoaded", function() {
    // Get the scrollArrow and opening2 elements
    const scrollArrow2 = document.getElementById("scrollArrow2");
    const start = document.getElementById("start");
  
    // Add event listener to scrollArrow for the click event
    scrollArrow2.addEventListener("click", function() {
      // Scroll to the opening2 element smoothly
      start.scrollIntoView({
        behavior: "smooth",  // Smooth scrolling
        block: "start"       // Align to the top of the viewport
      });
    });
  });
  

  document.addEventListener("DOMContentLoaded", function() {
    // Get the scrollArrow and opening2 elements
    const scrollArrow3 = document.getElementById("scrollArrow3");
    const start = document.getElementById("opening4");
  
    // Add event listener to scrollArrow for the click event
    scrollArrow3.addEventListener("click", function() {
      // Scroll to the opening2 element smoothly
      start.scrollIntoView({
        behavior: "smooth",  // Smooth scrolling
        block: "start"       // Align to the top of the viewport
      });
    });
  });
  

  document.addEventListener("DOMContentLoaded", function() {
    // Get the scrollArrow and opening2 elements
    const scrollArrow4 = document.getElementById("scrollArrow4");
    const start = document.getElementById("opening5");
  
    // Add event listener to scrollArrow for the click event
    scrollArrow4.addEventListener("click", function() {
      // Scroll to the opening2 element smoothly
      start.scrollIntoView({
        behavior: "smooth",  // Smooth scrolling
        block: "start"       // Align to the top of the viewport
      });
    });
  });
  

// create ridgeline ---------------------------------------------------------------------
function createRidgeline() {
    // Filter data to ensure there is valid optype and age
    data = data.filter(d => d.optype && d.age != null); 
    const width = 750;
    const height = 400;
    const margin = { top: 20, right: 30, bottom: 40, left: 110 };

    // Create a map to store the count of cases for each age
    const ageCounts = d3.rollup(
        data,
        v => v.length, // Count the number of cases for each age
        d => d.age // Group by age
    );

    const svg = d3
        .select('#stream')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .attr('class', 'ridgeline')
        .append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`)
        .style('overflow', 'visible');;

    // Get the distinct values of optype (categories)
    const optypes = Array.from(new Set(data.map(d => d.optype))).sort(d3.ascending);

    // Define the kernel density estimator function
    function kernelDensityEstimator(kernel, X) {
        return function (V) {
            return X.map(function (x) {
                return [x, d3.mean(V, function (v) { return kernel(x - v); })];
            });
        };
    }

    // Kernel function for Epanechnikov kernel (used for density estimation)
    function kernelEpanechnikov(k) {
        return function (v) {
            return Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0;
        };
    }

    // Find the min and max age in the data
    const minAge = d3.min(data, d => d.age);
    const maxAge = d3.max(data, d => d.age);

    // Set up scales for axes
    const xScale = d3.scaleLinear()
        .domain([minAge, maxAge])  // Set the domain based on the min and max age
        .range([0, width]);

    const yCategoryScale = d3.scaleBand()
        .domain(optypes)
        .range([0, height])
        .padding(0.1);  // Reduce the padding to decrease the gap between ridgelines
    

    // Compute kernel density estimation for each optype (category)
    const kde = kernelDensityEstimator(kernelEpanechnikov(7), xScale.ticks(100));  // 100 ticks for density estimation
    const allDensity = [];
    
    optypes.forEach(key => {
        const ageData = data.filter(d => d.optype === key).map(d => d.age);
        if (ageData.length > 0) {
            const density = kde(ageData);
            allDensity.push({ key, density });
        } else {
            console.warn(`No data for optype: ${key}`);
        }
    });
    
    // Add tooltip with enhanced styling
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background", "linear-gradient(to bottom, #ffffff, #f5f5f5)")
        .style("border", "1px solid rgba(0,0,0,0.1)")
        .style("border-radius", "6px")
        .style("padding", "12px")
        .style("box-shadow", "2px 2px 6px rgba(0, 0, 0, 0.1)")
        .style("font-family", "Sora")
        .style("font-size", "12px")
        .style("line-height", "1.4")
        .style("transition", "opacity 0.2s")
        .style("pointer-events", "none")
        .style("z-index", "1000");

    // Update mouseover events
    const mouseover = function(event, d) {
        tooltip.style("opacity", 1);
        d3.selectAll(".myArea").style("opacity", .2);
        d3.select(this)
            .style("stroke", "black")
            .style("opacity", 1);
    };

    const mousemove = function(event, d) {
        const [x] = d3.pointer(event, this);
        const hoveredAge = Math.round(xScale.invert(x));
        const count = ageCounts.get(hoveredAge) || 0;

        tooltip.html(`
            <div style="font-weight: bold; color: ${colorScale(d.key)}; margin-bottom: 5px">
                ${d.key}
            </div>
            <div style="color: #666">
                Age: <span style="color: #333; font-weight: 600">${hoveredAge}</span>
            </div>
            <div style="color: #666">
                Cases: <span style="color: #333; font-weight: 600">${count}</span>
            </div>
        `)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px");
    };

    const mouseleave = function(event, d) {
        tooltip.style("opacity", 0);
        d3.selectAll(".myArea").style("opacity", .7);
        d3.select(this).style("opacity", .7);
    };


    // Define yScale for density values AFTER allDensity is populated
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(allDensity, d => d3.max(d.density, v => v[1]))])
        .range([yCategoryScale.bandwidth(), 0]);  // Invert the range for proper alignment

    

    // Add areas (the ridgelines)
    svg.selectAll('.area')
        .data(allDensity)
        .join('path')
        .attr('transform', function(d) {
            // Position each ridgeline at the correct y-coordinate for its optype
            return `translate(0, ${yCategoryScale(d.key)})`;
        })
        .attr('fill', d => colorScale(d.key))
        .attr('stroke', '#000')
        .attr('stroke-width', 1)
        .attr('opacity', 0.8)
        .attr('d', function(d) {
            const line = d3.line()
                .curve(d3.curveBasis)
                .x(function (d) { return xScale(d[0]); })  // X position based on age
                .y(function (d) { return 1.7*yScale(d[1]) - 20; });  // Y position based on density

            return line(d.density);
        })
        .attr("class", "myArea")
        .on("mouseover", mouseover)
        .on("mousemove",mousemove)
        .on("mouseleave", mouseleave);

    // Add x-axis
    svg.append('g')
        .attr('class','ridge-x')
        .attr('transform', `translate(0, ${height})`)
        .call(d3.axisBottom(xScale));

    // Add y-axis for categories
    const yAxis = svg.append('g')
        .call(d3.axisLeft(yCategoryScale))
        .attr('class','ridge')
        .attr('transform', `translate(-10, 0)`);  // Adjust x position for better alignment

    // Adjust positioning of tick labels to align them with the bottom of the ridgelines
    yAxis.selectAll('.tick text')
        .style('font-family', 'Sora')
        .style('font-size', '11px')
        .attr('transform', `translate(0, ${yCategoryScale.bandwidth() / 2})`); // Center labels vertically in the band

    // Add x-axis label
    svg.append('text')
        .attr('x', width / 2 - 20)
        .attr('y', height + margin.bottom-5)
        .attr('text-anchor', 'middle')
        .attr('font-size', '17px')
        .attr('fill', 'black')
        .style('font-weight', 'lighter')
        .text('Age');

    // Add y-axis label
    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', margin.left-230)
        .attr('x', -(height / 2))
        .attr('text-anchor', 'middle')
        .attr('font-size', '17px')
        .attr('fill', 'black')
        .style('font-weight', 'lighter')
        .text('Operation Type');



    // Change the font of the axis ticks to Roboto
    svg.selectAll('.tick text')
    .style('font-family', 'Sora')
    .style('font-size', '11px');  // Optional: adjust font size for readability
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

    console.log(xScale.domain());

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
        .attr('y', margin.bottom + 485)  // Position below x-axis
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
        // .style("border", "1px solid #ccc");

    const bottomSvg = d3.select("#bottomPositionPlot")
        .append("svg")
        .attr("width", width/2)
        .attr("height", height/2)
        // .style("border", "1px solid #ccc")
        .attr("transform", `translate(0,-80)`);

    // Load CSV and create dropdown
    d3.csv("data/cases_new.csv").then(function(data) {
        const positions = [...new Set(data.map(d => d.position))]
            .filter(pos => pos.toLowerCase() !== "sitting");  // Remove sitting position
        
        const dropdown = d3.select(".position-dropdown")
            .append("select")
            .attr("id", "positionSelect")
            .style("width", "200px")
            .style("margin", "5px");

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
            
            const imageContainer = bottomSvg.append("g")
                .attr("transform", `translate(0,0)`);
                
            imageContainer.append("image")
                .attr("xlink:href", `surgical positions/${position}.png`)
                .attr("width", width/2)
                .attr("height", height/2)
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

    // // Create button container
    // const buttonContainer = d3.select(".position-dropdown")
    //     .append("div")
    //     .attr("class", "duration-buttons");

    // // Add duration buttons
    // buttonContainer.selectAll("button")
    //     .data(durationTypes)
    //     .enter()
    //     .append("button")
    //     .attr("class", d => `duration-btn ${d.id}`)
    //     .classed("active", d => d.id === "op_duration")
    //     .text(d => d.label)
    //     .on("click", function(event, d) {
    //         // Update active state
    //         buttonContainer.selectAll(".duration-btn")
    //             .classed("active", false);
    //         d3.select(this).classed("active", true);
            
    //         // Update plot
    //         const selectedPosition = d3.select("#positionSelect").property("value");
    //         if (selectedPosition) {
    //             updateTopPlot(data, selectedPosition, d.id);
    //         }
    //     });

    // Update dropdown event listener
    // dropdown.on("change", function() {
    //     const selectedPosition = d3.select(this).property("value");
    //     if (selectedPosition) {
    //         updatePositionImage(selectedPosition);
    //         const activeDurationType = d3.select(".duration-btn.active").datum().id;
    //         updateTopPlot(data, selectedPosition, activeDurationType);
    //     }
    // });
}

function updateTopPlot(data, position) {
    const margin = { top: 0, right: 30, bottom: 40, left: 110 };
    const width = 800 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    const durationTypes = [
        { id: 'op_duration', label: 'Operation' },
        { id: 'case_duration', label: 'Case' },
        { id: 'ane_duration', label: 'Anesthesia' }
    ];

    // Clear and create SVG
    d3.select("#topPositionPlot").selectAll("*").remove();
    const svg = d3.select("#topPositionPlot")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left}, -80)`);

    // Filter data
    const filteredData = data.filter(d => d.position === position);

    // X Scale (Duration)
    const xScale = d3.scaleLinear()
        .domain([0, d3.max(filteredData, d => Math.max(+d.op_duration, +d.case_duration, +d.ane_duration))])
        .range([0, width]);

    // Y Scale (Categories)
    const yScale = d3.scaleBand()
        .domain(durationTypes.map(d => d.label))
        .range([height, 0])
        .padding(0.5); // Adjust padding for correct ridgeline spacing

    // KDE Functions
    function kernelDensityEstimator(kernel, X) {
        return function (V) {
            return X.map(x => [x, d3.mean(V, v => kernel(x - v))]);
        };
    }

    function kernelEpanechnikov(k) {
        return v => Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0;
    }

    // Compute densities
    const kde = kernelDensityEstimator(kernelEpanechnikov(7), xScale.ticks(100));
    const densities = durationTypes.map(type => {
        const values = filteredData
            .map(d => +d[type.id])
            .filter(d => !isNaN(d));
        return {
            key: type.label,
            density: kde(values)
        };
    });

    // Color Scale
    const colorScale = d3.scaleOrdinal()
        .domain(durationTypes.map(d => d.label))
        .range(['#69b3a2', '#404080', '#e15759']);

    // Add tooltip div with enhanced styling
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background", "linear-gradient(to bottom, #ffffff, #f5f5f5)")
        .style("border", "1px solid rgba(0,0,0,0.1)")
        .style("border-radius", "6px")
        .style("padding", "12px")
        .style("box-shadow", "2px 2px 6px rgba(0, 0, 0, 0.1)")
        .style("font-family", "Sora")
        .style("font-size", "12px")
        .style("line-height", "1.4")
        .style("transition", "opacity 0.2s")
        .style("pointer-events", "none")
        .style("z-index", "1000");

    // Add Ridgeline Paths with tooltip
    svg.selectAll(".ridgeline")
        .data(densities)
        .join("path")
        .attr("transform", d => `translate(0, ${yScale(d.key) + yScale.bandwidth() / 2})`)
        .attr("fill", d => colorScale(d.key))
        .attr("opacity", 0.7)
        .attr("stroke", d => d3.rgb(colorScale(d.key)).darker(1))
        .attr("stroke-width", 1)
        .on("mouseover", function(event, d) {
            d3.select(this)
                .attr("opacity", 1)
                .attr("stroke-width", 2);
            tooltip.style("opacity", 1);
        })
        .on("mousemove", function(event, d) {
            const [x, y] = d3.pointer(event);
            const duration = Math.round(xScale.invert(x));
            const counts = filteredData.filter(data => 
                Math.abs(+data[durationTypes.find(t => t.label === d.key).id] - duration) < 5
            ).length;
            
            // Update tooltip content with styled HTML
            tooltip.html(`
                <div style="font-weight: bold; color: ${colorScale(d.key)}; margin-bottom: 5px">
                    ${d.key}
                </div>
                <div style="color: #666">
                    Duration: <span style="color: #333; font-weight: 600">${duration} mins</span>
                </div>
                <div style="color: #666">
                    Count: <span style="color: #333; font-weight: 600">${counts} cases</span>
                </div>
            `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function() {
            d3.select(this)
                .attr("opacity", 0.7)
                .attr("stroke-width", 1);
            tooltip.style("opacity", 0);
        })
        .attr("d", d => {
            const area = d3.area()
                .curve(d3.curveBasis)
                .x(d => xScale(d[0])) // X position based on duration
                .y0(yScale.bandwidth()+24)
                .y1(d => yScale.bandwidth()+24 - d[1] * yScale.bandwidth() * 80); // Adjust density scaling
            return area(d.density);
        });

    // Add X Axis
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale).ticks(6));

    // Add Y Axis (Categories)
    const yAxis = svg.append("g")
        .call(d3.axisLeft(yScale))
        .attr("transform", `translate(0, 0)`)
        .call(g => {
            g.select(".domain").remove();
            g.selectAll(".tick line")
                .attr("x2", width)
                .attr("stroke-opacity", 0.1)
                .attr("transform", `translate(0, ${yScale.bandwidth()+24})`);
        });

    // Style Y Axis Labels
    yAxis.selectAll(".tick text")
        .style("font-family", "Sora")
        .style("font-size", "11px")
        .attr("transform", `translate(0, ${yScale.bandwidth()+24})`); // Align text with ridgelines

    // X-Axis Label
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 35)
        .attr("text-anchor", "middle")
        .style("font-family", "Sora")
        .text("Duration (minutes)");

    // Y-Axis Label
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -margin.left + 15)
        .attr("text-anchor", "middle")
        .style("font-family", "Sora")
        .style("font-size", "12px")
        .text("Duration Type");

    // Title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", +100)
        .attr("text-anchor", "middle")
        .style("font-family", "Sora")
        .style("font-size", "14px")
        .text(`Duration Distributions for ${position} Position`);
}



// case duration???? ------------------------------------------------------------------------------------------
// Function to initialize the first density chart (for optype feature)
function testMortality() {
    const averageDuration = d3.mean(data, d => d.case_duration);
    createDensity(data, 'optype', 'selectable');
}

// Function to create the density chart based on the feature and chart container
function createDensity(data, feature, chartid) {
    const maxWidth = 500;  // Set maximum width
    const maxHeight = 300; // Set maximum height
    const margin = { top: 20, right: 50, bottom: 40, left: 80 }; // Adjust for axis labels
    const width = Math.min(maxWidth, 600) - margin.left - margin.right;
    const height = Math.min(maxHeight, 350) - margin.top - margin.bottom;
    

    const primaryChart = d3.select(`#${chartid}`)
    .append("svg")
    .attr("width", width + margin.left + margin.right)  // Ensure full space
    .attr("height", height + margin.top + margin.bottom) // Ensure full space
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

    let featureCounts = [];

    if (feature === 'age') {
        const ageBins = d3.group(data, d => {
            const binStart = Math.floor(d.age / 5) * 5;
            const binEnd = binStart + 4;
            return `${binStart}-${binEnd}`;
        });

        if (ageBins && ageBins.size > 0) {
            const ageBinKeys = Array.from(ageBins.keys()).sort((a, b) => d3.ascending(Number(a.split('-')[0]), Number(b.split('-')[0])));
            featureCounts = ageBinKeys.map(bin => ({ key: bin, count: ageBins.get(bin).length }));
        } else {
            console.error("No age bins found or ageBins is not iterable.");
            return;
        }
    } else {
        featureCounts = d3.rollup(
            data,
            v => v.length,
            d => d[feature]
        );

        if (featureCounts instanceof Map) {
            featureCounts = Array.from(featureCounts, ([key, count]) => ({ key, count }))
                .sort((a, b) => d3.descending(a.count, b.count));
        } else {
            console.error("featureCounts is not a valid Map.");
            return;
        }
    }

    const totalCount = d3.sum(featureCounts, d => d.count);
    const densityData = featureCounts.map(d => ({
        key: d.key,
        density: d.count / totalCount
    }));

    // Get number of unique y-axis values
    const numYLabels = densityData.length;

    // Set a base font size and scale it down as more labels are added
    const baseFontSize = 8;
    const minFontSize = 4;
    const yFontSize = Math.max(minFontSize, baseFontSize - 0.2 * (numYLabels - 10)); // Adjust scaling

    const x = d3.scaleLinear()
    .domain([0, d3.max(densityData, d => d.density)])
    .range([0, width]);  // Restrict width to max 500px

    const y = d3.scaleBand()
        .domain(densityData.map(d => d.key))
        .range([height, 0])  // Restrict height to max 300px
        .padding(0.1);

    //axes
// Remove x-axis since we are moving the density labels
    primaryChart.append("g")
        .attr("transform", `translate(0, ${height})`)
        .attr("class", "density-x")
        .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format(".0%")))
        .remove(); // This removes the x-axis labels


    primaryChart.append("g")
        .call(d3.axisLeft(y))
        .attr("class", "density-y")
        .selectAll("text")
        .style("font-family", "Sora")
        .style("font-size", `${yFontSize}px`);  // Dynamically adjust font size

    primaryChart.selectAll(".bar")
        .data(densityData)
        .join("rect")
        .attr("class", "bar")
        .attr("x", 0)
        .attr("y", d => y(d.key))
        .attr("width", d => x(d.density))
        .attr("height", y.bandwidth())
        .attr("fill", "black")
        .on('click', function(event) {
            const chartContainer = d3.select(this.parentNode); // Restrict selection to the clicked chart
        
            chartContainer.selectAll('.bar').style('fill', "black"); // Reset only bars in this chart
            d3.select(this).style('fill', 'crimson'); // Highlight clicked bar
        
            const key = d3.select(this).datum().key;
            const filteredData = data.filter(d => {
                if (feature === 'age') {
                    const binStart = Math.floor(d.age / 5) * 5;
                    const binEnd = binStart + 4;
                    return `${binStart}-${binEnd}` === key;
                }
                return d[feature] === key;
            });
        
            const avgDuration = filteredData.length > 0 
                ? d3.mean(filteredData, d => d.case_duration) 
                : 0;
        
            insertText('#survivability', `${avgDuration.toFixed(2)} Hours`);
        
            // Cascading logic
            if (feature === 'optype') {
                d3.select('#expandable').html('');
                insertText('#expandable', `What is the name of your operation?`);
                // insertText2('#primarysub', `You selected: ${key}`);
                createDensity(filteredData, 'opname', 'expandable');
            } else if (feature === 'opname') {
                d3.select('#expandable2').html('');
                insertText('#expandable2', `How old are you?`);
                createDensity(filteredData, 'age', 'expandable2');
            } else if (feature === 'age') {
                d3.select('#expandable3').html('');
                insertText('#expandable3', `What is your gender?`);
                createDensity(filteredData, 'sex', 'expandable3');
            }
        });
    
    primaryChart.selectAll(".bar-label")
        .data(densityData)
        .join("text")
        .attr("class", "bar-label")
        .attr("x", d => x(d.density) + 5) // Position to the right of the bar
        .attr("y", d => y(d.key) + y.bandwidth() / 2) // Center vertically within the bar
        .attr("dy", "0.35em") // Align text properly
        .style("font-family", "Sora")
        .style("font-size", `${yFontSize}px`)
        .style("fill", "black")
        .text(d => d3.format(".0%")(d.density)); // Format as percentage
    
        
}

// utlity function
function insertText(container, text) {
    d3.select(container)
        .selectAll("h5")
        .remove(); 

    d3.select(container)
        .append("h5")
        .attr('id', 'mortalitysub')
        .classed('mortalityverdict', container === "#survivability") // Conditionally set class
        .text(text);
}

