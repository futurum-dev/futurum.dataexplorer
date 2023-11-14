from enum import Enum

from fastapi import FastAPI, Depends, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.logger import logger
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from pydantic import BaseModel

from pyspark.sql.functions import *
from pyspark.sql.session import SparkSession

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


@app.post("/query")
async def data(query: Query, spark: SparkSession = Depends(get_spark_session)):
    df = get_dataframe(spark)
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

