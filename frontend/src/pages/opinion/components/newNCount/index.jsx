import React, { useRef, useEffect } from "react";
import * as d3 from "d3";
import Section from "@/components/section";
import { proxyAxios, axios } from "@/services";
import _ from "lodash";
import moment from "moment";
import { formatDate } from "@/utils";

export default function Index() {
  const container = useRef(null);
  const chart = useRef(null);

  useEffect(() => {
    function initChart() {
      const svg = d3
        .select(container.current)
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", "0 0 500 300");

      // scale
      const xScale = d3.scaleTime().range([0, 400]);
      const y1Scale = d3.scaleLinear().range([290, 10]);
      const y2Scale = d3.scaleLinear().range([290, 10]);

      // axis
      const xAxis = d3.axisBottom(xScale);
      const yAxisLeft = d3.axisLeft(y1Scale);
      const yAxisRight = d3.axisRight(y2Scale);

      // axis tick
      svg
        .append("g")
        .attr("class", "x-axis")
        .attr("transform", "translate(0,290)")
        .call(xAxis);
      svg
        .append("g")
        .attr("class", "y-axis left")
        .attr("transform", "translate(55,0)")
        .call(yAxisLeft);
      svg
        .append("g")
        .attr("class", "y-axis right")
        .attr("transform", "translate(445,0)")
        .call(yAxisRight);

      // axis label
      svg
        .append("text")
        .attr("class", "y1-label")
        .attr("transform", "translate(0,2)")
        .attr("fill", "white");
      svg
        .append("text")
        .attr("class", "y2-label")
        .attr("transform", "translate(400,2)")
        .attr("fill", "white");
      svg.select(".y1-label").text("新增病例");
      svg.select(".y2-label").text("舆情数量");
      svg.select(".y1-label").style("font-size", "25px");
      svg.select(".y2-label").style("font-size", "25px");
    }

    function getData() {
      Promise.all([
        axios("CountryDailyCount.json"),
        axios("CountTopicNum.json"),
      ])
        .then(([dailyCountData, topicNumData]) => {
          const dailyCount = dailyCountData.map((d) => ({
            date: formatDate(d.updateTime),
            newCases: +d.confirmedCount,
          }));

          const topicNum = _.chain(topicNumData)
            .map((d) => ({
              date: moment(d.Date, "MM月DD").format("2020-MM-DD"),
              opinionCount: +d["总计"],
            }))
            .orderBy("date")
            .value();

          updateD3Chart(dailyCount, topicNum);
        })
        .catch((error) => {
          console.error("Error fetching data:", error);
        });
    }

    function updateD3Chart(dailyCount, topicNum) {
      const svg = d3.select(container.current).select("svg");
      const combinedData = [...dailyCount, ...topicNum];

      // scale
      const xScale = d3
        .scaleTime()
        .range([55, 445])
        .domain(d3.extent(combinedData, (d) => new Date(d.date)));
      const y1Scale = d3
        .scaleLinear()
        .range([290, 10])
        .domain([0, d3.max(dailyCount, (d) => d.newCases)]);
      const y2Scale = d3
        .scaleLinear()
        .range([290, 10])
        .domain([0, d3.max(topicNum, (d) => d.opinionCount)]);

      // axis
      const xAxis = d3
        .axisBottom(xScale)
        .tickFormat(d3.timeFormat("%m-%y"))
        .ticks(5);
      const yAxisLeft = d3
        .axisLeft(y1Scale)
        .tickFormat((value) => (value / 10000).toFixed(1) + "万")
        .ticks(5);
      const yAxisRight = d3
        .axisRight(y2Scale)
        .tickFormat((value) => (value / 10000).toFixed(1) + "万")
        .ticks(5);

      // axis tick
      svg
        .select(".x-axis")
        .call(xAxis)
        .selectAll("text")
        .style("font-size", "18px");
      svg
        .select(".y-axis.left")
        .call(yAxisLeft)
        .selectAll("text")
        .style("font-size", "18px");
      svg
        .select(".y-axis.right")
        .call(yAxisRight)
        .selectAll("text")
        .style("font-size", "18px");

      const line1 = d3
        .line()
        .x((d) => xScale(new Date(d.date)))
        .y((d) => y1Scale(d.newCases));

      const line2 = d3
        .line()
        .x((d) => xScale(new Date(d.date)))
        .y((d) => y2Scale(d.opinionCount));

      svg.selectAll(".line").remove();

      // new case line chart
      svg
        .append("path")
        .data([dailyCount])
        .attr("class", "line line1")
        .attr("d", line1)
        .attr("stroke", "#F1948A")
        .attr("stroke-width", 2)
        .attr("fill", "none");

      // opinion line chart
      svg
        .append("path")
        .datum(topicNum)
        .attr("class", "line line2")
        .attr("d", line2)
        .attr("stroke", "#F7DC6F")
        .attr("stroke-width", 2)
        .attr("fill", "none");

      // tooltip style
      const tooltip = d3
        .select(container.current)
        .append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("z-index", "10")
        .style("display", "none")
        .style("background", "#fff")
        .style("padding", "5px")
        .style("border-radius", "5px")
        .style("width", "110px")
        .style("max-height", "60px");

      // new case tooltip
      svg
        .selectAll(".circle1")
        .data(dailyCount)
        .join("circle")
        .attr("class", "circle1")
        .attr("cx", (d) => xScale(new Date(d.date)))
        .attr("cy", (d) => y1Scale(d.newCases))
        .attr("r", 3)
        .attr("fill", "#F1948A")
        .on("mouseover", (event, d) => {
          tooltip
            .style("display", "block")
            .html(
              `${d.date}<br/>新增病例: ${(d.newCases / 10000).toFixed(1)} 万`
            )
            .style("left", `87px`)
            .style("top", `75px`)
            .style("color", "black")
            .style("font-size", "13px");
        })
        .on("mouseout", () => {
          tooltip.style("display", "none");
        });

      // opinion tooltip
      svg
        .selectAll(".circle2")
        .data(topicNum)
        .join("circle")
        .attr("class", "circle2")
        .attr("cx", (d) => xScale(new Date(d.date)))
        .attr("cy", (d) => y2Scale(d.opinionCount))
        .attr("r", 3)
        .attr("fill", "#F7DC6F")
        .on("mouseover", (event, d) => {
          tooltip
            .style("display", "block")
            .html(
              `${d.date}<br/>舆情数量: ${(d.opinionCount / 10000).toFixed(
                1
              )} 万`
            )
            .style("left", `87px`)
            .style("top", `75px`)
            .style("color", "black")
            .style("text-align", "center")
            .style("font-size", "13px");
        })
        .on("mouseout", () => {
          tooltip.style("display", "none");
        });
    }

    initChart();
    getData();
  }, []);

  return (
    <Section title="每日新增与舆情数量">
      <div className="chart-container" ref={container} />
    </Section>
  );
}
