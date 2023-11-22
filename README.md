# futurum.dataexplorer

## Setup OpenAPI Key
Follow these instructions to setup your OpenAPI key:
https://platform.openai.com/docs/quickstart/step-2-setup-your-api-key

## Spark
In the 'server' folder, run:
```
docker-compose up
```

## Postgres
```
docker run --name dataexplorer-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=root -e POSTGRES_DB=dataexplorer -p 5432:5432 postgres
```

## Jupyter-Labs
```
docker build \
  -f cluster-base.Dockerfile \
  -t cluster-base .
```

```
docker build \
  --build-arg spark_version="${SPARK_VERSION}" \
  --build-arg jupyterlab_version="${JUPYTERLAB_VERSION}" \
  -f jupyterlab.Dockerfile \
  -t jupyterlab .
```
