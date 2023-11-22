import asyncio

from enum import Enum

from fastapi import APIRouter, Depends

from pydantic import BaseModel

from concurrent.futures import ThreadPoolExecutor

from pyspark.sql.functions import *

from spark_helper import get_dataframe, get_spark_session

import json

import time


class FilterType(str, Enum):
    equalsFilter = "equalsFilter"
    orFilter = "inFilter"
    notOrFilter = "notInFilter"


class Filter(BaseModel):
    column: str
    values: List[str]
    type: FilterType


class Query(BaseModel):
    drilledColumn: str
    aggregateColumns: List[str]
    filters: List[Filter]
    top: int
    bottom: int


router = APIRouter()

executor = ThreadPoolExecutor(max_workers=2)


def get_query():
    # Open the JSON file and deserialize its contents
    with open("./query.json", 'r') as file:
        query_dict = json.load(file)
        # Deserialize the dictionary to a Query instance
        return Query.parse_obj(query_dict)


spark = get_spark_session()


def fetch_data():
    df = get_dataframe(spark)
    working_dataframe = df
    final_dataframe = df

    query = get_query()

    time.sleep(2)

    sum_aggregates = list(map(lambda column: "sum(" + column + ")", query.aggregateColumns))

    for filter in query.filters:
        if filter.type == 'equalsFilter':
            working_dataframe = working_dataframe.filter(filter.column + "==" + "'" + filter.values[0] + "'")
        elif filter.type == 'inFilter':
            working_dataframe = working_dataframe.filter(
                filter.column + " in (" + ",".join(map(lambda value: "'" + value + "'", filter.values)) + ")")
        elif filter.type == 'notInFilter':
            working_dataframe = working_dataframe.filter(
                filter.column + " not in (" + ",".join(map(lambda value: "'" + value + "'", filter.values)) + ")")

    if query.drilledColumn:
        working_dataframe = working_dataframe.groupby(query.drilledColumn).sum(*query.aggregateColumns).orderBy(
            *sum_aggregates)

    original_count = working_dataframe.count()

    if query.top > 0 and query.bottom < original_count:
        working_dataframe = working_dataframe.withColumn("index", monotonically_increasing_id())

        top_dataframe = working_dataframe.limit(query.top)

        bottom_dataframe = working_dataframe.orderBy(desc('index')).limit(query.bottom).orderBy(*sum_aggregates)

        middle_dataframe = working_dataframe.subtract(top_dataframe).subtract(bottom_dataframe)

        middle_dataframe = middle_dataframe.drop(query.drilledColumn)
        middle_dataframe = middle_dataframe.withColumn(query.drilledColumn, lit("middle"))

        order_by_sum_aggregates = list(map(lambda column: "sum(sum(" + column + "))", query.aggregateColumns))

        middle_dataframe = middle_dataframe.groupby(query.drilledColumn).sum(*sum_aggregates).orderBy(
            *order_by_sum_aggregates)

        top_dataframe = top_dataframe.drop("index")
        bottom_dataframe = bottom_dataframe.drop("index")
        final_dataframe = top_dataframe.union(middle_dataframe).union(bottom_dataframe)
    else:
        final_dataframe = working_dataframe

    spark_data = final_dataframe.toJSON().collect()

    return {
        "data": spark_data,
        "columns": final_dataframe.columns,
        "allColumns": df.columns,
        "originalCount": original_count
    }


@router.get("/query-test")
async def data():
    loop = asyncio.get_event_loop()

    result = await loop.run_in_executor(executor, fetch_data)

    return result
