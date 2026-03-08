import os
import json
import time
from datetime import datetime, timedelta
from pathlib import Path
import requests

# ============================================================================
# QUOTA MANAGEMENT SYSTEM
# ============================================================================
# Monitors HuggingFace API usage and implements fallback strategies
# 1. Primary: Use HF API with token (higher quota)
# 2. Fallback: Use HF Spaces (free tier)
# 3. Last resort: Use Doppel overlay + show user when to retry

class QuotaManager:
    """Manages HuggingFace API quota and fallback strategies"""
    
    def __init__(self, hf_token=None, quota_file=None):
        self.hf_token = hf_token or os.getenv('HF_TOKEN', '')
        self.quota_file = quota_file or Path(__file__).parent / '..' / 'quota_status.json'
        self.quota_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Quota tracking state
        self.quota_status = self._load_quota_status()
        self.space_cooldowns = self.quota_status.get('space_cooldowns', {}) # Track per-space
        if not isinstance(self.space_cooldowns, dict):
            self.space_cooldowns = {}
        self.last_check = time.time()
        
        print("\n" + "="*60)
        print("📊 QUOTA MANAGER INITIALIZED")
        print("="*60)
        print(f"🔑 HF Token: {'✅ Present' if self.hf_token else '⚠️ Missing'}")
        print(f"💾 Quota File: {self.quota_file}")
        print(f"📈 Current Status: {self.quota_status['status']}")
        print("="*60 + "\n")
    
    def _load_quota_status(self):
        """Load quota status from file"""
        try:
            if self.quota_file.exists():
                with open(self.quota_file, 'r') as f:
                    return json.load(f)
        except:
            pass
        
        return {
            'status': 'available',  # available, api_quota_over, spaces_quota_over
            'api_quota_reset': None,
            'spaces_quota_reset': None,
            'last_error': None,
            'api_attempts': 0,
            'spaces_attempts': 0,
            'space_cooldowns': {}, # space_id -> reset_iso_timestamp
            'last_updated': datetime.now().isoformat(),
        }
    
    def _save_quota_status(self):
        """Save quota status to file"""
        try:
            self.quota_status['last_updated'] = datetime.now().isoformat()
            with open(self.quota_file, 'w') as f:
                json.dump(self.quota_status, f, indent=2)
        except Exception as e:
            print(f"⚠️  Failed to save quota status: {e}")
    
    def check_hf_api_quota(self):
        """Check if HF API quota is available"""
        if not self.hf_token:
            return False, "No HF token provided"
        
        try:
            # Query HF API to check if authenticated
            headers = {'Authorization': f'Bearer {self.hf_token}'}
            response = requests.get(
                'https://huggingface.co/api/whoami',
                headers=headers,
                timeout=5
            )
            
            if response.status_code == 401:
                return False, "Invalid HF token"
            elif response.status_code == 200:
                return True, "API quota available"
            else:
                return False, f"API check failed: {response.status_code}"
                
        except Exception as e:
            return False, str(e)
    
    def on_api_error(self, error_msg):
        """Called when HF API call fails"""
        error_lower = str(error_msg).lower()
        
        print(f"\n⚠️  API ERROR DETECTED:")
        print(f"    Message: {error_msg[:100]}")
        
        # Detect quota limit error
        if any(keyword in error_lower for keyword in [
            'quota', 'rate limit', 'too many', 'exceeded',
            'overloaded', 'service unavailable', 'temporarily unavailable'
        ]):
            print("    🚨 QUOTA LIMIT DETECTED")
            self._set_api_quota_over(error_msg)
            return 'quota_limit'
        
        # Detect temporary/permanent failure
        elif any(keyword in error_lower for keyword in [
            'connection', 'timeout', 'network', 'refused'
        ]):
            print("    🔴 CONNECTION ERROR")
            return 'connection_error'
        else:
            print("    ❓ UNKNOWN ERROR")
            return 'unknown_error'
    
    def _set_api_quota_over(self, error_msg):
        """Mark API quota as exceeded"""
        # HF API resets daily - estimate reset time
        reset_time = datetime.now() + timedelta(days=1)
        
        self.quota_status['status'] = 'api_quota_over'
        self.quota_status['api_quota_reset'] = reset_time.isoformat()
        self.quota_status['last_error'] = error_msg[:200]
        self.quota_status['api_attempts'] += 1
        self._save_quota_status()
        
        print(f"    ⏰ Estimated Reset: {reset_time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    def on_spaces_error(self, error_msg, space_id=None, token_index=None):
        """Called when HF Spaces call fails. Now tracks per-space and per-token index."""
        try:
            error_lower = str(error_msg).lower()
            
            print(f"\n⚠️  SPACES ERROR DETECTED:")
            print(f"    Space: {space_id if space_id else 'Global'} (Token Index: {token_index if token_index is not None else 'N/A'})")
            print(f"    Message: {error_msg[:100]}")
            
            # Detect quota limit error
            if any(keyword in error_lower for keyword in [
                'quota', 'rate limit', 'too many', 'exceeded',
                'overloaded', 'service unavailable', 'queue full', 'zerogpu'
            ]):
                print(f"    🚨 QUOTA LIMIT DETECTED for {space_id if space_id else 'all spaces'}")
                self._set_spaces_quota_over(error_msg, space_id, token_index)
                return 'quota_limit'
            else:
                print(f"    ❌ SPACES UNAVAILABLE: {space_id if space_id else 'unknown'}")
                return 'spaces_unavailable'
        except Exception as e:
            print(f"   ⚠️ QuotaManager on_spaces_error failed: {e}")
            return 'error'
    
    def _set_spaces_quota_over(self, error_msg, space_id=None, token_index=None):
        """Mark Spaces quota as exceeded. If space_id provided, only cools down that space/token combo."""
        # Per-space/token cooldown: 10 min (ZeroGPU resets quickly; 1hr was too aggressive)
        reset_time = datetime.now() + timedelta(minutes=10)
        reset_iso = reset_time.isoformat()
        
        if space_id:
            # Per-space and per-token cooldown (using :: to distinguish)
            key = f"{space_id}::token{token_index}" if token_index is not None else space_id
            
            # Ensure dictionary exists
            if 'space_cooldowns' not in self.quota_status:
                self.quota_status['space_cooldowns'] = {}
                
            self.quota_status['space_cooldowns'][key] = reset_iso
            print(f"    ⏰ Individual Reset for {key}: {reset_time.strftime('%H:%M:%S')}")
        else:
            # Global fallback cooldown
            self.quota_status['status'] = 'spaces_quota_over'
            self.quota_status['spaces_quota_reset'] = reset_iso
            print(f"    ⏰ Global Reset: {reset_time.strftime('%H:%M:%S')}")

        self.quota_status['last_error'] = error_msg[:200]
        self.quota_status['spaces_attempts'] += 1
        self._save_quota_status()
    
    def get_quota_status(self):
        """Get current quota status"""
        return self.quota_status.copy()
    
    def get_reset_info(self):
        """Get reset time info for display"""
        status = self.quota_status['status']
        
        if status == 'api_quota_over' and self.quota_status['api_quota_reset']:
            reset_dt = datetime.fromisoformat(self.quota_status['api_quota_reset'])
            return {
                'status': 'api_quota_over',
                'reset_time': reset_dt.isoformat(),
                'reset_time_display': reset_dt.strftime('%Y-%m-%d %H:%M:%S'),
                'reset_in_hours': (reset_dt - datetime.now()).total_seconds() / 3600,
            }
        
        elif status == 'spaces_quota_over' and self.quota_status['spaces_quota_reset']:
            reset_dt = datetime.fromisoformat(self.quota_status['spaces_quota_reset'])
            return {
                'status': 'spaces_quota_over',
                'reset_time': reset_dt.isoformat(),
                'reset_time_display': reset_dt.strftime('%Y-%m-%d %H:%M:%S'),
                'reset_in_minutes': (reset_dt - datetime.now()).total_seconds() / 60,
            }
        
        return {
            'status': 'available',
            'reset_time': None,
            'reset_time_display': None,
        }
    
    def can_retry_api(self):
        """Check if API quota might be available now"""
        if not self.quota_status['api_quota_reset']:
            return True
        
        try:
            reset_time = datetime.fromisoformat(self.quota_status['api_quota_reset'])
            if datetime.now() >= reset_time:
                # Reset time has passed - try again
                self.quota_status['status'] = 'available'
                self.quota_status['api_quota_reset'] = None
                self._save_quota_status()
                return True
        except:
            pass
        
        return False
    
    def can_retry_spaces(self):
        """Check if Spaces quota might be available now. Always returns True to allow trying other spaces."""
        return True

    def can_use_space(self, space_id, token_index=None):
        """Check if a specific space/token is available (not in cooldown)"""
        # 1. Check global block
        if self.quota_status['status'] == 'spaces_quota_over':
            if self.quota_status['spaces_quota_reset']:
                try:
                    reset_time = datetime.fromisoformat(self.quota_status['spaces_quota_reset'])
                    if datetime.now() < reset_time:
                        return False
                    else:
                        # Global reset passed
                        self.quota_status['status'] = 'available'
                        self.quota_status['spaces_quota_reset'] = None
                        self._save_quota_status()
                except:
                    pass

        # 2. Check per-space block
        cooldowns = self.quota_status.get('space_cooldowns', {})
        
        # Check specific token index first if provided
        if token_index is not None:
            token_key = f"{space_id}::token{token_index}"
            if token_key in cooldowns:
                try:
                    reset_time = datetime.fromisoformat(cooldowns[token_key])
                    if datetime.now() < reset_time:
                        return False
                    else:
                        del self.quota_status['space_cooldowns'][token_key]
                        self._save_quota_status()
                except:
                    pass

        # Check generic space block
        if space_id in cooldowns:
            try:
                reset_time = datetime.fromisoformat(cooldowns[space_id])
                if datetime.now() < reset_time:
                    return False
                else:
                    # Individual reset passed
                    del self.quota_status['space_cooldowns'][space_id]
                    self._save_quota_status()
            except:
                pass
                
        return True
    
    def reset_quota_status(self):
        """Manual reset of quota status"""
        self.quota_status = {
            'status': 'available',
            'api_quota_reset': None,
            'spaces_quota_reset': None,
            'last_error': None,
            'api_attempts': 0,
            'spaces_attempts': 0,
            'last_updated': datetime.now().isoformat(),
        }
        self._save_quota_status()
        print("✅ Quota status reset")

# Global quota manager instance
_quota_manager = None

def initialize_quota_manager(hf_token=None):
    """Initialize global quota manager"""
    global _quota_manager
    _quota_manager = QuotaManager(hf_token=hf_token)
    return _quota_manager

def get_quota_manager():
    """Get global quota manager"""
    global _quota_manager
    if _quota_manager is None:
        _quota_manager = QuotaManager()
    return _quota_manager
