from enum import Enum

from fastapi import FastAPI, Depends, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.logger import logger
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from pydantic import BaseModel

from pyspark.sql.functions import *
from pyspark.sql.session import SparkSession

import json

from openai import OpenAI

app = FastAPI()

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


class Query2(BaseModel):
    drilledColumns: List[str]
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


def get_spark_session():
    spark = SparkSession.builder.master("local[*]").appName("Futurum.DataExplorer").getOrCreate()
    try:
        yield spark
    finally:
        spark.stop()


def get_dataframe(spark: SparkSession):
    df = spark.read.option("header", "true").option("inferSchema", "true").csv("result.csv")
    return df


@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.get("/query-ai")
async def data(spark: SparkSession = Depends(get_spark_session)):
    user_question = "for the United States and Germany, show by sport and country. show the top 5 and the bottom 3"

    json_schema = """
    {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "definitions": {
    "FilterType": {
      "type": "string",
      "enum": ["equalsFilter", "inFilter", "notInFilter"]
    },
    "Filter": {
      "type": "object",
      "properties": {
        "column": {
          "type": "string"
        },
        "values": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "type": {
          "$ref": "#/definitions/FilterType"
        }
      },
      "required": ["column", "values", "type"]
    },
    "Query": {
      "type": "object",
      "properties": {
        "drilledColumns": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "aggregateColumns": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "filters": {
          "type": "array",
          "items": {
            "$ref": "#/definitions/Filter"
          }
        },
        "top": {
          "type": "integer"
        },
        "bottom": {
          "type": "integer"
        }
      },
      "required": ["drilledColumns", "aggregateColumns", "filters", "top", "bottom"]
    }
  }
}

-----------------

"drilledColumns" is an array of columns that will be used to group the data. For example, if we want to see the data by country and sport, then the array should contain "country" and "sport".

Filters:
You need to add a filter for each column that needs filtering. For each filter, it should be populate as follows:
- "equalsFilter": If we need to filter by only one value, then
-- "column" should be the column name for which the filter is applied
-- "type" should be "equalsFilter"
-- "values" should contain only one value
- "inFilter": If we need to filter by multiple values, then
-- "column" should be the column name for which the filter is applied
-- "FilterType' should be "inFilter"
-- 'values' should contain multiple values
- notInFilter: If we need to filter out by multiple values, then
-- "column" should be the column name for which the filter is applied
-- 'FilterType' should be "notInFilter"
-- "values" should contain multiple values
"""

    # Crafting a question
    system_setup = f"""given the following JSON schema:
    
    {json_schema}
    
    ---------
    
    return only the JSON data to describe the user question in terms of the JSON schema"""

    data_structure = """
    and given this data structure:
    
    dimension columns:
    athlete,age,country,year,sport
    
    metric columns:
    gold,silver,bronze,total
    """

    # loads from os.environ.get("OPENAI_API_KEY") - https://platform.openai.com/docs/quickstart/step-2-setup-your-api-key
    client = OpenAI()

    chat_completion = client.chat.completions.create(
        messages=[
            {
                "role": "system",
                "content": system_setup,
            },
            {
                "role": "system",
                "content": data_structure,
            },
            {
                "role": "user",
                "content": user_question,
            }
        ],
        model="gpt-4-1106-preview",
        max_tokens=4000,
        response_format={"type": "json_object"}
    )

    # Extracting and printing the answer
    response = chat_completion.choices[0].message.content.strip()

    # Parse the JSON string to a Python dictionary
    data = json.loads(response)

    # Deserialize the dictionary to a Query instance
    query = Query2.parse_obj(data)

    df = get_dataframe(spark)
    working_dataframe = df
    final_dataframe = df

    sum_aggregates = list(map(lambda column: "sum(" + column + ")", query.aggregateColumns))

    if query.filters:
        for filter in query.filters:
            if filter.type == 'equalsFilter':
                working_dataframe = working_dataframe.filter(filter.column + "==" + "'" + filter.values[0] + "'")
            elif filter.type == 'inFilter':
                working_dataframe = working_dataframe.filter(filter.column + " in (" + ",".join(map(lambda value: "'" + value + "'", filter.values)) + ")")
            elif filter.type == 'notInFilter':
                working_dataframe = working_dataframe.filter(filter.column + " not in (" + ",".join(map(lambda value: "'" + value + "'", filter.values)) + ")")

    if query.drilledColumns:
        working_dataframe = working_dataframe.groupby(*query.drilledColumns).sum(*query.aggregateColumns).orderBy(*sum_aggregates)

    original_count = working_dataframe.count()

    if query.top > 0 and query.bottom < original_count:
        working_dataframe = working_dataframe.withColumn("index", monotonically_increasing_id())

        top_dataframe = working_dataframe.limit(query.top)

        bottom_dataframe = working_dataframe.orderBy(desc('index')).limit(query.bottom).orderBy(*sum_aggregates)

        middle_dataframe = working_dataframe.subtract(top_dataframe).subtract(bottom_dataframe)

        middle_dataframe = middle_dataframe.drop(*query.drilledColumns)

        for drilledColumn in query.drilledColumns:
            middle_dataframe = middle_dataframe.withColumn(drilledColumn, lit("middle"))

        order_by_sum_aggregates = list(map(lambda column: "sum(sum(" + column + "))", query.aggregateColumns))
        middle_dataframe = middle_dataframe.groupby(*query.drilledColumns).sum(*sum_aggregates).orderBy(*order_by_sum_aggregates)

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


@app.post("/query")
async def data(query: Query, spark: SparkSession = Depends(get_spark_session)):
    df = get_dataframe(spark)
    working_dataframe = df
    final_dataframe = df

    sum_aggregates = list(map(lambda column: "sum(" + column + ")", query.aggregateColumns))

    for filter in query.filters:
        if filter.type == 'equalsFilter':
            working_dataframe = working_dataframe.filter(filter.column + "==" + "'" + filter.values[0] + "'")
        elif filter.type == 'inFilter':
            working_dataframe = working_dataframe.filter(filter.column + " in (" + ",".join(map(lambda value: "'" + value + "'", filter.values)) + ")")
        elif filter.type == 'notInFilter':
            working_dataframe = working_dataframe.filter(filter.column + " not in (" + ",".join(map(lambda value: "'" + value + "'", filter.values)) + ")")

    if query.drilledColumn:
        working_dataframe = working_dataframe.groupby(query.drilledColumn).sum(*query.aggregateColumns).orderBy(*sum_aggregates)

    original_count = working_dataframe.count()

    if query.top > 0 and query.bottom < original_count:
        working_dataframe = working_dataframe.withColumn("index", monotonically_increasing_id())

        top_dataframe = working_dataframe.limit(query.top)

        bottom_dataframe = working_dataframe.orderBy(desc('index')).limit(query.bottom).orderBy(*sum_aggregates)

        middle_dataframe = working_dataframe.subtract(top_dataframe).subtract(bottom_dataframe)

        middle_dataframe = middle_dataframe.drop(query.drilledColumn)
        middle_dataframe = middle_dataframe.withColumn(query.drilledColumn, lit("middle"))

        order_by_sum_aggregates = list(map(lambda column: "sum(sum(" + column + "))", query.aggregateColumns))

        middle_dataframe = middle_dataframe.groupby(query.drilledColumn).sum(*sum_aggregates).orderBy(*order_by_sum_aggregates)

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

