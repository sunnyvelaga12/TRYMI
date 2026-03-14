"""
Middleware and Request/Response Handling
Production-grade request processing with validation and error handling
"""
from functools import wraps
from typing import Callable, Any, Tuple, Dict, Optional
import traceback
import time
from flask import jsonify, request, Request
from datetime import datetime

from logger_config import get_logger, PerformanceTracker
from exceptions import TRYMIException, InvalidInputException, AuthorizationException
from schemas import TryOnErrorResponse
from config import Config
from pydantic import ValidationError


logger = get_logger('trymi.middleware')


class RequestValidator:
    """Validates incoming requests"""
    
    @staticmethod
    def validate_json(req: Request) -> bool:
        """Check if request has JSON body"""
        if not req.is_json:
            raise InvalidInputException(
                "Request must be JSON",
                details={'content_type': req.content_type}
            )
        return True
    
    @staticmethod
    def validate_size(req: Request, max_size_mb: float = 10) -> bool:
        """Validate request size"""
        content_length = req.content_length
        max_bytes = max_size_mb * 1024 * 1024
        
        if content_length and content_length > max_bytes:
            raise InvalidInputException(
                f"Request exceeds maximum size of {max_size_mb}MB",
                details={'received_mb': content_length / 1024 / 1024}
            )
        return True
    
    @staticmethod
    def validate_token(req: Request, token_header: str = 'Authorization') -> Optional[str]:
        """Validate and extract Bearer token"""
        auth_header = req.headers.get(token_header, '')
        
        if not auth_header:
            return None
        
        if not auth_header.startswith('Bearer '):
            raise AuthorizationException("Invalid authorization header format")
        
        return auth_header.split('Bearer ')[1]


class ResponseFormatter:
    """Formats API responses consistently"""
    
    @staticmethod
    def success(data: Dict[str, Any], status_code: int = 200):
        """Format successful response"""
        response = {'success': True}
        response.update(data)
        return jsonify(response), status_code
    
    @staticmethod
    def error(
        exception: Exception,
        status_code: Optional[int] = None,
        request_id: Optional[str] = None
    ) -> Tuple[Dict, int]:
        """Format error response"""
        if isinstance(exception, TRYMIException):
            error_dict = exception.to_dict()
            if request_id:
                error_dict['request_id'] = request_id
            return jsonify(error_dict), exception.status_code
        
        # Generic exception
        error_dict = {
            'success': False,
            'error': 'Internal server error',
            'error_code': 'INTERNAL_ERROR',
            'status_code': status_code or 500
        }
        if request_id:
            error_dict['request_id'] = request_id
        
        if Config.DETAILED_ERRORS:
            error_dict['details'] = str(exception)
        
        return jsonify(error_dict), status_code or 500


