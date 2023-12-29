import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import moment from "moment";
import _ from "lodash";
import axios from "@/services";
import Section from "@/components/section";

const colorBar = d3.scaleOrdinal(d3.schemeAccent); // three color

export default function BarChart() {
  // reference for accessing DOM
  const container = useRef(null);
  const svgcRef = useRef(null);
  const svg = useRef(null);
  const layout = useRef({});
  const originData = useRef({});
  const currentData = useRef([]);
  const dateData = useRef([]);
  const methods = useRef({});

  // emotion state
  const [activeType, setActiveType] = useState(["positive"]);
  // date state
  const [theDate, setTheDate] = useState(
    moment("2020/1/31").format("YYYY-MM-DD")
  );

  useEffect(() => {
    function updateHourData(date) {
      // create data object with date and emotion
      currentData.current = _.chain(originData.current[date] || [])
        .map((d) => ({
          date: moment(d.date, "YYYY-MM-DD HH:mm").startOf("hour").valueOf(),
          emotion: d.emotion,
        }))
        .reduce((obj, d) => {
          const key = d.date;
          if (!obj[key]) {
            obj[key] = [];
          }
          obj[key].push(d);
          return obj;
        }, {})
        .forEach((d, k, obj) => {
          obj[k] = { ..._.countBy(d, "emotion"), date: k };
        })
        .values()
        .orderBy("date")
        .value();
    }

    function initData() {
      const promiseArr = [];

      // calculate days in between
      const days =
        (moment("2020-4-1").valueOf() - moment("2020-1-9").valueOf()) /
        (3600 * 1000 * 24);

      dateData.current = []; //initialize dateData ref

      // loop everyday and add the date to dateData
      for (let i = 0; i < days; i++) {
        const date = moment("2020-1-9").add(i, "day").format("YYYY-MM-DD");
        dateData.current.push(date);
        promiseArr.push(
          axios(`emotion/${date}.json`).then((res) => {
            originData.current[date] = res.map((d) => ({
              ...d,
              date: `${d.datetime} ${d.time}`,
            }));
          })
        );
      }
      Promise.all(promiseArr).then(() => {
        axios("EmotionNum.json").then((res) => {
          const pieData = _.chain(res)
            .map("date")
            .orderBy((d) => moment(d).valueOf())
            .value();

          initChart(); // init chart after date data is fetched
        });
      });
    }

    function initChart() {
      // extract container width and height and get the smaller one
      const { clientWidth, clientHeight } = container.current;
      const size = d3.min([clientWidth, clientHeight]);

      // calculate chart components
      const radius = size / 2;
      const barRadius = [radius - radius * 0.7, radius]; // outer layer
      const dateRadius = [radius / 8, barRadius[0]]; // middle layer
      const monthRadius = [0, dateRadius[0]]; // inner layer

      // store layout dimension in layout ref
      layout.current = {
        size,
        barRadius,
        dateRadius,
        monthRadius,
      };

      // remove existing chart elements
      d3.select(svgcRef.current).select("g").remove();

      // init svg element
      svg.current = d3
        .select(svgcRef.current)
        .attr("width", size)
        .attr("height", size)
        .attr("viewBox", `0 0 ${size} ${size}`)
        .append("g")
        .attr("transform", `translate(${size / 2}, ${size / 2})`);

      const month = moment(theDate).month() + 1; // get month of selected date
      drawMonth(); // draw month pie chart (inner layer)
      drawDay(month); // draw day pie chart of selected month (middle layer)
      updateHourData(theDate); // update chart data for selected date
      updateHour(); // update and draw hour bars of selected day(outer layer)
    }

    function drawMonth() {
      // extract month data from dateData ref
      const monthData = _.chain(dateData.current)
        .map((d) => moment(d).month() + 1)
        .uniq()
        .value();

      // create pie chart generator
      const pie = d3
        .pie()
        .padAngle(() => 0.02)
        .value(() => 1);

      const arcsData = pie(monthData); // create pie chart for monthData

      // create slice generator
      const { monthRadius } = layout.current;
      const arc = d3
        .arc()
        .outerRadius(() => monthRadius[1])
        .innerRadius(() => monthRadius[0])
        .cornerRadius(() => 5);

      d3.selectAll(".tooltip-month").remove(); // remove existing tooltip
      console.log(arcsData);
      // tooltip style
      const tooltip = d3
        .select("body")
        .append("div")
        .attr("class", "tooltip-month")
        .style("position", "absolute")
        .style("z-index", "1200")
        .style("background", "#fff")
        .style("padding", "10px")
        .style("border-radius", "5px")
        .style("display", "none");

      const arcG = svg.current
        .append("g")
        .classed("monthG", true)
        .selectAll("g.arcG")
        // add group for each data in arcsData
        .data(arcsData)
        .enter()
        .append("g")
        .classed("arcDate", true)
        .on("click", (d) => {
          const month = d.target.__data__.data; // get target month
          drawDay(month); // draw day piechart of target month
        })
        .on("mouseover", (event, d) => {
          const month = d.data;

          tooltip
            .html(`日期：2020-0${month}`)
            .style("display", "block")
            .style("color", "black")
            .style("text-align", "left")
            .style("font-size", "15px");
        })
        .on("mousemove", (event) => {
          tooltip
            .style("top", event.pageY + "px")
            .style("left", event.pageX - 120 + "px");
        })
        .on("mouseout", () => {
          tooltip.style("display", "none");
        })
        .attr("cursor", "pointer");

      // use path to draw every arcG using arc()
      arcG.append("path").attr("d", arc).attr("fill", "#FFC550");
    }

    function drawDay(month) {
      // get start and end date for selected month
      const startDate = moment(`2020/${month}/1`);
      const endDate = moment(startDate).add(1, "month");

      // filter dateData ref for selected month
      const data = _.chain(dateData.current)
        .filter(
          (d) =>
            moment(d).unix() >= startDate.unix() &&
            moment(d).unix() < endDate.unix()
        )
        .value();

      // create pie chart generator
      const pie = d3
        .pie()
        .padAngle(() => 0.01)
        .value(() => 1);

      const arcsData = pie(data); // create pie chart for selected month

      // create slice generator
      const { dateRadius } = layout.current;
      const arc = d3
        .arc()
        .outerRadius(() => dateRadius[1])
        .innerRadius(() => dateRadius[0])
        .cornerRadius(() => 5);

      svg.current.selectAll("g.pieDate").remove(); // remove existing pie chart
      d3.selectAll(".tooltip-day").remove(); // remove existing tooltip

      // tooltip style
      const tooltip = d3
        .select("body")
        .append("div")
        .attr("class", "tooltip-day")
        .style("position", "absolute")
        .style("z-index", "1200")
        .style("background", "#fff")
        .style("padding", "10px")
        .style("border-radius", "5px")
        .style("display", "none");

      const arcG = svg.current
        .append("g")
        .classed("pieDate", true)
        .selectAll("g.arcDate")
        // add group for each data in arcsData
        .data(arcsData)
        .enter()
        .append("g")
        .classed("arcDate", true)
        .on("click", (d) => {
          const date = d.target.__data__.data; // get target date
          setTheDate(date); // update date and draw hour piechart of target date
        })
        .on("mouseover", (event, d) => {
          const date = moment(d.data).format("MM-DD");

          tooltip
            .html(`日期：${date}`)
            .style("display", "block")
            .style("color", "black")
            .style("text-align", "left")
            .style("font-size", "15px");
        })
        .on("mousemove", (event) => {
          tooltip
            .style("top", event.pageY + "px")
            .style("left", event.pageX - 115 + "px");
        })
        .on("mouseout", () => {
          tooltip.style("display", "none");
        })
        .attr("cursor", "pointer");

      // use path to draw every arcG using arc()
      arcG.append("path").attr("d", arc).attr("fill", "#247DB9");
    }

    d3.selectAll(".tooltip-hour").remove(); // remove existing tooltip-hour

    // tooltip style
    const tooltip_hour = d3
      .select("body")
      .append("div")
      .attr("class", "tooltip-hour")
      .style("display", "none")
      .style("position", "absolute")
      .style("z-index", "1200")
      .style("background", "#fff")
      .style("padding", "10px")
      .style("border-radius", "5px");

    function updateHour() {
      svg.current.selectAll("g.arcBar").remove(); // remove existing bars

      // draw every emotion bars
      ["positive", "neural", "negative"].forEach((d) => {
        drawBar(d);
      });
    }

    function drawBar(sortKey) {
      const { barRadius } = layout.current;
      const { current: data } = currentData;

      // create extent and radius scale for selected emotion
      const extent = d3.extent(data, (d) => +d[sortKey]);
      const scale = d3.scaleLinear().domain(extent).range(barRadius);

      // create pie chart generator
      const pie = d3
        .pie()
        .padAngle(() => 0.01)
        .value(() => 1);

      const arcsData = pie(data); // create pie chart for selected emotion

      // create slice generator with scale
      const arc = d3
        .arc()
        .outerRadius((d) => scale(+d.data[sortKey]))
        .innerRadius(() => barRadius[0])
        .cornerRadius(() => 2);

      const arcG = svg.current
        .append("g")
        .classed("arcBar", true)
        .classed(`bar-${sortKey}`, true)
        //display bars if current emotion is selected
        .attr("display", () =>
          activeType.includes(sortKey) ? "block" : "none"
        )
        .selectAll("g.arcG")
        // add group for each data in arcsData
        .data(arcsData)
        .enter()
        .append("g")
        .classed("arcG", true)
        .on("mouseover", (event, d) => {
          let content;
          switch (sortKey) {
            case "positive":
              content = `时间：${d.index}:00<br/>人数：${d.data.positive} `;
              break;
            case "negative":
              content = `时间：${d.index}:00<br/>人数：${d.data.negative}`;
              break;
            case "neural":
              content = `时间：${d.index}:00<br/>人数：${d.data.neural}`;
              break;
          }

          tooltip_hour
            .html(content)
            .style("display", "block")
            .style("color", "black")
            .style("text-align", "left")
            .style("font-size", "15px");
        })
        .on("mousemove", (event) => {
          tooltip_hour
            .style("top", event.pageY + "px")
            .style("left", event.pageX - 110 + "px");
        })
        .on("mouseout", () => {
          tooltip_hour.style("display", "none");
        });

      // use path to draw every arcG using arc()
      arcG
        .append("path")
        .attr("d", arc)
        .attr("fill", () => colorBar(sortKey))
        .attr("opacity", 0.8) // decrease opacity to stack other emotion
        // animate bars
        .transition()
        .duration(400)
        .ease(d3.easeCubicOut)
        // smoothly transition piechart from initial to final state
        .attrTween("d", (d) => {
          const i = d3.interpolateObject(
            {
              ...d,
              endAngle: d.startAngle,
              data: {
                ...d.data,
                [sortKey]: 0,
              },
            }, // initial state
            d //final state
          );
          return (t) => arc(i(t)); // compute the path of interpolate state of current progress
        });
    }

    methods.current.updateHour = updateHour;
    initData();
  }, [activeType, theDate]);

  const handleClick = (type) => {
    let activeArr = [];
    if (!activeType.includes(type)) {
      activeArr = [...activeType, type];
    } else {
      activeArr = activeType.filter((d) => d !== type);
    }
    setActiveType(activeArr);
  };

  return (
    <Section title="情感分析">
      <div
        className="chart-container barChart"
        ref={container}
        style={{ textAlign: "center" }}
      >
        <svg ref={svgcRef} />
        <div className="chart-legend">
          {[
            {
              type: "positive",
              name: "积极",
            },
            {
              type: "neural",
              name: "中立",
            },
            {
              type: "negative",
              name: "消极",
            },
          ].map((item) => (
            <div
              key={item.type}
              className={`legend-item ${
                activeType.includes(item.type) ? "" : "inactive"
              }`}
              onClick={() => handleClick(item.type)}
            >
              <span
                className="legend"
                style={{ backgroundColor: colorBar(item.type) }}
              ></span>
              <span className="legend-label">{item.name}</span>
            </div>
          ))}
        </div>
        <div className="chart-title">{theDate}</div>
      </div>
    </Section>
  );
}
