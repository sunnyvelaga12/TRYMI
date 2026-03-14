"""
Custom Exceptions for TRYMI AI Service
Standardized error handling with detailed context
"""
from typing import Optional, Dict, Any
from enum import Enum


class ErrorCode(str, Enum):
    """Standardized error codes"""
    INVALID_INPUT = "INVALID_INPUT"
    FILE_NOT_FOUND = "FILE_NOT_FOUND"
    IMAGE_PROCESSING_ERROR = "IMAGE_PROCESSING_ERROR"
    AI_SERVICE_ERROR = "AI_SERVICE_ERROR"
    QUOTA_EXCEEDED = "QUOTA_EXCEEDED"
    TIMEOUT = "TIMEOUT"
    UNAUTHORIZED = "UNAUTHORIZED"
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
    INTERNAL_ERROR = "INTERNAL_ERROR"
    CONFIG_ERROR = "CONFIG_ERROR"
    MODEL_LOAD_ERROR = "MODEL_LOAD_ERROR"
    VALIDATION_ERROR = "VALIDATION_ERROR"


class TRYMIException(Exception):
    """
    Base exception class for TRYMI AI Service
    All custom exceptions inherit from this
    """
    
    def __init__(
        self,
        message: str,
        error_code: ErrorCode = ErrorCode.INTERNAL_ERROR,
        status_code: int = 500,
        details: Optional[Dict[str, Any]] = None,
        original_exception: Optional[Exception] = None
    ):
        """
        Initialize TRYMI exception
        
        Args:
            message: Human-readable error message
            error_code: Standardized error code
            status_code: HTTP status code
            details: Additional error details
            original_exception: Original exception if wrapped
        """
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details or {}
        self.original_exception = original_exception
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert exception to JSON-serializable dict"""
        return {
            'error': self.message,
            'error_code': self.error_code.value,
            'status_code': self.status_code,
            'details': self.details
        }


class InvalidInputException(TRYMIException):
    """Raised when input validation fails"""
    
    def __init__(self, message: str, details: Optional[Dict] = None):
        super().__init__(
            message=message,
            error_code=ErrorCode.INVALID_INPUT,
            status_code=400,
            details=details or {}
        )


class FileNotFoundException(TRYMIException):
    """Raised when required file is not found"""
    
    def __init__(self, file_path: str, details: Optional[Dict] = None):
        details = details or {}
        details['file_path'] = file_path
        super().__init__(
            message=f"File not found: {file_path}",
            error_code=ErrorCode.FILE_NOT_FOUND,
            status_code=404,
            details=details
        )


class ImageProcessingException(TRYMIException):
    """Raised when image processing fails"""
    
    def __init__(self, message: str, details: Optional[Dict] = None):
        super().__init__(
            message=message,
            error_code=ErrorCode.IMAGE_PROCESSING_ERROR,
            status_code=400,
            details=details or {}
        )


class AIServiceException(TRYMIException):
    """Raised when AI service call fails"""
    
    def __init__(self, message: str, details: Optional[Dict] = None, original_exception: Optional[Exception] = None):
        super().__init__(
            message=message,
            error_code=ErrorCode.AI_SERVICE_ERROR,
            status_code=503,
            details=details or {},
            original_exception=original_exception
        )


class QuotaExceededException(TRYMIException):
    """Raised when API quota is exceeded"""
    
    def __init__(self, message: str, reset_time: Optional[str] = None, details: Optional[Dict] = None):
        details = details or {}
        if reset_time:
            details['reset_time'] = reset_time
        super().__init__(
            message=message,
            error_code=ErrorCode.QUOTA_EXCEEDED,
            status_code=429,
            details=details
        )


class TimeoutException(TRYMIException):
    """Raised when operation times out"""
    
    def __init__(self, message: str, timeout_seconds: Optional[int] = None, details: Optional[Dict] = None):
        details = details or {}
        if timeout_seconds:
            details['timeout_seconds'] = timeout_seconds
        super().__init__(
            message=message,
            error_code=ErrorCode.TIMEOUT,
            status_code=504,
            details=details
        )


class AuthorizationException(TRYMIException):
    """Raised when authorization fails"""
    
    def __init__(self, message: str = "Unauthorized", details: Optional[Dict] = None):
        super().__init__(
            message=message,
            error_code=ErrorCode.UNAUTHORIZED,
            status_code=401,
            details=details or {}
        )


class RateLimitExceededException(TRYMIException):
    """Raised when rate limit is exceeded"""
    
    def __init__(self, message: str, retry_after: Optional[int] = None, details: Optional[Dict] = None):
        details = details or {}
        if retry_after:
            details['retry_after_seconds'] = retry_after
        super().__init__(
            message=message,
            error_code=ErrorCode.RATE_LIMIT_EXCEEDED,
            status_code=429,
            details=details
        )


class ConfigurationException(TRYMIException):
    """Raised when configuration is invalid"""
    
    def __init__(self, message: str, details: Optional[Dict] = None):
        super().__init__(
            message=message,
            error_code=ErrorCode.CONFIG_ERROR,
            status_code=500,
            details=details or {}
        )


class ModelLoadException(TRYMIException):
    """Raised when model fails to load"""
    
    def __init__(self, message: str, model_name: Optional[str] = None, details: Optional[Dict] = None):
        details = details or {}
        if model_name:
            details['model_name'] = model_name
        super().__init__(
            message=message,
            error_code=ErrorCode.MODEL_LOAD_ERROR,
            status_code=500,
            details=details
        )


class ValidationException(TRYMIException):
    """Raised when data validation fails"""
    
    def __init__(self, message: str, field: Optional[str] = None, details: Optional[Dict] = None):
        details = details or {}
        if field:
            details['field'] = field
        super().__init__(
            message=message,
            error_code=ErrorCode.VALIDATION_ERROR,
            status_code=400,
            details=details
        )
