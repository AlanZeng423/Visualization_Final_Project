import React, { useEffect, useState } from "react";
import Section from "@/components/section";
import { Table, Select } from "antd";
import axios from "@/services";
import moment from "moment";

const columns = [
  {
    title: "日期",
    dataIndex: "data",
    width: "120px",
  },
  {
    title: "谣言内容",
    dataIndex: "title",
  },
  {
    title: "辟谣",
    dataIndex: "author",
  },
];

export default function Index() {
  const [tableData, setTableData] = useState([]);
  const [options, setOptions] = useState([]);
  const [currentDate, setCurrentDate] = useState(moment().format("YYYY-MM-DD"));

  useEffect(() => {
    function initTableData() {
      axios("谣言.json").then((res) => {
        const data = res
          .map((d) => ({
            ...d,
            data: moment(d.data).format("YYYY-MM-DD"), // formate date
          }))
          // group data by month
          .reduce((obj, d) => {
            const key = moment(d.data).format("YYYY-MM"); // set options to YYYY-MM
            if (!obj[key]) {
              obj[key] = [];
            }
            obj[key].push(d);
            obj[key].sort((a, b) => moment(a.data).diff(moment(b.data))); // sort ascending
            return obj;
          }, {});

        const dates = Object.keys(data).sort((a, b) => moment(a) - moment(b)); // get month array
        setTableData(data); // update data with selected month
        setOptions(dates); // show month options
        setCurrentDate(moment("2020/1").format("YYYY-MM")); // set default month
      });
    }
    initTableData();
    return () => {};
  }, []);

  function handleChangeDate(d) {
    setCurrentDate(d);
  }

  const selectOptions = options.map((d) => ({
    label: d,
    value: d,
  }));

  return (
    <Section
      title="谣言分析"
      extra={
        <div style={{ textAlign: "right" }}>
          <Select
            value={currentDate}
            options={selectOptions}
            dropdownStyle={{ height: "200px" }}
            onChange={handleChangeDate}
          />
        </div>
      }
    >
      <Table
        rowKey="data"
        columns={columns}
        dataSource={tableData[currentDate] || []}
        scroll={{
          y: true,
        }}
        pagination={false}
      />
    </Section>
  );
}
