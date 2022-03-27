import React, {useState} from 'react';

import {Table} from 'antd';

import {ContextMenu} from "./context-menu";
import {DrillDownPathNodeFilter} from "./domain";
import {FilterValue, SorterResult, TableCurrentDataSource, TablePaginationConfig} from "antd/lib/table/interface";

import './data-grid.css'
import {InteractiveDataComponentProps} from "./interactive-data";

const DataGrid = ({loading, rowData, allColumns, columnDefinitions, columnDrilldown, middleDrilldown} : InteractiveDataComponentProps) => {
    const [popup, setPopup] = useState<{ visible: boolean, x: number, y: number }>({visible: false, x: 0, y: 0});

    const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);

    const [paginationPage, setPaginationPage] = useState<number>(1);

    const onRow = (record: any) => ({
        onDoubleClick: (event: any) => {
            event.preventDefault()

            const rowIndex = event.currentTarget.rowIndex - 1;

            const column = columnDefinitions[0].title;

            const doubleClickedRowData = rowData.filter(row => row.key === rowIndex)[0];

            if(doubleClickedRowData[column] !== "middle"){
                return;
            }

            console.log('middle drilldown (double-click):' + column);

            const filter: DrillDownPathNodeFilter = {
                filterColumn: column,
                filterValues: rowData.filter(row => row[column] !== "middle").map(row => {
                    return rowData[row.key][column];
                }),
                type: "NOT_IN"
            };

            middleDrilldown(column, [filter]);
        },
        onContextMenu: (event: any) => {
            event.preventDefault()

            const rowIndex = event.currentTarget.rowIndex - 1;

            const filterColumn = columnDefinitions[0].title;

            const anyMiddleRows = rowData.filter(row => [...selectedRowKeys, rowIndex].includes(row.key))
                .filter(row => row[filterColumn] === "middle");

            if(anyMiddleRows.length > 0){
                return;
            }

            if (!popup.visible) {
                document.addEventListener(`click`, function onClickOutside() {
                    setPopup({...popup, visible: false})
                    document.removeEventListener(`click`, onClickOutside)
                })
            }

            if (selectedRowKeys) {
                setSelectedRowKeys([...selectedRowKeys, rowIndex])
            } else {
                setSelectedRowKeys([rowIndex])
            }

            setPopup({
                visible: true,
                x: event.clientX,
                y: event.clientY
            })
        }
    });

    const onSelectChange = (newSelectedRowKeys: any) => {
        setSelectedRowKeys(newSelectedRowKeys);
    };

    const rowSelection = {
        selectedRowKeys,
        onChange: onSelectChange,
    };

    const columnDrillDown = (column: string) => {
        console.log('drilldown:' + column);

        const filterColumn = columnDefinitions[0].title;

        function createFilter(): DrillDownPathNodeFilter {
            if (selectedRowKeys.length === 1) {
                const columnValue = rowData[selectedRowKeys[0]][filterColumn];

                if (columnValue !== "middle") {
                    return {
                        filterColumn: filterColumn,
                        filterValues: [rowData[selectedRowKeys[0]][filterColumn]],
                        type: "EQUALS"
                    };
                } else {
                    return {
                        filterColumn: filterColumn,
                        filterValues: rowData.filter(row => row[filterColumn] !== "middle").map(row => {
                            return rowData[row.key][filterColumn];
                        }),
                        type: "NOT_IN"
                    };
                }
            } else {
                return {
                    filterColumn: filterColumn,
                    filterValues: selectedRowKeys.map(selectedRowKey => {
                        return rowData[selectedRowKey][filterColumn];
                    }),
                    type: "IN"
                };
            }
        }

        const filter = createFilter();

        columnDrilldown(column, [filter]);
    }

    const onPaginationPageChange = (page: number, pageSize: number) => {
        setPaginationPage(page);
    }

    const onChange = (pagination: TablePaginationConfig, filters: Record<string, FilterValue | null>, sorter: SorterResult<any> | SorterResult<any>[], extra: TableCurrentDataSource<any>): void => {
        console.log('params', pagination, filters, sorter, extra);
    }

    if (selectedRowKeys) {
        console.log('selectedRowKeys changed: ', selectedRowKeys);
    }

    return (
        <div>
            <Table
                loading={loading}
                columns={columnDefinitions}
                dataSource={rowData}
                rowSelection={rowSelection}
                onRow={onRow}
                bordered={true}
                size={"small"}
                pagination={{current: paginationPage, onChange: onPaginationPageChange,}}
                onChange={onChange}
                rowClassName={(record, index) => {
                    return record[Object.keys(record)[0]] !== 'middle' ? 'table-row-light' : 'table-row-dark';
                }}
            />
            <ContextMenu {...popup} items={allColumns?.map(column => {
                return {title: column, action: () => columnDrillDown(column)};
            })}/>
        </div>
    );
};

export default DataGrid;