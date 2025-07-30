// === Global Variables ===
let currentScene = 0;
let dataGlobal = null;

// Parameter object to track visualization state
let parameters = {
  selectedStatus: "Developed",  // "Developed", "Developing"
  selectedMetric: "life_expectancy",  // Could be gdp, alcohol, etc.
  yearRange: [2000, 2015],
  selectedCountries: [] // dynamically updated
};

// === Load CSV Data ===
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
  updateSelectedCountries();
  renderScene(currentScene);
});

function updateSelectedCountries() {
  const countries = [...new Set(dataGlobal
    .filter(d => d.status === parameters.selectedStatus)
    .map(d => d.country))];
  parameters.selectedCountries = countries.slice(0, 5); // max 5
}

// === Scene Dispatcher ===
function renderScene(scene) {
  d3.select("#viz").selectAll("*").remove();
  d3.select("#narrative").html("");
  if (!dataGlobal) return;
  if (scene === 0) renderOverview();
  else if (scene === 1) renderScene2();
  else if (scene === 2) renderScene3();
}

// === Scene 1 ===
function renderOverview() {
  d3.select("#narrative").html(`
    <h2>Life Expectancy Trend (${parameters.selectedStatus} Countries)</h2>
    <p>This chart shows how ${parameters.selectedStatus.toLowerCase()} countries have changed in terms of ${parameters.selectedMetric.replace("_", " ")} from ${parameters.yearRange[0]} to ${parameters.yearRange[1]}.</p>
  `);

  const svg = d3.select("#viz");
  const width = +svg.attr("width");
  const height = +svg.attr("height");
  const margin = {top: 50, right: 160, bottom: 60, left: 70};
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const filtered = dataGlobal.filter(d =>
    parameters.selectedCountries.includes(d.country) &&
    d.year >= parameters.yearRange[0] && d.year <= parameters.yearRange[1] &&
    !isNaN(d[parameters.selectedMetric])
  );

  const dataByCountry = d3.groups(filtered, d => d.country);

  const x = d3.scaleLinear()
    .domain(parameters.yearRange)
    .range([0, plotWidth]);

  const y = d3.scaleLinear()
    .domain(d3.extent(filtered, d => d[parameters.selectedMetric])).nice()
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
    .text(parameters.selectedMetric.replace("_", " "));

  const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(d[parameters.selectedMetric]));

  const color = d3.scaleOrdinal(d3.schemeCategory10);

  g.selectAll(".line")
    .data(dataByCountry)
    .enter()
    .append("path")
    .attr("fill", "none")
    .attr("stroke", ([country]) => color(country))
    .attr("stroke-width", 2)
    .attr("d", ([, values]) => line(values));

  // Annotation (1 example)
  const exampleCountry = dataByCountry[0][0];
  const latestData = dataByCountry[0][1].find(d => d.year === parameters.yearRange[1]);
  const annotations = [
    {
      note: {
        title: exampleCountry,
        label: `${parameters.selectedMetric.replace("_", " ")} in ${parameters.yearRange[1]} was ${latestData[parameters.selectedMetric].toFixed(1)}`
      },
      x: x(latestData.year),
      y: y(latestData[parameters.selectedMetric]),
      dy: -30,
      dx: 30
    }
  ];

  const makeAnnotations = d3.annotation()
    .type(d3.annotationCalloutCircle)
    .annotations(annotations);

  g.append("g").call(makeAnnotations);
}

// === UI Triggers ===
d3.select("#statusSelect").on("change", function() {
  parameters.selectedStatus = this.value;
  updateSelectedCountries();
  renderScene(currentScene);
});

d3.select("#metricSelect").on("change", function() {
  parameters.selectedMetric = this.value;
  renderScene(currentScene);
});

d3.select("#nextBtn").on("click", function() {
  currentScene = Math.min(currentScene + 1, 2);
  renderScene(currentScene);
});

d3.select("#prevBtn").on("click", function() {
  currentScene = Math.max(currentScene - 1, 0);
  renderScene(currentScene);
});




