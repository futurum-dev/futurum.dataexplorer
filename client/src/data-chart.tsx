import React, {useState} from 'react';

import {DualAxes} from '@ant-design/plots';
import {PlotEvent} from "@ant-design/plots/es/interface";
import {Plot, DualAxesOptions} from "@antv/g2plot";


import {ContextMenu} from "./context-menu";
import {InteractiveDataComponentProps} from "./interactive-data";
import {DrillDownPathNodeFilter} from "./domain";

const DataChart = ({
                       loading,
                       rowData,
                       allColumns,
                       columnDefinitions,
                       columnDrilldown,
                       middleDrilldown
                   }: InteractiveDataComponentProps) => {
    const [popup, setPopup] = useState<{ visible: boolean, x: number, y: number, data: any }>({
        visible: false,
        x: 0,
        y: 0,
        data: null
    });

    function onEvent(chart: Plot<DualAxesOptions>, event: PlotEvent): void {
        if (event.type === "contextmenu") {
            event.gEvent.preventDefault()

            console.log("chart event")
            console.log("contextmenu")
            console.log(event)

            const datum: any = event.data;

            if (!popup.visible) {
                document.addEventListener(`click`, function onClickOutside() {
                    setPopup({...popup, visible: false})
                    document.removeEventListener(`click`, onClickOutside)
                })
            }

            setPopup({
                visible: true,
                x: event.clientX,
                y: event.clientY,
                data: datum.data
            })
        } else if (event.type === "dblclick") {
            event.gEvent.preventDefault()

            console.log("chart event")
            console.log("dblclick")
            console.log(event)

            const datum: any = event.data;

            const rowIndex = datum.data.key;

            const column = columnDefinitions[0].title;

            const view: any = chart.chart.views[0];
            const doubleClickedRowData = view.filteredData.filter((row:any) => row.key === rowIndex)[0];

            if (doubleClickedRowData[column] !== "middle") {
                return;
            }

            console.log('middle drilldown (double-click):' + column);

            const filter: DrillDownPathNodeFilter = {
                filterColumn: column,
                filterValues: view.filteredData.filter((row:any) => row[column] !== "middle").map((row:any) => {
                    return row[column];
                }),
                type: "NOT_IN"
            };

            middleDrilldown(column, [filter]);
        }
    }

    // const onReady = (chart: Plot<any>): void => {
    //     chart.on("dblclick", (event: any) => {
    //         console.log(event.data.data)
    //
    //         const rowIndex = event.data.data.key;
    //
    //         const column = columnDefinitions[0].title;
    //
    //         const doubleClickedRowData = rowData.filter(row => row.key === rowIndex)[0];
    //
    //         if (doubleClickedRowData[column] !== "middle") {
    //             return;
    //         }
    //
    //         console.log('middle drilldown (double-click):' + column);
    //
    //         const filter: DrillDownPathNodeFilter = {
    //             filterColumn: column,
    //             filterValues: rowData.filter(row => row[column] !== "middle").map(row => {
    //                 return rowData[row.key][column];
    //             }),
    //             type: "NOT_IN"
    //         };
    //
    //         middleDrilldown(column, [filter]);
    //     })
    // }

    const columnDrillDown = (column: string, data: any) => {
        console.log('drilldown:' + column);

        const filterColumn = columnDefinitions[0].title;

        function createFilter(): DrillDownPathNodeFilter {
            return {
                filterColumn: filterColumn,
                filterValues: [data[filterColumn]],
                type: "EQUALS"
            };
        }

        const filter = createFilter();

        columnDrilldown(column, [filter]);
    }

    return (
        <div>
            <DualAxes
                loading={loading}
                data={[rowData, rowData]}
                xField={columnDefinitions[0].key}
                yField={['sum(gold)', 'sum(silver)']}
                legend={{position: 'top-left'}}
                onEvent={onEvent}
                geometryOptions={[
                    {
                        geometry: 'column',
                        color: '#5B8FF9',
                    },
                    {
                        geometry: 'column',
                        color: '#5AD8A6',
                    }
                ]}
                // onReady={onReady}
            />
            <ContextMenu {...popup} items={allColumns?.map(column => {
                return {title: column, action: (data) => columnDrillDown(column, data)};
            })}/>
        </div>);
};

export default DataChart;