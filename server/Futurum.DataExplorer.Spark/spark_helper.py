from pyspark.sql.session import SparkSession


def get_spark_session():
    return (SparkSession.builder
            .master("local[*]")
            .appName("Futurum.DataExplorer")
            .getOrCreate())


def get_dataframe(spark: SparkSession):
    df = spark.read.option("header", "true").option("inferSchema", "true").csv("result.csv")
    return df
