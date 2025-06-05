const tooltip = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("position", "absolute")
  .style("display", "none")
  .style("padding", "8px")
  .style("background", "#fff")
  .style("border", "1px solid #ccc")
  .style("pointer-events", "none")
  .style("font-family", "sans-serif")
  .style("font-size", "14px")
  .style("border-radius", "4px")
  .style("box-shadow", "0 0 4px rgba(0,0,0,0.2)")


function renderExamCharts(hrSvgSelector, tempSvgSelector, legendContainer, exam = 'midterm1') {
  // 
  const margin = { top: 20, right: 30, bottom: 30, left: 60 };
  const svgWidth = 800, svgHeight = 300;
  const width = svgWidth - margin.left - margin.right;
  const height = svgHeight - margin.top - margin.bottom;

  const svgHR = d3.select(hrSvgSelector).attr("width", svgWidth).attr("height", svgHeight);
  const svgTemp = d3.select(tempSvgSelector).attr("width", svgWidth).attr("height", svgHeight);

  svgHR.selectAll("*").remove();
  svgTemp.selectAll("*").remove();

  const gHR = svgHR.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const gTemp = svgTemp.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  gHR.append("rect")
  .attr("width", width)
  .attr("height", height)
  .style("fill", "none")
  .style("pointer-events", "all");

  const color = d3.scaleOrdinal(d3.schemeObservable10);
  let studentSet = new Set(['S1','S2','S3','S4','S5','S6','S7','S8','S9','S10']);

  function parseTime(d) {
    const [h, m, s] = d.split(':').map(Number);
    return new Date(2023, 0, 1, h, m, s || 0);
  }

  Promise.all([
        d3.csv(`data/${exam}_combined.csv`),
        d3.csv(`data/mean_${exam}_hr.csv`),
        d3.csv(`data/mean_${exam}_temp.csv`)
    ]).then(([data, average_hr, average_temp]) => {
    data.forEach(d => {
      d.HeartRate = +d['Heart Rate'];
      d.Temperature = +d.Temperature;
      d.Time = parseTime(d.Time);
    });

    const students = [...new Set(data.map(d => d.Student))].filter(s => studentSet.has(s));
    const grouped = d3.group(data, d => d.Student);

    const x = d3.scaleTime().domain(d3.extent(data, d => d.Time)).range([0, width]);
    const yHR = d3.scaleLinear().domain([50, 190]).range([height, 0]);
    const yTemp = d3.scaleLinear().domain([18, 39]).range([height, 0]);

    const lineHR = d3.line().x(d => x(d.Time)).y(d => yHR(d.HeartRate));
    const lineTemp = d3.line().x(d => x(d.Time)).y(d => yTemp(d.Temperature));

    // Draw lines
    students.forEach(s => {
      gHR.append("path").datum(grouped.get(s))
        .attr("fill", "none")
        .attr("stroke", color(s))
        .attr("stroke-width", 2)
        .attr("d", lineHR)
        .attr("class", `line-hr-${s}`);

      gTemp.append("path").datum(grouped.get(s))
        .attr("fill", "none")
        .attr("stroke", color(s))
        .attr("stroke-width", 2)
        .attr("d", lineTemp)
        .attr("class", `line-temp-${s}`);
    });

    // Axes
    gHR.append("g").attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%H:%M")));
    gHR.append("g").call(d3.axisLeft(yHR));

    gTemp.append("g").attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%H:%M")));
    gTemp.append("g").call(d3.axisLeft(yTemp));

    // Labels
    gHR.append("text").attr("x", -margin.left + 10).attr("y", -10)
      .attr("font-size", "14px").text("Heart Rate (bpm)");
    gTemp.append("text").attr("x", -margin.left + 10).attr("y", -10)
      .attr("font-size", "14px").text("Temperature (°C)");
    gHR.append("text").attr("x", width / 2).attr("y", height + margin.bottom)
      .attr("text-anchor", "middle").attr("font-size", "14px")
      .text("Time");
    gTemp.append("text").attr("x", width / 2).attr("y", height + margin.bottom)
      .attr("text-anchor", "middle").attr("font-size", "14px")
      .text("Time");

    // Parse mean data (important!)
    average_hr.forEach(d => {
      d.Time = d3.timeParse("%H:%M:%S")(d.Time);
      d["Heart Rate"] = +d["Heart Rate"];
    });
    average_temp.forEach(d => {
      d.Time = d3.timeParse("%H:%M:%S")(d.Time);
      d.Temperature = +d.Temperature;
    });

    gHR.append("path")
      .datum(average_hr)
      .attr("fill", "none")
      .attr("stroke", "black")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,5")
      .attr("d", d3.line()
        .x(d => x(d.Time))
        .y(d => yHR(d["Heart Rate"]))
      )
      .attr("class", `line-hr-mean`);
;
    
    gTemp.append("path")
      .datum(average_temp)
      .attr("fill", "none")
      .attr("stroke", "black")
      .attr("stroke-width", 2)
      .attr("d", d3.line()
        .x(d => x(d.Time))
        .y(d => yTemp(d.Temperature))
      )
      .attr("class", `line-temp-mean`);



    // Tooltip setup
    const yScaleHR = yHR;
    const yScaleTemp = yTemp;

    const tooltipDotsHR = {};
    const tooltipDotsTemp = {};

    students.forEach(s => {
      tooltipDotsHR[s] = gHR.append("circle")
        .attr("r", 5)
        .attr("fill", "none")
        .attr("stroke-width", 2)
        .style("display", "none");

      tooltipDotsTemp[s] = gTemp.append("circle")
        .attr("r", 5)
        .attr("fill", "none")
        .attr("stroke-width", 2)
        .style("display", "none");
    });

    const hoverLineHR = gHR.append("line")
      .attr("stroke", "gray")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4")
      .style("display", "none")
      .attr("y1", 0)
      .attr("y2", height);

    const hoverLineTemp = gTemp.append("line")
      .attr("stroke", "gray")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4")
      .style("display", "none")
      .attr("y1", 0)
      .attr("y2", height);

    // Create tooltip div if not already
    let tooltip = d3.select(".tooltip");
    if (tooltip.empty()) {
      tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("display", "none")
        .style("padding", "8px")
        .style("background", "#fff")
        .style("border", "1px solid #ccc")
        .style("pointer-events", "none")
        .style("font-family", "sans-serif")
        .style("font-size", "14px")
        .style("border-radius", "4px")
        .style("box-shadow", "0 0 4px rgba(0,0,0,0.2)");
    }

    gHR.on("mousemove", function (event) {
      const [mouseX] = d3.pointer(event);
      const time = x.invert(mouseX);

      const selected = [...clickedStudents];
      if (selected.length === 0) {
        tooltip.style("display", "none");
        Object.values(tooltipDotsHR).forEach(dot => dot.style("display", "none"));
        Object.values(tooltipDotsTemp).forEach(dot => dot.style("display", "none"));
        hoverLineHR.style("display", "none");
        hoverLineTemp.style("display", "none");
        return;
      }

      // Show vertical lines
      const xPos = x(time);
      hoverLineHR.attr("x1", xPos).attr("x2", xPos).style("display", "block");
      hoverLineTemp.attr("x1", xPos).attr("x2", xPos).style("display", "block");

      // Generate tooltip HTML
      let html = "";

      selected.forEach(student => {
        const series = grouped.get(student);
        if (!series) return;

        const closest = series.reduce((a, b) =>
          Math.abs(b.Time - time) < Math.abs(a.Time - time) ? b : a);

        const xVal = x(closest.Time);
        const yHRVal = yHR(closest.HeartRate);
        const yTempVal = yTemp(closest.Temperature);
        const studentColor = color(student);
        const score = studentScores[student]?.[exam] ?? "N/A";

        tooltipDotsHR[student]
          .attr("cx", xVal)
          .attr("cy", yHRVal)
          .attr("stroke", studentColor)
          .style("display", "block");

        tooltipDotsTemp[student]
          .attr("cx", xVal)
          .attr("cy", yTempVal)
          .attr("stroke", studentColor)
          .style("display", "block");

        html += `<b style="color:${studentColor}">${student}</b><br>
                Heart Rate: ${Math.round(closest.HeartRate)} bpm<br>
                Temperature: ${closest.Temperature.toFixed(1)} °C<br>
                Score: ${score}<br><br>`;
      });

      tooltip
        .style("display", "block")
        .style("left", (event.pageX + 12) + "px")
        .style("top", (event.pageY - 40) + "px")
        .html(html);
    });


    gHR.on("mouseout", () => {
      tooltip.style("display", "none");
      Object.values(tooltipDotsHR).forEach(dot => dot.style("display", "none"));
      Object.values(tooltipDotsTemp).forEach(dot => dot.style("display", "none"));
      hoverLineHR.style("display", "none");
      hoverLineTemp.style("display", "none");
    });

    const studentsSorted = students.slice().sort((a, b) => +a.slice(1) - +b.slice(1));

    const scoreLabelFor = s => {
      const examKey = exam.toLowerCase();
      return studentScores[s]?.[examKey] ? ` (Score: ${studentScores[s][examKey]})` : "";
    };

    let clickedStudents = new Set();

    function updateLineVisibility() {
      students.forEach(s => {
        const isActive = clickedStudents.size === 0 || clickedStudents.has(s);
        svgHR.selectAll(`.line-hr-${s}`).attr("opacity", isActive ? 1 : 0.1);
        svgTemp.selectAll(`.line-temp-${s}`).attr("opacity", isActive ? 1 : 0.1);
      });

      const isAverageActive = clickedStudents.size === 0 || clickedStudents.has('average');
      svgHR.selectAll(`.line-hr-mean`).attr("opacity", isAverageActive ? 1 : 0.1);
      svgTemp.selectAll(`.line-temp-mean`).attr("opacity", isAverageActive ? 1 : 0.1);
    }
    // Legend
    const legend = d3.select(legendContainer).html("");
    studentsSorted.forEach(s => {
      const item = legend.append("div").attr("class", "legend-item").style("cursor", "pointer");

      item.append("span")
        .style("background-color", color(s))
        .style("width", "12px")
        .style("height", "12px")
        .style("display", "inline-block")
        .style("margin-right", "5px");

      item.append("span").text(`${s}${scoreLabelFor(s)}`);

      item
        .on("mouseenter", () => {
          students.forEach(other => {
            const active = other === s;
            svgHR.selectAll(`.line-hr-${other}`).attr("opacity", active ? 1 : 0.1);
            svgTemp.selectAll(`.line-temp-${other}`).attr("opacity", active ? 1 : 0.1);
          });
        })
        .on("mouseleave", () => {
          updateLineVisibility();
        })
        .on("click", function () {
          if (clickedStudents.has(s)) {
            clickedStudents.delete(s);
            d3.select(this).classed("selected", false);
          } else {
            clickedStudents.add(s);
            d3.select(this).classed("selected", true);
          }
          updateLineVisibility();
        });
    });

    // Add average lines to legend
    const averageItem = legend.append("div").attr("class", "legend-item").style("cursor", "pointer");

    averageItem.append("span")
      .style("background-color", "black")
      .style("width", "12px")
      .style("height", "12px")
      .style("display", "inline-block")
      .style("margin-right", "5px");

    averageItem.append("span").text("Class Average");

    averageItem
      .on("mouseenter", () => {
        svgHR.selectAll(`.line-hr-mean`).attr("opacity", 1);
        svgTemp.selectAll(`.line-temp-mean`).attr("opacity", 1);
      })
      .on("mouseleave", () => {
        updateLineVisibility();
      })
      .on("click", function () {
        if (clickedStudents.has('average')) {
          clickedStudents.delete('average');
          d3.select(this).classed("selected", false);
        } else {
          clickedStudents.add('average');
          d3.select(this).classed("selected", true);
        }
        updateLineVisibility();
      });

    updateLineVisibility();
  });
}