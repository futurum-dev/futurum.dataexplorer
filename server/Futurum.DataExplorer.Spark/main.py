import logging

from fastapi import FastAPI, Request, status
from fastapi.logger import logger
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from typing import Optional, List
from enum import Enum

from pydantic import BaseModel

from pyspark.context import SparkContext
from pyspark.sql.session import SparkSession
from pyspark.sql.functions import *

app = FastAPI()

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

sc = SparkContext('local')
spark = SparkSession(sc)

df = spark.read.option("header", "true").option("inferSchema", "true").csv("result.csv")


class FilterType(str, Enum):
    noneFilter = "equalsFilter"
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


def register_exception(app: FastAPI):
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):

        exc_str = f'{exc}'.replace('\n', ' ').replace('   ', ' ')
        # or logger.error(f'{exc}')
        logger.error(request, exc_str)
        content = {'status_code': 10422, 'message': exc_str, 'data': None}
        return JSONResponse(content=content, status_code=status.HTTP_422_UNPROCESSABLE_ENTITY)


@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.get("/hello/{name}")
async def say_hello(name: str):
    return {"message": f"Hello {name}"}


@app.get("/data")
async def data():
    return df.toJSON().collect()


@app.get("/data/count")
async def data():
    return df.count()


@app.get("/data/schema")
async def data():
    return df.schema.json()


@app.get("/data/query1")
async def data():
    finalDataframe = df.groupby("country", "year").count().orderBy("country", "year")
    sparkData = finalDataframe.toJSON().collect()
    return {
        "data": sparkData,
        "columns": finalDataframe.columns,
        "allColumns": df.columns
    }


@app.get("/data/query/{column}")
async def data(column: str):
    finalDataframe = df.groupby(column).count().orderBy(column)
    sparkData = finalDataframe.toJSON().collect()
    return {
        "data": sparkData,
        "columns": finalDataframe.columns,
        "allColumns": df.columns
    }


@app.get("/data/filteredQuery/{column}")
async def dataWithFilter(column: str, filterColumn: str, filterValue: str):
    finalDataframe = df.filter(filterColumn + "=='" + filterValue + "'").groupby(column).count().orderBy(column)
    sparkData = finalDataframe.toJSON().collect()
    return {
        "data": sparkData,
        "columns": finalDataframe.columns,
        "allColumns": df.columns
    }


@app.get("/data/query2/{athlete}")
async def data(athlete: str):
    finalDataframe = df.filter(col("athlete") == f"{athlete}").groupby("country").count()
    sparkData = finalDataframe.toJSON().collect()
    return {
        "data": sparkData,
        "columns": finalDataframe.columns,
        "allColumns": df.columns
    }


@app.post("/data/query3")
async def data(query: Query):
    working_dataframe = df
    final_dataframe = df

    for filter in query.filters:
        if filter.type == 'equalsFilter':
            working_dataframe = working_dataframe.filter(filter.column + "==" + "'" + filter.values[0] + "'")
        elif filter.type == 'inFilter':
            working_dataframe = working_dataframe.filter(filter.column + " in (" + ",".join(map(lambda value: "'" + value + "'", filter.values)) + ")")
        elif filter.type == 'notInFilter':
            working_dataframe = working_dataframe.filter(filter.column + " not in (" + ",".join(map(lambda value: "'" + value + "'", filter.values)) + ")")

    if query.drilledColumn:
        working_dataframe = working_dataframe.groupby(query.drilledColumn).sum('gold', 'silver', 'bronze', 'total').orderBy('sum(gold)', 'sum(silver)', 'sum(bronze)', 'sum(total)')

    original_count = working_dataframe.count()

    if query.top > 0 and query.bottom < original_count:
        working_dataframe = working_dataframe.withColumn("index", monotonically_increasing_id())

        top_dataframe = working_dataframe.limit(query.top)

        bottom_dataframe = working_dataframe.orderBy(desc('index')).limit(query.bottom).orderBy('sum(gold)', 'sum(silver)', 'sum(bronze)', 'sum(total)')

        middle_dataframe = working_dataframe.subtract(top_dataframe).subtract(bottom_dataframe)

        middle_dataframe = middle_dataframe.drop(query.drilledColumn)
        middle_dataframe = middle_dataframe.withColumn(query.drilledColumn, lit("middle"))
        middle_dataframe = middle_dataframe.groupby(query.drilledColumn).sum('sum(gold)', 'sum(silver)', 'sum(bronze)', 'sum(total)').orderBy('sum(sum(gold))', 'sum(sum(silver))', 'sum(sum(bronze))', 'sum(sum(total))')

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

