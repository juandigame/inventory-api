"""Domain exceptions and the handlers that turn them into HTTP responses."""

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class DomainError(Exception):
    """Base class for errors raised by services. Carries a message for the client."""

    status_code: int = status.HTTP_400_BAD_REQUEST

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class InvalidInputError(DomainError):
    """The input is not valid, for example a duplicate SKU (400)."""

    status_code = status.HTTP_400_BAD_REQUEST


class NotFoundError(DomainError):
    """The requested resource does not exist (404)."""

    status_code = status.HTTP_404_NOT_FOUND


class BusinessRuleError(DomainError):
    """A business rule was violated, for example insufficient stock (422)."""

    status_code = status.HTTP_422_UNPROCESSABLE_CONTENT


def domain_error_handler(request: Request, exc: DomainError) -> JSONResponse:
    """Returns the status code of the domain error with body {"detail": message}."""
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})


def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Returns 400 instead of FastAPI's default 422 for malformed input."""
    messages = []
    for error in exc.errors():
        field = ".".join(str(part) for part in error["loc"] if part != "body")
        messages.append(f"{field}: {error['msg']}" if field else error["msg"])
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST, content={"detail": "; ".join(messages)}
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Registers every error handler on the application."""
    app.add_exception_handler(DomainError, domain_error_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
