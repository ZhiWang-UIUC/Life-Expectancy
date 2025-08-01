// === GLOBAL STATE ===
let currentScene = 0;
let dataGlobal = null;
let parameters = {
  selectedStatus: "Developed",
  yearRange: [2000, 2015],
  selectedCountries: [],
  selectedCountryForScene2: "China"

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

d3.select("#countrySelectScene2").on("change", function () {
  parameters.selectedCountryForScene2 = this.value;
  renderScene(1);
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
    renderGDPTrend();
  } else if (scene === 2) {
    renderHIVImpact();
  }
}


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
