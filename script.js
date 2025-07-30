let currentScene = 0;
let dataGlobal = null;

d3.csv("data/life_expectancy_cleaned.csv").then(data => {
  // 转换字段
  data.forEach(d => {
    d.year = +d.year;
    d.life_expectancy = +d.life_expectancy;
    d.gdp = +d.gdp;
    d.alcohol = +d.alcohol;
    d.hiv_aids = +d.hiv_aids;
    d.population = +d.population;
    d.schooling = +d.schooling;
    d.status = d.status; // 保留 status 字段作为字符串
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
    renderGDPImpact();  
  } else if(scene === 2) {
    renderUserExplore();       
  }
}


// Scene 0: 概览 — Country vs Life Expectancy 
function renderOverview() {
  d3.select("#narrative").html(`
    <h2>Global Life Expectancy Trends (2000–2015)</h2>
    <p>This scene compares life expectancy trends between developed and developing countries. Developed countries tend to have consistently higher life expectancy with slower growth, while developing countries show faster improvements over time.</p>
  `);

  const svg = d3.select("#viz");
  const width = +svg.attr("width");
  const height = +svg.attr("height");
  const margin = {top: 50, right: 160, bottom: 60, left: 70};
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  // 自动选出前5个 Developed 和 Developing 国家
  const developedCountries = [...new Set(dataGlobal.filter(d => d.status === "Developed").map(d => d.country))].slice(0, 5);
  const developingCountries = [...new Set(dataGlobal.filter(d => d.status === "Developing").map(d => d.country))].slice(0, 5);
  const selectedCountries = [...developedCountries, ...developingCountries];

  const filtered = dataGlobal.filter(d =>
    selectedCountries.includes(d.country) &&
    d.year >= 2000 && d.year <= 2015 &&
    d.life_expectancy > 0
  );

  const dataByCountry = d3.groups(filtered, d => d.country);

  // X轴：年份
  const x = d3.scaleLinear()
    .domain([2000, 2015])
    .range([0, plotWidth]);

  const xAxis = d3.axisBottom(x).tickFormat(d3.format("d"));

  // Y轴：寿命
  const y = d3.scaleLinear()
    .domain(d3.extent(filtered, d => d.life_expectancy))
    .nice()
    .range([plotHeight, 0]);

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

  // 颜色区分 Developed / Developing
  const color = d => d.status === "Developed" ? "#1f77b4" : "#ff7f0e";

  g.selectAll(".line")
    .data(dataByCountry)
    .enter()
    .append("path")
    .attr("fill", "none")
    .attr("stroke", ([country, values]) => color(values[0]))
    .attr("stroke-width", 2)
    .attr("d", ([, values]) => line(values));

  // 添加图例
  const legend = svg.append("g")
    .attr("transform", `translate(${width - margin.right + 20}, ${margin.top})`);

  legend.append("circle").attr("cx", 0).attr("cy", 0).attr("r", 6).style("fill", "#1f77b4");
  legend.append("text").attr("x", 12).attr("y", 5).text("Developed").style("font-size", "13px");

  legend.append("circle").attr("cx", 0).attr("cy", 25).attr("r", 6).style("fill", "#ff7f0e");
  legend.append("text").attr("x", 12).attr("y", 30).text("Developing").style("font-size", "13px");

  // 注释（用 d3-annotation）
  const annotations = [
    {
      note: {
        title: "Developed Country",
        label: "Germany shows high life expectancy, stable over time"
      },
      data: dataByCountry.find(([c]) => c === developedCountries[0])[1].find(d => d.year == 2015),
      dx: 20,
      dy: -40,
      subject: { radius: 4 }
    },
    {
      note: {
        title: "Developing Country",
        label: "Nigeria shows lower but improving life expectancy"
      },
      data: dataByCountry.find(([c]) => c === developingCountries[0])[1].find(d => d.year == 2015),
      dx: 20,
      dy: -40,
      subject: { radius: 4 }
    }
  ];

  const makeAnnotations = d3.annotation()
    .type(d3.annotationCalloutCircle)
    .accessors({
      x: d => x(d.year),
      y: d => y(d.life_expectancy)
    })
    .annotations(annotations);

  g.append("g").attr("class", "annotation-group").call(makeAnnotations);
}



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
