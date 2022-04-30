import React from 'react';

import {Row, Col, Divider} from 'antd';

import DrillDownTree from "./drill-down-tree";
import Header from "./header";
import DataSummaryGrid from "./data-summary-grid";
import InteractiveData from "./interactive-data";

import './application.css'

function Application() {
    return (
        <div>
            <Row><Header/></Row>
            <Row>
                <Col flex="250px" style={{maxWidth: '"250px"'}}><DrillDownTree/></Col>
                <Col flex="10px"><Divider type='vertical'/></Col>
                <Col flex="auto">
                    <Row>
                        <Col span={24}>
                            <DataSummaryGrid/>
                        </Col>
                    </Row>
                    <Row>
                        <Col span={24}>
                            <InteractiveData/>
                        </Col>
                    </Row>
                </Col>
            </Row>
        </div>
    );
}

export default Application;
