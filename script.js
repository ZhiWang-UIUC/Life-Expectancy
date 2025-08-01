// === GLOBAL STATE ===
let currentScene = 0;
let dataGlobal = null;
let parameters = {
  selectedStatus: "Developed",
  yearRange: [2000, 2015],
  selectedCountries: [],
  selectedCountryForScene2: "China",
  selectedCountryForScene3: "India",
  selectedMetricForScene3: "gdp",

};

function initControls() {
  // Scene 1: Select country type
  d3.select("#scene1-controls").html(`
    <label>Status:
      <select id="statusSelect">
        <option value="Developed">Developed</option>
        <option value="Developing">Developing</option>
      </select>
    </label>
  `);
  d3.select("#statusSelect").on("change", function () {
    parameters.selectedStatus = this.value;
    renderScene(1);
  });

  // Scene 2: Select a single country
  const countries = Array.from(new Set(dataGlobal.map(d => d.country))).sort();
  d3.select("#scene2-controls").html(`
    <label>Country:
      <select id="countrySelectScene2">
        ${countries.map(c => `<option value="${c}">${c}</option>`).join("")}
      </select>
    </label>
  `);
  d3.select("#countrySelectScene2").on("change", function () {
    parameters.selectedCountryForScene2 = this.value;
    renderScene(2);
  });

  // Scene 3: 自由探索视图控件
  d3.select("#scene3-controls").html(`
    <label>Country:
      <select id="countrySelectScene3">
        ${countries.map(c => `<option value="${c}">${c}</option>`).join("")}
      </select>
    </label>
    <label>Metric:
      <select id="metricSelectScene3">
        <option value="gdp">GDP</option>
        <option value="alcohol">Alcohol Consumption</option>
        <option value="hiv_aids">HIV/AIDS Death Rate</option>
        <option value="schooling">Schooling</option>
      </select>
    </label>
  `);
  
  d3.select("#countrySelectScene3").on("change", function () {
    parameters.selectedCountryForScene3 = this.value;
    renderScene(3);
  });
  d3.select("#metricSelectScene3").on("change", function () {
    parameters.selectedMetricForScene3 = this.value;
    renderScene(3);
  });

}


// === LOAD DATA ===
d3.csv("data/life_expectancy_cleaned.csv").then(data => {
  data.forEach(d => {
    d.year = +d.year;
    d.life_expectancy = +d.life_expectancy;
    d.gdp = +d.gdp;
    d.alcohol = +d.alcohol;
    d.hiv_aids = +d.hiv_aids;
    d.population = +d.population;
    d.schooling = +d.schooling;
  });
  dataGlobal = data;
  initControls();
  renderScene(currentScene);
}).catch(err => {
  console.error("加载数据失败", err);
});

// === UI TRIGGERS ===
d3.select("#statusSelect").on("change", function () {
  parameters.selectedStatus = this.value;
  renderScene(currentScene);

});

d3.select("#countrySelectScene2").on("change", function () {
  parameters.selectedCountryForScene2 = this.value;
  renderScene(1);
});


// === SCENE CONTROL ===

function renderScene(scene) {
  d3.select("#viz").selectAll("*").remove();
  d3.select("#narrative").html("");

  d3.selectAll("#scene-controls > div").style("display", "none");
  d3.select(`#scene${scene}-controls`).style("display", "block");

  if (!dataGlobal) {
    d3.select("#narrative").text("loading data...");
    return;
  }

  if (scene === 0) {
    renderIntro();  
  } else if (scene === 1) {
    renderOverview();
  } else if (scene === 2) {
    renderGDPTrend();
  } else if (scene === 3) {
    renderExplorer();
  }
}

