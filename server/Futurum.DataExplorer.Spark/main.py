import logging

from fastapi import FastAPI, Request, status, Depends
from fastapi.exceptions import RequestValidationError
from fastapi.logger import logger as fastapi_logger
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from query import router as query_router
from query_ai import router as query_ai_router
from query_test import router as query_test_router

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

app = FastAPI()

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(query_router)
app.include_router(query_ai_router)
app.include_router(query_test_router)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    fastapi_logger.info(f"Request: {request.method} {request.url}")
    response = await call_next(request)
    fastapi_logger.info(f"Response: {response.status_code}")
    return response


def register_exception(app: FastAPI):
    @app.exception_handler(Exception)
    async def exception_handler(request: Request, exc: Exception):
        fastapi_logger.error(f"Unhandled exception occurred: {exc}", exc_info=True)
        return JSONResponse(status_code=500, content={"detail": "Internal Server Error"})

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        exc_str = f'{exc}'.replace('\n', ' ').replace('   ', ' ')
        # or logger.error(f'{exc}')
        fastapi_logger.error(request, exc_str)
        content = {'status_code': 10422, 'message': exc_str, 'data': None}
        return JSONResponse(content=content, status_code=status.HTTP_422_UNPROCESSABLE_ENTITY)


@app.get("/")
async def root():
    return {"message": "Hello World"}
