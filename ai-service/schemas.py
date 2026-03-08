"""
Request/Response Models and Validation using Pydantic
Type-safe API contracts
"""
from typing import List, Optional, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field, validator, constr


class ClothingCategory(str, Enum):
    """Available clothing categories"""
    TSHIRTS = "tshirts"
    SHIRTS = "shirts"
    SWEATERS = "sweaters"
    DRESSES = "dresses"
    SKIRTS = "skirts"
    PANTS = "pants"
    SHORTS = "shorts"
    JACKETS = "jackets"
    COATS = "coats"
    SHOES = "shoes"
    BAGS = "bags"
    ACCESSORIES = "accessories"


class PlacementType(str, Enum):
    """Placement types for virtual try-on"""
    UPPER_BODY = "upper_body"
    LOWER_BODY = "lower_body"
    FULL_BODY = "full_body"
    FEET = "feet"
    ACCESSORIES = "accessories"


class ClothingItem(BaseModel):
    """Model for a single clothing item"""
    clothingImagePath: str = Field(..., min_length=1, description="Path to clothing image")
    category: ClothingCategory = Field(default=ClothingCategory.TSHIRTS, description="Product category")
    product_id: Optional[str] = Field(None, description="Product ID from database")
    size: Optional[str] = Field(None, description="Clothing size")
    color: Optional[str] = Field(None, description="Clothing color")
    
    class Config:
        use_enum_values = True


class TryOnRequestV1(BaseModel):
    """API Request model for virtual try-on (v1 - single item - legacy)"""
    personImagePath: str = Field(..., min_length=1, description="Path to person image")
    clothingImagePath: str = Field(..., min_length=1, description="Path to clothing image")
    category: Optional[str] = Field(None, description="Clothing category")
    outputFolder: Optional[str] = Field(None, description="Output folder path")
    
    @validator('personImagePath', 'clothingImagePath')
    def validate_image_path(cls, v):
        """Validate image path is not empty"""
        if not v or not isinstance(v, str):
            raise ValueError("Image path must be a non-empty string")
        return v


class TryOnRequestV2(BaseModel):
    """API Request model for virtual try-on (v2 - multiple items)"""
    personImagePath: str = Field(..., min_length=1, description="Path to person image")
    clothingItems: List[ClothingItem] = Field(..., min_items=1, max_items=5, description="Array of clothing items (max 5)")
    outputFolder: Optional[str] = Field(None, description="Output folder path")
    pose_confidence: Optional[float] = Field(0.5, ge=0.0, le=1.0, description="Minimum pose confidence threshold")
    
    @validator('personImagePath')
    def validate_person_image(cls, v):
        """Validate person image path"""
        if not v or not isinstance(v, str):
            raise ValueError("Person image path must be a non-empty string")
        return v
    
    @validator('clothingItems')
    def validate_clothing_items(cls, v):
        """Validate clothing items"""
        if not v:
            raise ValueError("At least one clothing item is required")
        return v


class TryOnResponse(BaseModel):
    """API Response model for virtual try-on"""
    success: bool = Field(..., description="Whether operation was successful")
    resultImageUrl: Optional[str] = Field(None, description="URL to result image")
    animatedUrl: Optional[str] = Field(None, description="URL to animated result (if available)")
    processingTime: str = Field(..., description="Processing time in seconds")
    poseDetected: bool = Field(default=False, description="Whether pose was successfully detected")
    modelUsed: str = Field(..., description="Model used for generation")
    mode: str = Field(default="overlay_only", description="Processing mode (ai_with_fallback or overlay_only)")
    confidence: Optional[float] = Field(None, description="Confidence score of the result (0-1)")


class TryOnErrorResponse(BaseModel):
    """API Error response model"""
    success: bool = Field(False, description="Success flag")
    error: str = Field(..., description="Error message")
    details: Optional[str] = Field(None, description="Detailed error information")
    error_code: Optional[str] = Field(None, description="Standardized error code")
    processingTime: Optional[str] = Field(None, description="Processing time before error")
    quota_info: Optional[Dict[str, Any]] = Field(None, description="Quota information if quota-related")


class HealthCheckResponse(BaseModel):
    """API Response model for health check"""
    status: str = Field(..., description="Service status (healthy/degraded/unhealthy)")
    service: str = Field(..., description="Service name")
    version: str = Field(..., description="Service version")
    model_type: str = Field(..., description="Current model type")
    model_loaded: bool = Field(..., description="Whether AI model is loaded")
    overlay_only: bool = Field(..., description="Whether running in overlay-only mode")
    port: int = Field(..., description="Service port")
    timestamp: Optional[float] = Field(None, description="Response timestamp")


class AIStatusResponse(BaseModel):
    """API Response model for AI status"""
    status: str = Field(..., description="Status label (FAST/STABLE/SLOW/OFFLINE)")
    message: str = Field(..., description="Status message")
    isActive: bool = Field(..., description="Whether AI is active and ready")
    timestamp: float = Field(..., description="Response timestamp")


class QuotaStatusResponse(BaseModel):
    """API Response model for quota status"""
    success: bool = Field(..., description="Whether query was successful")
    quota_status: Optional[str] = Field(None, description="Current quota status")
    api_quota_reset: Optional[str] = Field(None, description="API quota reset time")
    spaces_quota_reset: Optional[str] = Field(None, description="Spaces quota reset time")
    reset_info: Optional[Dict[str, Any]] = Field(None, description="Detailed reset information")
    last_error: Optional[str] = Field(None, description="Last error message")
    can_retry_api: Optional[bool] = Field(None, description="Whether API can be retried")
    can_retry_spaces: Optional[bool] = Field(None, description="Whether Spaces can be retried")


class ConfigResponse(BaseModel):
    """API Response model for configuration"""
    environment: str = Field(..., description="Environment type")
    api_version: str = Field(..., description="API version")
    debug: bool = Field(..., description="Debug mode enabled")
    ai_spaces: List[str] = Field(..., description="Available AI spaces")
    max_image_size_mb: float = Field(..., description="Max image size in MB")
    max_processing_time_sec: int = Field(..., description="Max processing time in seconds")
    timeout_sec: int = Field(..., description="Request timeout in seconds")
    log_level: str = Field(..., description="Log level")
    force_overlay_only: bool = Field(..., description="Force overlay-only mode")
    enable_metrics: bool = Field(..., description="Metrics enabled")
    enable_cache: bool = Field(..., description="Caching enabled")
    enable_rate_limit: bool = Field(..., description="Rate limiting enabled")


# Type aliases for convenience
RequestModel = TryOnRequestV2
ResponseModel = TryOnResponse
ErrorResponseModel = TryOnErrorResponse
