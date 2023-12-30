import React from "react";
import style from "./index.less";
import NewNCount from "./components/newNCount";
import Table from "./components/table";
import BarChart from "./components/barChart";
import Rumors from "./components/rumors";
import Calendar from "./components/calendar";

export default function Opinion() {
  return (
    <div className={style.opinion}>
      <div className="opinion-left">
        <div className="opinionChart">
          <NewNCount />
        </div>
        <div className="hotTopic">
          <Table />
        </div>
      </div>
      <div className="opinion-center">
        <div className="main-chart">
          <BarChart />
        </div>
        <div className="analys-table">
          <Rumors />
        </div>
      </div>

      <div className="opinion-right">
        <div className="calendar">
          <Calendar />
        </div>
      </div>
    </div>
  );
}