// scene 0 
function renderIntro() {
  d3.select("#narrative").html(`
    <h2>Global Life Expectancy Over Time</h2>
    <p>Life expectancy around the world has improved significantly over the past few decades. In this introductory scene, we look at the global average trend to set the stage for deeper exploration of regional and economic factors.</p>
  `);

  const svg = d3.select("#viz");
  const width = +svg.attr("width");
  const height = +svg.attr("height");
  const margin = { top: 50, right: 200, bottom: 50, left: 70 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  // 聚合为每年平均寿命
  const globalAvg = d3.rollups(
    dataGlobal.filter(d => !isNaN(d.life_expectancy)),
    v => d3.mean(v, d => d.life_expectancy),
    d => d.year
  ).map(([year, avg]) => ({ year: +year, life_expectancy: +avg }))
   .sort((a, b) => a.year - b.year);

  const x = d3.scaleLinear()
    .domain(d3.extent(globalAvg, d => d.year))
    .range([0, plotWidth]);

  const y = d3.scaleLinear()
    .domain([d3.min(globalAvg, d => d.life_expectancy) - 2,
             d3.max(globalAvg, d => d.life_expectancy) + 2])
    .range([plotHeight, 0]);

  const xAxis = d3.axisBottom(x).tickFormat(d3.format("d"));
  const yAxis = d3.axisLeft(y);

  g.append("g")
    .attr("transform", `translate(0,${plotHeight})`)
    .call(xAxis)
    .append("text")
    .attr("x", plotWidth / 2)
    .attr("y", 40)
    .attr("fill", "black")
    .attr("text-anchor", "middle")
    .text("Year");

  g.append("g")
    .call(yAxis)
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -plotHeight / 2)
    .attr("y", -50)
    .attr("fill", "black")
    .attr("text-anchor", "middle")
    .text("Global Life Expectancy");

  const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.life_expectancy));

  g.append("path")
    .datum(globalAvg)
    .attr("fill", "none")
    .attr("stroke", "purple")
    .attr("stroke-width", 2)
    .attr("d", line);

  // === annotation ===
  const first = globalAvg[0];
  const last = globalAvg[globalAvg.length - 1];

  const annotationBoxX = plotWidth + 20;
  const annotationY = 80;

  const annotationGroup = g.append("g").attr("class", "intro-annotation");

  annotationGroup.append("line")
    .attr("x1", x(last.year))
    .attr("y1", y(last.life_expectancy))
    .attr("x2", annotationBoxX)
    .attr("y2", annotationY)
    .attr("stroke", "gray")
    .attr("stroke-dasharray", "2,2");

  annotationGroup.append("text")
    .attr("x", annotationBoxX + 5)
    .attr("y", annotationY - 10)
    .attr("font-weight", "bold")
    .text("Global Trend");

  annotationGroup.append("text")
    .attr("x", annotationBoxX + 5)
    .attr("y", annotationY + 5)
    .attr("font-size", "10px")
    .text(`+${(last.life_expectancy - first.life_expectancy).toFixed(1)} yrs (${first.year}–${last.year})`);
}

