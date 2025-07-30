let currentScene = 0;
let dataGlobal = null;

d3.csv("data/life_expectancy_cleaned.csv").then(data => {
  // 转换数字字段
  data.forEach(d => {
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

function renderScene(scene) {
  d3.select("#viz").selectAll("*").remove();
  d3.select("#narrative").html("");

  if (!dataGlobal) {
    d3.select("#narrative").text("数据还没加载完成，请稍候...");
    return;
  }

  if(scene === 0) {
    renderOverview();
  } else if(scene === 1) {
    renderAlcoholImpact();
  } else if(scene === 2) {
    renderHIVImpact();
  }
}

// Scene 0: 概览 — GDP vs Life Expectancy 散点图
function renderOverview() {
  d3.select("#narrative").html(`
    <h2>Global Life Expectancy Overview</h2>
    <p>This scatter plot shows the relationship between GDP and Life Expectancy across countries.</p>
  `);

  const svg = d3.select("#viz");
  const width = +svg.attr("width");
  const height = +svg.attr("height");
  const margin = {top: 50, right: 40, bottom: 60, left: 70};
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  // 过滤掉无效数据
  const filtered = dataGlobal.filter(d => d.gdp > 0 && d.life_expectancy > 0);

  // X 轴 — GDP 取对数尺度
  const x = d3.scaleLog()
    .domain(d3.extent(filtered, d => d.gdp))
    .range([0, plotWidth])
    .nice();

  // Y 轴 — Life Expectancy 线性尺度
  const y = d3.scaleLinear()
    .domain(d3.extent(filtered, d => d.life_expectancy))
    .range([plotHeight, 0])
    .nice();

  // 绘制坐标轴
  g.append("g")
    .attr("transform", `translate(0,${plotHeight})`)
    .call(d3.axisBottom(x).ticks(10, "~s"))
    .append("text")
    .attr("x", plotWidth / 2)
    .attr("y", 40)
    .attr("fill", "black")
    .attr("text-anchor", "middle")
    .text("GDP (log scale)");

  g.append("g")
    .call(d3.axisLeft(y))
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -plotHeight / 2)
    .attr("y", -50)
    .attr("fill", "black")
    .attr("text-anchor", "middle")
    .text("Life Expectancy");

  // 绘制散点
  g.selectAll("circle")
    .data(filtered)
    .enter()
    .append("circle")
    .attr("cx", d => x(d.gdp))
    .attr("cy", d => y(d.life_expectancy))
    .attr("r", 5)
    .attr("fill", "steelblue")
    .attr("opacity", 0.7)
    .append("title")
    .text(d => `${d.country}\nGDP: ${d.gdp}\nLife Expectancy: ${d.life_expectancy}`);

  // 可以加简单注释，示范用 d3-annotation
  const annotations = [
    {
      note: { label: "Higher GDP generally associates with higher life expectancy" },
      x: x(1e4),
      y: y(75),
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

// Scene 1: Alcohol Consumption Impact
function renderAlcoholImpact() {
  d3.select("#narrative").html(`
    <h2>Alcohol Consumption vs Life Expectancy</h2>
    <p>This scene explores the relationship between average alcohol consumption and life expectancy.</p>
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

// Scene 2: HIV/AIDS Impact
function renderHIVImpact() {
  d3.select("#narrative").html(`
    <h2>HIV/AIDS Impact on Life Expectancy</h2>
    <p>This scene shows how HIV/AIDS prevalence impacts life expectancy.</p>
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
