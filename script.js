// === GLOBAL STATE ===
let currentScene = 0;
let dataGlobal = null;
let parameters = {
  selectedStatus: "Developed",
  yearRange: [2000, 2015],
  selectedCountries: []
};

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
  renderScene(currentScene);
}).catch(err => {
  console.error("加载数据失败", err);
});

// === UI TRIGGERS ===
d3.select("#statusSelect").on("change", function () {
  parameters.selectedStatus = this.value;
  renderScene(currentScene);
});

// === SCENE CONTROL ===
function renderScene(scene) {
  d3.select("#viz").selectAll("*").remove();
  d3.select("#narrative").html("");

  if (!dataGlobal) {
    d3.select("#narrative").text("loading data...");
    return;
  }

  if (scene === 0) {
    renderOverview();
  } else if (scene === 1) {
    renderAlcoholImpact();
  } else if (scene === 2) {
    renderHIVImpact();
  }
}

// === SCENE 1: OVERVIEW ===
function renderOverview() {
  d3.select("#narrative").html(`
    <h2>Life Expectancy Trends: ${parameters.selectedStatus} Countries</h2>
    <p>This scene shows how life expectancy changed from ${parameters.yearRange[0]} to ${parameters.yearRange[1]} in ${parameters.selectedStatus.toLowerCase()} countries. Overall, life expectancy has increased over time, especially in developing countries.</p>
  `);

  const svg = d3.select("#viz");
  const width = +svg.attr("width");
  const height = +svg.attr("height");
  const margin = { top: 50, right: 200, bottom: 50, left: 70 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const countryList = [...new Set(dataGlobal
    .filter(d => parameters.selectedStatus === "all" || d.status === parameters.selectedStatus)
    .map(d => d.country))].slice(0, 5);

  parameters.selectedCountries = countryList;
  parameters.selectedMetric = 'life_expectancy';

  const filtered = dataGlobal.filter(d =>
    countryList.includes(d.country) &&
    d.year >= parameters.yearRange[0] &&
    d.year <= parameters.yearRange[1]
  );

  const dataByCountry = d3.groups(filtered, d => d.country);

  const x = d3.scaleLinear()
    .domain(parameters.yearRange)
    .range([0, plotWidth]);

  const y = d3.scaleLinear()
    .domain(d3.extent(filtered, d => d.life_expectancy))
    .nice()
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

  // === Annotations ===
  const annotations = dataByCountry.slice(0, 5).map(([country, values]) => {
  const lastPoint = values.find(d => d.year === parameters.yearRange[1]);
  return {
    note: {
      title: country,
      label: `Life Expectancy in ${parameters.yearRange[1]}: ${lastPoint.life_expectancy.toFixed(1)}`
    },
    data: lastPoint,
    dx: 10,
    dy: -25,
    subject: { radius: 4 }
  };
});

 const makeAnnotations = d3.annotation()
  .type(d3.annotationCalloutCircle)
  .accessors({
    x: d => x(d.year),
    y: d => y(d.life_expectancy)
  })
  .annotations(annotations);

g.append("g")
  .attr("class", "annotation-group")
  .call(makeAnnotations);







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