//scens 1
function renderOverview() {
  d3.select("#narrative").html(`
    <h2>Life Expectancy Trends: ${parameters.selectedStatus} Countries</h2>
    <p>This scene shows how life expectancy changed from ${parameters.yearRange[0]} to ${parameters.yearRange[1]} in ${parameters.selectedStatus.toLowerCase()} countries. Overall, life expectancy has increased over time.</p>
  `);

  const svg = d3.select("#viz");
  const width = +svg.attr("width");
  const height = +svg.attr("height");
  const margin = { top: 50, right: 200, bottom: 50, left: 70 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  // metric 固定为 life_expectancy
  parameters.selectedMetric = 'life_expectancy';

  // 获取前5个国家
  const countryList = [...new Set(dataGlobal
    .filter(d => d.status === parameters.selectedStatus)
    .map(d => d.country))].slice(0, 5);

  parameters.selectedCountries = countryList;

  const filtered = dataGlobal.filter(d =>
    countryList.includes(d.country) &&
    d.year >= parameters.yearRange[0] &&
    d.year <= parameters.yearRange[1]
  );

  const dataByCountry = d3.groups(filtered, d => d.country);

  const x = d3.scaleLinear()
    .domain(parameters.yearRange)
    .range([0, plotWidth]);

  //const y = d3.scaleLinear()
 //   .domain([35, 95])
 //   .range([plotHeight, 0]);
  const y = d3.scaleLinear()
    .domain([
      d3.min(filtered, d => d.life_expectancy) - 2,
      d3.max(filtered, d => d.life_expectancy) + 2
    ])
    .range([plotHeight, 0]);



  const xAxis = d3.axisBottom(x).tickFormat(d3.format("d"));
  const yAxis = d3.axisLeft(y);

  g.append("g")
    .attr("transform", `translate(0,${plotHeight})`)
    .call(xAxis)
    .append("text")
    .attr("x", plotWidth / 2)
    .attr("y", 40)
    .attr("fill", "black")
    .attr("text-anchor", "middle")
    .text("Year");

  g.append("g")
    .call(yAxis)
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -plotHeight / 2)
    .attr("y", -50)
    .attr("fill", "black")
    .attr("text-anchor", "middle")
    .text("Life Expectancy");

  const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.life_expectancy));

  const color = d3.scaleOrdinal(d3.schemeCategory10).domain(countryList);

  g.selectAll(".line")
    .data(dataByCountry)
    .enter()
    .append("path")
    .attr("fill", "none")
    .attr("stroke", ([country]) => color(country))
    .attr("stroke-width", 2)
    .attr("d", ([, values]) => line(values));

  g.selectAll(".label")
    .data(dataByCountry)
    .enter()
    .append("text")
    .datum(([country, values]) => ({
      country,
      value: values[values.length - 1]
    }))
    .attr("transform", d => `translate(${x(d.value.year)},${y(d.value.life_expectancy)})`)
    .attr("x", 5)
    .attr("dy", "0.35em")
    .style("font-size", "10px")
    .text(d => d.country);


  // annotation
   const numAnnotations = 5;
  const spacing = 60;  // 注释之间的间距
  const annotationStartY = 50;  // 从图的顶部偏移开始
  const annotationBoxX = plotWidth + 10;  // 注释框固定在图的右边
  
  const topDeltaCountries = dataByCountry
    .map(([country, values]) => {
      const sorted = values
        .filter(d => !isNaN(d.life_expectancy))
        .sort((a, b) => a.year - b.year);
      if (sorted.length < 2) return null;
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const delta = last.life_expectancy - first.life_expectancy;
      return {
        country,
        first,
        last,
        delta,
        trend: delta >= 0 ? "increased" : "decreased"
      };
    })
    .filter(d => d !== null)
    .sort((a, b) => b.last.life_expectancy - a.last.life_expectancy)
    .slice(0, numAnnotations);
  
  // === 构造 Annotation 对象，使用固定位置 ===
  const annotations = topDeltaCountries.map((d, i) => {
    const fixedY = annotationStartY + i * spacing;
    return {
      note: {
        title: d.country,
        label: `Life Expectancy ${d.trend} by ${Math.abs(d.delta).toFixed(1)} yrs from ${d.first.year} to ${d.last.year}`,
        wrap: 140,
        align: "left",
        padding: 5
      },
      x: annotationBoxX,
      y: fixedY,
      data: {
        year: d.last.year,
        life_expectancy: d.last.life_expectancy
      },
      dx: annotationBoxX - x(d.last.year),
      dy: fixedY - y(d.last.life_expectancy),
      subject: { radius: 3 }
    };
  });
  
  const annotationGroup = g.append("g").attr("class", "manual-annotations");

topDeltaCountries.forEach((d, i) => {
  const noteY = annotationStartY + i * spacing;
  const noteX = plotWidth + 20;

  const dataX = x(d.last.year);
  const dataY = y(d.last.life_expectancy);

  // 画连接线
  annotationGroup.append("line")
    .attr("x1", dataX)
    .attr("y1", dataY)
    .attr("x2", noteX)
    .attr("y2", noteY)
    .attr("stroke", "gray")
    .attr("stroke-dasharray", "2,2");

  // 注释标题
  annotationGroup.append("text")
    .attr("x", noteX + 5)
    .attr("y", noteY - 10)
    .attr("font-weight", "bold")
    .attr("font-size", "11px")
    .text(d.country);

  // 注释正文
  annotationGroup.append("text")
    .attr("x", noteX + 5)
    .attr("y", noteY + 5)
    .attr("font-size", "10px")
    .text(`life expectancy ${d.trend === 'increased' ? 'rose' : 'fell'} by ${d.delta >= 0 ? '+' : '-'}${Math.abs(d.delta).toFixed(1)} year`)

  
});


}