// Scene 1: GDP Impact
function renderGDPImpact() {
  d3.select("#narrative").html(`
    <h2>GDP Impact vs Life Expectancy</h2>
    <p>This scene explores the relationship between GDP and life expectancy.</p>
  `);

  const svg = d3.select("#viz");
  const width = +svg.attr("width");
  const height = +svg.attr("height");
  const margin = {top: 50, right: 40, bottom: 60, left: 70};
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  // 过滤数据
  const filtered = dataGlobal.filter(d => d.alcohol >= 0 && d.life_expectancy > 0);

  // X 轴 - Alcohol consumption
  const x = d3.scaleLinear()
    .domain(d3.extent(filtered, d => d.alcohol))
    .range([0, plotWidth])
    .nice();

  // Y 轴 - Life expectancy
  const y = d3.scaleLinear()
    .domain(d3.extent(filtered, d => d.life_expectancy))
    .range([plotHeight, 0])
    .nice();

  // 轴
  g.append("g")
    .attr("transform", `translate(0,${plotHeight})`)
    .call(d3.axisBottom(x))
    .append("text")
    .attr("x", plotWidth / 2)
    .attr("y", 40)
    .attr("fill", "black")
    .attr("text-anchor", "middle")
    .text("Alcohol Consumption (liters per capita)");

  g.append("g")
    .call(d3.axisLeft(y))
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -plotHeight / 2)
    .attr("y", -50)
    .attr("fill", "black")
    .attr("text-anchor", "middle")
    .text("Life Expectancy");

  // 点
  g.selectAll("circle")
    .data(filtered)
    .enter()
    .append("circle")
    .attr("cx", d => x(d.alcohol))
    .attr("cy", d => y(d.life_expectancy))
    .attr("r", 5)
    .attr("fill", "orange")
    .attr("opacity", 0.7)
    .append("title")
    .text(d => `${d.country}\nAlcohol: ${d.alcohol}\nLife Expectancy: ${d.life_expectancy}`);

  // 简单注释
  const annotations = [
    {
      note: { label: "Some countries with higher alcohol consumption have lower life expectancy" },
      x: x(10),
      y: y(65),
      dy: -30,
      dx: 30
    }
  ];

  const makeAnnotations = d3.annotation()
    .annotations(annotations);

  g.append("g")
    .attr("class", "annotation-group")
    .call(makeAnnotations);
}

// Scene 2: Other Impact
function renderUserExplore() {
  d3.select("#narrative").html(`
    <h2>Other Impact on Life Expectancy</h2>
    <p>This scene shows how Other prevalence impacts life expectancy.</p>
  `);

  const svg = d3.select("#viz");
  const width = +svg.attr("width");
  const height = +svg.attr("height");
  const margin = {top: 50, right: 40, bottom: 60, left: 70};
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  // 过滤数据
  const filtered = dataGlobal.filter(d => d.hiv_aids >= 0 && d.life_expectancy > 0);

  // X 轴 - HIV/AIDS prevalence
  const x = d3.scaleLinear()
    .domain(d3.extent(filtered, d => d.hiv_aids))
    .range([0, plotWidth])
    .nice();

  // Y 轴 - Life expectancy
  const y = d3.scaleLinear()
    .domain(d3.extent(filtered, d => d.life_expectancy))
    .range([plotHeight, 0])
    .nice();

  // 轴
  g.append("g")
    .attr("transform", `translate(0,${plotHeight})`)
    .call(d3.axisBottom(x))
    .append("text")
    .attr("x", plotWidth / 2)
    .attr("y", 40)
    .attr("fill", "black")
    .attr("text-anchor", "middle")
    .text("HIV/AIDS prevalence");

  g.append("g")
    .call(d3.axisLeft(y))
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -plotHeight / 2)
    .attr("y", -50)
    .attr("fill", "black")
    .attr("text-anchor", "middle")
    .text("Life Expectancy");

  // 点
  g.selectAll("circle")
    .data(filtered)
    .enter()
    .append("circle")
    .attr("cx", d => x(d.hiv_aids))
    .attr("cy", d => y(d.life_expectancy))
    .attr("r", 5)
    .attr("fill", "red")
    .attr("opacity", 0.7)
    .append("title")
    .text(d => `${d.country}\nHIV/AIDS: ${d.hiv_aids}\nLife Expectancy: ${d.life_expectancy}`);

  // 注释
  const annotations = [
    {
      note: { label: "Higher HIV/AIDS prevalence strongly correlates with lower life expectancy" },
      x: x(15),
      y: y(55),
      dy: -30,
      dx: 30
    }
  ];

  const makeAnnotations = d3.annotation()
    .annotations(annotations);

  g.append("g")
    .attr("class", "annotation-group")
    .call(makeAnnotations);
}

// 按钮事件绑定
document.getElementById("prev").addEventListener("click", () => {
  if (currentScene > 0) {
    currentScene--;
    renderScene(currentScene);
  }
});

document.getElementById("next").addEventListener("click", () => {
  if (currentScene < 2) {
    currentScene++;
    renderScene(currentScene);
  }
});
