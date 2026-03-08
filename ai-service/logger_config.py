"""
Structured Logging Configuration for TRYMI AI Service
Microsoft-Grade Logging with Rotation and Performance Metrics
"""
import logging
import logging.handlers
import json
from datetime import datetime
from pathlib import Path
from typing import Optional, Any, Dict
from functools import wraps
import time

from config import Config, LogLevel


class JSONFormatter(logging.Formatter):
    """Custom JSON formatter for structured logging"""
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON"""
        log_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno,
        }
        
        # Add exception info if present
        if record.exc_info:
            log_data['exception'] = {
                'type': record.exc_info[0].__name__,
                'message': str(record.exc_info[1]),
                'traceback': self.formatException(record.exc_info)
            }
        
        # Add extra fields if present
        if hasattr(record, 'extra'):
            log_data.update(record.extra)
        
        return json.dumps(log_data)


class PerformanceFormatter(logging.Formatter):
    """Formatter for performance metrics"""
    
    def format(self, record: logging.LogRecord) -> str:
        """Format performance metrics"""
        if hasattr(record, 'duration_ms'):
            return (
                f"[{record.levelname}] {record.getMessage()} - Duration: {record.duration_ms:.2f}ms"
            )
        return super().format(record)


class TRYMILogger:
    """
    Production-ready logger for TRYMI AI Service
    Features:
    - Rotating file handlers
    - JSON structured logging
    - Performance metrics
    - Separate error logs
    - Request/Response tracking
    """
    
    _instance: Optional['TRYMILogger'] = None
    _loggers: Dict[str, logging.Logger] = {}
    
    def __new__(cls):
        """Singleton pattern for logger"""
        if cls._instance is None:
            cls._instance = super(TRYMILogger, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance
    
    def _initialize(self):
        """Initialize logging infrastructure"""
        self.config = Config
        self._setup_root_logger()
        self._setup_performance_logger()
        self._setup_error_logger()
    
    def _setup_root_logger(self):
        """Setup main application logger"""
        logger = logging.getLogger('trymi')
        logger.setLevel(self.config.LOG_LEVEL.value)
        
        # Console Handler
        console_handler = logging.StreamHandler()
        console_handler.setLevel(self.config.LOG_LEVEL.value)
        
        if self.config.DEBUG:
            console_formatter = logging.Formatter(self.config.LOG_FORMAT)
        else:
            console_formatter = JSONFormatter()
        
        console_handler.setFormatter(console_formatter)
        logger.addHandler(console_handler)
        
        # File Handler with Rotation
        if self.config.LOG_FILE:
            self.config.LOG_FOLDER.mkdir(parents=True, exist_ok=True)
            
            file_handler = logging.handlers.RotatingFileHandler(
                self.config.LOG_FILE,
                maxBytes=self.config.LOG_MAX_BYTES,
                backupCount=self.config.LOG_BACKUP_COUNT
            )
            file_handler.setLevel(self.config.LOG_LEVEL.value)
            file_formatter = JSONFormatter()
            file_handler.setFormatter(file_formatter)
            logger.addHandler(file_handler)
        
        self._loggers['root'] = logger
    
    def _setup_performance_logger(self):
        """Setup performance metrics logger"""
        logger = logging.getLogger('trymi.performance')
        logger.setLevel(logging.INFO)
        
        if self.config.LOG_FILE:
            perf_log_file = self.config.LOG_FOLDER / 'trymi_performance.log'
            
            handler = logging.handlers.RotatingFileHandler(
                perf_log_file,
                maxBytes=self.config.LOG_MAX_BYTES,
                backupCount=self.config.LOG_BACKUP_COUNT
            )
            handler.setFormatter(PerformanceFormatter(self.config.LOG_FORMAT))
            logger.addHandler(handler)
        
        self._loggers['performance'] = logger
    
    def _setup_error_logger(self):
        """Setup error logger"""
        logger = logging.getLogger('trymi.error')
        logger.setLevel(logging.ERROR)
        
        if self.config.ERROR_LOG_FILE:
            self.config.LOG_FOLDER.mkdir(parents=True, exist_ok=True)
            
            handler = logging.handlers.RotatingFileHandler(
                self.config.ERROR_LOG_FILE,
                maxBytes=self.config.LOG_MAX_BYTES,
                backupCount=self.config.LOG_BACKUP_COUNT
            )
            handler.setFormatter(JSONFormatter())
            logger.addHandler(handler)
        
        self._loggers['error'] = logger
    
    def get_logger(self, name: str = 'trymi') -> logging.Logger:
        """Get or create logger with given name"""
        if name not in self._loggers:
            logger = logging.getLogger(name)
            logger.setLevel(self.config.LOG_LEVEL.value)
        return logging.getLogger(name)
    
    @staticmethod
    def log_with_context(extra: Dict[str, Any] = None):
        """Decorator to add context to logs"""
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                logger = logging.getLogger('trymi')
                context = extra or {}
                context['function'] = func.__name__
                
                logger.info(f"Starting {func.__name__}", extra={'extra': context})
                
                try:
                    result = func(*args, **kwargs)
                    return result
                except Exception as e:
                    logger.error(
                        f"Error in {func.__name__}: {str(e)}",
                        extra={'extra': context},
                        exc_info=True
                    )
                    raise
            
            return wrapper
        return decorator


class PerformanceTracker:
    """Track and log performance metrics"""
    
    def __init__(self, operation_name: str):
        """
        Initialize performance tracker
        
        Args:
            operation_name: Name of the operation to track
        """
        self.operation_name = operation_name
        self.logger = TRYMILogger().get_logger('trymi.performance')
        self.start_time = time.time()
        self.metrics = {}
    
    def record_metric(self, metric_name: str, value: float):
        """Record a metric"""
        self.metrics[metric_name] = value
    
    def end(self):
        """End tracking and log results"""
        duration_ms = (time.time() - self.start_time) * 1000
        
        log_msg = f"✅ {self.operation_name} completed in {duration_ms:.2f}ms"
        
        record = logging.LogRecord(
            name='trymi.performance',
            level=logging.INFO,
            pathname='',
            lineno=0,
            msg=log_msg,
            args=(),
            exc_info=None
        )
        record.duration_ms = duration_ms
        
        self.logger.handle(record)
        
        return duration_ms
    
    def __enter__(self):
        """Context manager entry"""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        if exc_type is None:
            self.end()
        else:
            duration_ms = (time.time() - self.start_time) * 1000
            self.logger.error(
                f"❌ {self.operation_name} failed after {duration_ms:.2f}ms: {exc_val}"
            )


def get_logger(name: str = 'trymi') -> logging.Logger:
    """
    Get a logger instance
    
    Args:
        name: Logger name (default: 'trymi')
    
    Returns:
        Configured logger instance
    """
    logger_singleton = TRYMILogger()
    return logger_singleton.get_logger(name)