// Scene 1: GDP Impact
function renderGDPTrend() {
  d3.select("#narrative").html(`
    <h2>Economic Growth and Life Expectancy in ${parameters.selectedCountryForScene2}</h2>
    <p>This scene explores how GDP growth and life expectancy evolved together in ${parameters.selectedCountryForScene2} between ${parameters.yearRange[0]} and ${parameters.yearRange[1]}. In many countries, rising economic output is accompanied by improvements in public health and longevity.</p>
  `);

  const svg = d3.select("#viz");
  const width = +svg.attr("width");
  const height = +svg.attr("height");
  const margin = { top: 50, right: 200, bottom: 50, left: 70 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const filtered = dataGlobal.filter(d =>
    d.country === parameters.selectedCountryForScene2 &&
    d.year >= parameters.yearRange[0] &&
    d.year <= parameters.yearRange[1]
  );

  const x = d3.scaleLinear()
    .domain(parameters.yearRange)
    .range([0, plotWidth]);

  const y1 = d3.scaleLinear()
    .domain([40, 90])  // 固定 y1 轴范围和 Scene 1 一致
    .range([plotHeight, 0]);

  const y2 = d3.scaleLinear()
    .domain([0, d3.max(dataGlobal, d => d.gdp) * 1.05]) // 用全局最大 GDP 保持统一对比
    .range([plotHeight, 0]);

  const xAxis = d3.axisBottom(x).tickFormat(d3.format("d"));
  const yAxisLeft = d3.axisLeft(y1);
  const yAxisRight = d3.axisRight(y2);

  g.append("g")
    .attr("transform", `translate(0,${plotHeight})`)
    .call(xAxis)
    .append("text")
    .attr("x", plotWidth / 2)
    .attr("y", 40)
    .attr("fill", "black")
    .attr("text-anchor", "middle")
    .text("Year");

  g.append("g")
    .call(yAxisLeft)
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -plotHeight / 2)
    .attr("y", -50)
    .attr("fill", "black")
    .attr("text-anchor", "middle")
    .text("Life Expectancy");

  g.append("g")
    .attr("transform", `translate(${plotWidth},0)`)
    .call(yAxisRight)
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -plotHeight / 2)
    .attr("y", 50)
    .attr("fill", "black")
    .attr("text-anchor", "middle")
    .text("GDP per Capita");

  // 折线图样式保持一致
  const lineLife = d3.line()
    .x(d => x(d.year))
    .y(d => y1(d.life_expectancy));

  const lineGDP = d3.line()
    .x(d => x(d.year))
    .y(d => y2(d.gdp));

  g.append("path")
    .datum(filtered)
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 2)
    .attr("d", lineLife);

  g.append("path")
    .datum(filtered)
    .attr("fill", "none")
    .attr("stroke", "orange")
    .attr("stroke-width", 2)
    .attr("d", lineGDP);

  // 注释
  const first = filtered[0];
  const last = filtered[filtered.length - 1];

  const annotationGroup = g.append("g").attr("class", "manual-annotations");

  const annotationBoxX = plotWidth + 20;
  const annotationStartY = 60;
  const spacing = 70;

  // 注释 1: Life Expectancy
  annotationGroup.append("line")
    .attr("x1", x(last.year))
    .attr("y1", y1(last.life_expectancy))
    .attr("x2", annotationBoxX)
    .attr("y2", annotationStartY)
    .attr("stroke", "gray")
    .attr("stroke-dasharray", "2,2");

  annotationGroup.append("text")
    .attr("x", annotationBoxX + 5)
    .attr("y", annotationStartY - 10)
    .attr("font-weight", "bold")
    .text("Life Expectancy");

  annotationGroup.append("text")
    .attr("x", annotationBoxX + 5)
    .attr("y", annotationStartY + 5)
    .attr("font-size", "10px")
    .text(`Improved by +${(last.life_expectancy - first.life_expectancy).toFixed(1)} yrs`);

  // 注释 2: GDP
  annotationGroup.append("line")
    .attr("x1", x(last.year))
    .attr("y1", y2(last.gdp))
    .attr("x2", annotationBoxX)
    .attr("y2", annotationStartY + spacing)
    .attr("stroke", "gray")
    .attr("stroke-dasharray", "2,2");

  annotationGroup.append("text")
    .attr("x", annotationBoxX + 5)
    .attr("y", annotationStartY + spacing - 10)
    .attr("font-weight", "bold")
    .attr("fill", "orange")
    .text("GDP per Capita");

  annotationGroup.append("text")
    .attr("x", annotationBoxX + 5)
    .attr("y", annotationStartY + spacing + 5)
    .attr("font-size", "10px")
    .text(`Increased by +${((last.gdp - first.gdp) / 1000).toFixed(1)}k USD`);
}



