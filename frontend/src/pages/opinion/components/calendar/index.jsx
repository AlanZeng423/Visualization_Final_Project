import React, { useRef, useEffect } from "react";
import * as d3 from "d3";
import moment from "moment";
import _ from "lodash";
import axios from "@/services";
import { extent } from "d3";
import { formatDate } from "@/utils";
import Section from "@/components/section";

const cellSize = 30;

export default function Index() {
  const container = useRef(null);

  useEffect(() => {
    function initData() {
      axios("谣言.json").then((res) => {
        const data = _.chain(res)
          .reduce((obj, d) => {
            const key = d.data;
            if (!obj[key]) {
              obj[key] = {
                timeStamp: moment(key).valueOf(),
                date: key,
                data: [],
              };
            }
            obj[key].data.push(d.category);
            return obj;
          }, {})
          .values()
          .orderBy("timeStamp")
          .map((d) => ({
            timeStamp: d.timeStamp,
            date: formatDate(d.date),
            data: _.countBy(d.data),
          }))
          .value();

        const category = _.chain(res).map("category").uniq().value();

        // minDate and maxDate
        const dateRange = extent(data, (d) => d.timeStamp).map((d) =>
          moment(d).format("YYYY-MM-DD")
        );

        // get minDate and maxDate moment
        const start = moment(dateRange[0]).startOf("week");
        const end = moment(dateRange[1]).endOf("week");

        // custom color scale
        const color = ["#F1948A", "#85C1E9", "#F9E79F"];
        const colorScale = d3.scaleOrdinal().range(color);

        // init svg element
        const svg = d3
          .select(container.current)
          .append("svg")
          .attr("width", "100%")
          .attr("height", "100%");

        // legend
        const legend = svg
          .append("g")
          .attr("class", "legend")
          .attr("transform", "translate(20, 10)");

        const legendItem = legend
          .selectAll(".legend-item")
          .data(category)
          .enter()
          .append("g")
          .attr("class", "legend-item")
          .attr("transform", (d, i) => `translate(${i * 80}, 0)`);

        legendItem
          .append("rect")
          .attr("width", 20)
          .attr("height", 15)
          .attr("fill", (d, i) => colorScale(i));

        legendItem
          .append("text")
          .attr("x", 25)
          .attr("y", 12)
          .text((d) => d)
          .style("fill", "white")
          .style("font-size", "12px");

        // calendar to put rectangles and piechart
        const calendar = svg
          .selectAll(".calendar")
          .data([null])
          .join("g")
          .attr("class", "calendar")
          .attr("transform", "translate(30, 40)")
          .attr("fill", "none")
          .attr("stroke", "white");

        // weeks (row)
        const weeks = calendar
          .selectAll(".week")
          .data(d3.timeWeek.range(start, end))
          .join("g")
          .attr("class", "week")
          .attr("width", "100%")
          .attr("height", "100%")
          .attr("transform", (d, i) => `translate(0, ${i * cellSize})`);

        // month label
        weeks
          .filter((d, i) => (i + 2) % 4 === 0)
          .append("text")
          .attr("x", -5)
          .attr("y", cellSize / 2)
          .attr("text-anchor", "end")
          .attr("alignment-baseline", "middle")
          .attr("fill", "white")
          .attr("stroke", "none")
          .text((d) => moment(d).format("M月"));

        // days (column)
        const days = weeks
          .selectAll(".day")
          .data((d) => d3.timeDays(d, moment(d).endOf("week")))
          .join("g")
          .attr("class", "day")
          .attr("transform", (d) => `translate(${d.getDay() * cellSize}, 0)`);

        // create rectangle for each day
        days
          .append("rect")
          .attr("width", `${cellSize}`)
          .attr("height", `${cellSize}`);

        // tooltip style
        const tooltip = d3
          .select("body")
          .append("div")
          .attr("class", "tooltip")
          .style("position", "absolute")
          .style("z-index", "1200")
          .style("background", "#fff")
          .style("padding", "10px")
          .style("border-radius", "5px")
          .style("display", "none");

        // create piechart for each day and mouse event
        days
          .selectAll(".arc")
          .data((d) => {
            const pieData = data.find((item) => item.date === formatDate(d));
            const pieValues = pieData ? Object.values(pieData.data) : [];
            const pie = d3.pie().value((e) => e);
            const arcs = pie(pieValues).map((arc) => ({
              ...arc,
              date: formatDate(d),
            }));
            return arcs;
          })
          .join("path")
          .attr("class", "arc")
          .attr(
            "transform",
            (d) => `translate(${cellSize / 2}, ${cellSize / 2})`
          )
          .attr(
            "d",
            d3
              .arc()
              .innerRadius(0)
              .outerRadius(cellSize / 2)
          )
          .attr("fill", (d) => colorScale(d.index))
          .attr("stroke", "none")
          .on("mouseover", (event, d) => {
            tooltip
              .html(
                `${d.date}<br/>
				${category[d.index]}: ${d.data}`
              )
              .style("display", "block")
              .style("color", "black")
              .style("text-align", "center")
              .style("font-size", "15px");
          })
          .on("mousemove", (event) => {
            tooltip
              .style("top", event.pageY + "px")
              .style("left", event.pageX - 110 + "px");
          })
          .on("mouseout", () => {
            tooltip.style("display", "none");
          });
      });
    }
    initData();
  }, []);
  return (
    <Section title="每日谣言热点分布">
      <div ref={container} className="chart-container" />
    </Section>
  );
}
