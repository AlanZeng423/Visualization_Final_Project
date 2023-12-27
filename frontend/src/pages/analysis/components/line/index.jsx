import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import { DatePicker } from "antd";
import moment from "moment";
import axios from "@/services";
import Section from "@/components/section";
import style from "./index.less";

export default function Radar() {
    const [currentDate, setCurrentDate] = useState("2020-02-01");
    const container = useRef(null);
    const [data, setData] = useState({ provinceName: [], comfiredValue: [], migrateValue: [] });

    function onDateChange(date, dateString) {
        setCurrentDate(dateString);
    }

    useEffect(() => {
        Promise.all([
            axios("ComfiredCompare.json"),
            axios("Migrate.json")
        ]).then(([comfiredResponse, migrateResponse]) => {
            const comfiredData = comfiredResponse.filter(item => item.updateTime === currentDate);
            const migrateData = migrateResponse.filter(item => item.updateTime === currentDate);

            const provinceName = [];
            const comfiredValue = [];
            const migrateValue = [];

            comfiredData.forEach(com => {
                const obj = migrateData.find(mig => mig.provinceName === com.provinceName);
                if (obj) {
                    provinceName.push(com.provinceName);
                    comfiredValue.push(Number(com.ComfiredRatio));
                    migrateValue.push(Number(obj.Ratio));
                }
            });

            setData({ provinceName, comfiredValue, migrateValue });
        });
    }, [currentDate]);

    useEffect(() => {
        if (data.provinceName.length > 0) {
            drawChart();
        }
    }, [data]);

    const drawChart = () => {
        const margin = { top: 20, right: 20, bottom: 30, left: 50 };
        // const margin = {
        //     top: 20,
        //     right: svgWidth * 0.04, // 4% of width
        //     bottom: svgHeight * 0.03, // 3% of height
        //     left: svgWidth * 0.03 // 3% of width
        // };
        const width = 700 - margin.left - margin.right;
        const height = 350 - margin.top - margin.bottom;

		// 创建提示框元素
		const tooltip = d3.select(container.current).append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background-color", "grey")
        .style("padding", "5px")
        .style("border-radius", "5px")
        .style("border", "1px solid gray");
		

		

        // 清除旧的 SVG
        d3.select(container.current).selectAll("svg").remove();

        const svg = d3.select(container.current)
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        // 定义 X 轴和 Y 轴的比例尺
        const x = d3.scaleBand()
            .range([0, width])
            .padding(0.1)
            .domain(data.provinceName);
        const y = d3.scaleLinear()
            .range([height, 0])
            .domain([0, d3.max([...data.comfiredValue, ...data.migrateValue])]);

        // 添加 X 轴和 Y 轴
        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x));
        svg.append("g")
            .call(d3.axisLeft(y));

        // 定义线条生成器
        const line = d3.line()
            .x((d, i) => x(data.provinceName[i]) + x.bandwidth() / 2)
            .y(d => y(d));

        // 绘制线条
        svg.append("path")
            .datum(data.comfiredValue)
            .attr("fill", "none")
            .attr("stroke", "red")
            .attr("stroke-width", 1.5)
            .attr("d", line);

        svg.append("path")
            .datum(data.migrateValue)
            .attr("fill", "none")
            .attr("stroke", "blue")
            .attr("stroke-width", 1.5)
            .attr("d", line);

		// 为每个数据点添加一个透明圆，并添加鼠标事件处理器
		data.provinceName.forEach((province, i) => {
			svg.append("circle")
				.attr("cx", x(province) + x.bandwidth() / 2)
				.attr("cy", y(data.comfiredValue[i]))
				.attr("r", 3) // 可以调整点的大小
				.style("fill", "white")
				.style("pointer-events", "all") // 确保即使圆是透明的，也能响应鼠标事件
				.on("mouseover", function() {
					const xValue = data.provinceName[i];
					const yValue1 = data.comfiredValue[i];
					const yValue2 = data.migrateValue[i];
					console.log(xValue, yValue1, yValue2);
		
					tooltip.transition().duration(200).style("opacity", 1);
					tooltip.html(`省份: ${xValue}<br>确诊比例: ${yValue1}`)
						.style("left", (x(xValue) + x.bandwidth() / 2) + "px")
						.style("top", (y(yValue1) - 28) + "px");
				})
				.on("mouseout", function() {
					tooltip.transition().duration(500).style("opacity", 0);
				});
		});

		data.provinceName.forEach((province, i) => {
			svg.append("circle")
				.attr("cx", x(province) + x.bandwidth() / 2)
				.attr("cy", y(data.migrateValue[i]))
				.attr("r", 3) // 可以调整点的大小
				.style("fill", "white")
				.style("pointer-events", "all") // 确保即使圆是透明的，也能响应鼠标事件
				.on("mouseover", function() {
					const xValue = data.provinceName[i];
					const yValue1 = data.comfiredValue[i];
					const yValue2 = data.migrateValue[i];
					console.log(xValue, yValue1, yValue2);
		
					tooltip.transition().duration(200).style("opacity", 1);
					tooltip.html(`省份: ${xValue}<br>迁入比例: ${yValue2}`)
						.style("left", (x(xValue) + x.bandwidth() / 2) + "px")
						.style("top", (y(yValue1) - 28) + "px");
				})
				.on("mouseout", function() {
					tooltip.transition().duration(500).style("opacity", 0);
				});
				
		});

		// 创建图例
		const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width - 120}, 20)`); // 调整图例的位置

		// 图例数据
		const legendData = [
			{ name: "迁入比例", color: "blue" },
			{ name: "确诊比例", color: "red" }
		];

		// 添加图例项
		legendData.forEach((item, index) => {
			const legendItem = legend.append("g")
				.attr("transform", `translate(0, ${index * 20})`); // 纵向堆叠图例项
	
			legendItem.append("rect")
				.attr("width", 10)
				.attr("height", 10)
				.attr("fill", item.color);
	
			legendItem.append("text")
				.attr("x", 15)
				.attr("y", 10)
				.text(item.name)
				.style("font-size", "12px")
				.style("fill", "#fff"); // 根据需要调整文本颜色
		});
    }

    function disabledDate(current) {
        return (
            current < moment(new Date("2020/01/23")) ||
            current > moment(new Date("2020/04/30"))
        );
    }

    return (
        <Section
            title="迁入规模与确诊对比图"
            extra={
                <div style={{ textAlign: "right" }}>
                    <DatePicker
                        defaultValue={moment(currentDate, "YYYY-MM-DD")}
                        format={"YYYY-MM-DD"}
                        disabledDate={disabledDate}
                        onChange={onDateChange}
                    />
                </div>
            }
        >
            <div className="chart-container" ref={container} />
        </Section>
    );
}