// Scene 2: Other Impact
function renderExplorer() {
  const country = parameters.selectedCountryForScene3;
  const metric = parameters.selectedMetricForScene3;
  const metricLabelMap = {
    gdp: "GDP per Capita",
    alcohol: "Alcohol Consumption (liters)",
    hiv_aids: "HIV/AIDS Death Rate",
    schooling: "Years of Schooling"
  };

  d3.select("#narrative").html(`
    <h2>Exploring ${country}: Life Expectancy vs. ${metricLabelMap[metric]}</h2>
    <p>This scene allows you to explore how life expectancy relates to <strong>${metricLabelMap[metric]}</strong> in ${country} from ${parameters.yearRange[0]} to ${parameters.yearRange[1]}. Observe whether both improved in parallel or diverged.</p>
  `);

  const svg = d3.select("#viz");
  const width = +svg.attr("width");
  const height = +svg.attr("height");
  const margin = { top: 50, right: 200, bottom: 50, left: 70 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const filtered = dataGlobal.filter(d =>
    d.country === country &&
    d.year >= parameters.yearRange[0] &&
    d.year <= parameters.yearRange[1]
  );

  const x = d3.scaleLinear()
    .domain(parameters.yearRange)
    .range([0, plotWidth]);

  const y1 = d3.scaleLinear()
    .domain([40, 90])  // 与前面统一
    .range([plotHeight, 0]);

  const y2 = d3.scaleLinear()
    .domain([0, d3.max(dataGlobal, d => d[metric]) * 1.05])
    .range([plotHeight, 0]);

  const xAxis = d3.axisBottom(x).tickFormat(d3.format("d"));
  const yAxisLeft = d3.axisLeft(y1);
  const yAxisRight = d3.axisRight(y2);

  g.append("g")
    .attr("transform", `translate(0,${plotHeight})`)
    .call(xAxis)
    .append("text")
    .attr("x", plotWidth / 2)
    .attr("y", 40)
    .attr("fill", "black")
    .attr("text-anchor", "middle")
    .text("Year");

  g.append("g")
    .call(yAxisLeft)
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -plotHeight / 2)
    .attr("y", -50)
    .attr("fill", "black")
    .attr("text-anchor", "middle")
    .text("Life Expectancy");

  g.append("g")
    .attr("transform", `translate(${plotWidth},0)`)
    .call(yAxisRight)
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -plotHeight / 2)
    .attr("y", 50)
    .attr("fill", "black")
    .attr("text-anchor", "middle")
    .text(metricLabelMap[metric]);

  const lineLife = d3.line()
    .x(d => x(d.year))
    .y(d => y1(d.life_expectancy));

  const lineMetric = d3.line()
    .x(d => x(d.year))
    .y(d => y2(d[metric]));

  g.append("path")
    .datum(filtered)
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 2)
    .attr("d", lineLife);

  g.append("path")
    .datum(filtered)
    .attr("fill", "none")
    .attr("stroke", "darkorange")
    .attr("stroke-width", 2)
    .attr("d", lineMetric);

  // === 注释 ===
  const first = filtered[0];
  const last = filtered[filtered.length - 1];
  const annotationGroup = g.append("g");

  const annotationBoxX = plotWidth + 20;
  const annotationStartY = 60;
  const spacing = 70;

  annotationGroup.append("line")
    .attr("x1", x(last.year))
    .attr("y1", y1(last.life_expectancy))
    .attr("x2", annotationBoxX)
    .attr("y2", annotationStartY)
    .attr("stroke", "gray")
    .attr("stroke-dasharray", "2,2");

  annotationGroup.append("text")
    .attr("x", annotationBoxX + 5)
    .attr("y", annotationStartY - 10)
    .attr("font-weight", "bold")
    .text("Life Expectancy");

  annotationGroup.append("text")
    .attr("x", annotationBoxX + 5)
    .attr("y", annotationStartY + 5)
    .attr("font-size", "10px")
    .text(`+${(last.life_expectancy - first.life_expectancy).toFixed(1)} yrs`);

  annotationGroup.append("line")
    .attr("x1", x(last.year))
    .attr("y1", y2(last[metric]))
    .attr("x2", annotationBoxX)
    .attr("y2", annotationStartY + spacing)
    .attr("stroke", "gray")
    .attr("stroke-dasharray", "2,2");

  annotationGroup.append("text")
    .attr("x", annotationBoxX + 5)
    .attr("y", annotationStartY + spacing - 10)
    .attr("font-weight", "bold")
    .attr("fill", "darkorange")
    .text(metricLabelMap[metric]);

  annotationGroup.append("text")
    .attr("x", annotationBoxX + 5)
    .attr("y", annotationStartY + spacing + 5)
    .attr("font-size", "10px")
    .text(`${metricLabelMap[metric]} ↑ by ${((last[metric] - first[metric]) || 0).toFixed(1)}`);
}