def require_json(func: Callable) -> Callable:
    """Decorator to require JSON content type"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            RequestValidator.validate_json(request)
            return func(*args, **kwargs)
        except InvalidInputException as e:
            return ResponseFormatter.error(e)
    return wrapper


def handle_exceptions(func: Callable) -> Callable:
    """
    Decorator for handling exceptions in API endpoints
    Features:
    - Catches all exceptions
    - Logs errors with context
    - Returns formatted error responses
    - Tracks performance
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        request_id = request.headers.get('X-Request-ID', f"{datetime.utcnow().timestamp()}")
        start_time = time.time()
        
        try:
            logger.info(
                f"Incoming request: {request.method} {request.path}",
                extra={'extra': {'request_id': request_id}}
            )
            
            # Call the actual endpoint function
            result = func(*args, **kwargs)
            
            processing_time = time.time() - start_time
            logger.info(
                f"Request completed successfully in {processing_time:.2f}s",
                extra={'extra': {'request_id': request_id, 'duration_ms': processing_time * 1000}}
            )
            
            return result
        
        except ValidationError as e:
            """Pydantic validation error"""
            processing_time = time.time() - start_time
            
            error_details = {
                'validation_errors': [
                    {
                        'field': str(err['loc']),
                        'error': str(err['msg']),
                        'type': err['type']
                    }
                    for err in e.errors()
                ]
            }
            
            exc = InvalidInputException(
                "Request validation failed",
                details=error_details
            )
            
            logger.warning(
                f"Validation error: {str(e)[:200]}",
                extra={'extra': {'request_id': request_id, 'duration_ms': processing_time * 1000}},
                exc_info=True
            )
            
            return ResponseFormatter.error(exc, request_id=request_id)
        
        except TRYMIException as e:
            """Known application exception"""
            processing_time = time.time() - start_time
            
            log_level = 'warning' if e.status_code < 500 else 'error'
            log_method = getattr(logger, log_level)
            
            log_method(
                f"{e.error_code.value}: {e.message}",
                extra={'extra': {'request_id': request_id, 'duration_ms': processing_time * 1000}},
                exc_info=True if log_level == 'error' else False
            )
            
            return ResponseFormatter.error(e, request_id=request_id)
        
        except Exception as e:
            """Unexpected exception"""
            processing_time = time.time() - start_time
            
            logger.error(
                f"Unexpected error: {str(e)}\n{traceback.format_exc()}",
                extra={'extra': {'request_id': request_id, 'duration_ms': processing_time * 1000}},
                exc_info=True
            )
            
            return ResponseFormatter.error(e, status_code=500, request_id=request_id)
    
    return wrapper


def validate_pydantic_model(model_class):
    """
    Decorator to validate request body against Pydantic model
    Usage: @validate_pydantic_model(TryOnRequestV2)
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                # Get JSON data
                json_data = request.get_json()
                
                if not json_data:
                    raise InvalidInputException("Request body cannot be empty")
                
                # Validate against Pydantic model
                validated_data = model_class(**json_data)
                
                # Pass validated data to function
                kwargs['validated_request'] = validated_data
                
                return func(*args, **kwargs)
            
            except ValidationError as e:
                # Pydantic raises this
                error_details = {
                    'validation_errors': [
                        {
                            'field': str(err['loc']),
                            'error': str(err['msg']),
                            'type': err['type']
                        }
                        for err in e.errors()
                    ]
                }
                
                exc = InvalidInputException(
                    "Request validation failed",
                    details=error_details
                )
                
                logger.warning(
                    f"Pydantic validation error: {e}",
                    exc_info=True
                )
                
                return ResponseFormatter.error(exc)
            
            except Exception as e:
                logger.error(f"Validation decorator error: {e}", exc_info=True)
                raise
        
        return wrapper
    return decorator


def log_request_response(func: Callable) -> Callable:
    """
    Decorator to log full request and response
    Useful for debugging
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        # Log request
        logger.debug(
            f"Request: {request.method} {request.path}",
            extra={'extra': {
                'method': request.method,
                'path': request.path,
                'headers': dict(request.headers),
                'args': dict(request.args)
            }}
        )
        
        result = func(*args, **kwargs)
        
        # Log response
        logger.debug(
            f"Response status: {result[1] if isinstance(result, tuple) else 200}",
            extra={'extra': {
                'response_status': result[1] if isinstance(result, tuple) else 200
            }}
        )
        
        return result
    
    return wrapper


def track_performance(operation_name: str = None):
    """
    Decorator to track operation performance
    Usage: @track_performance("Virtual Try-On Generation")
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            op_name = operation_name or func.__name__
            
            with PerformanceTracker(op_name) as tracker:
                result = func(*args, **kwargs)
                return result
        
        return wrapper
    return decorator


class CORSHeaders:
    """Standard CORS headers for responses"""
    
    @staticmethod
    def add_cors_headers(response):
        """Add CORS headers to response"""
        response.headers['Access-Control-Allow-Origin'] = Config.CORS_ORIGINS[0]
        response.headers['Access-Control-Allow-Methods'] = ', '.join(Config.CORS_METHODS)
        response.headers['Access-Control-Allow-Headers'] = ', '.join(Config.CORS_HEADERS)
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response
