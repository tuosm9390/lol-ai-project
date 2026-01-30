try:
    import redis
except ImportError:
    redis = None
import json
from typing import Optional, List, Dict, Any

# Redis 연결 실패 메시지는 프로세스당 한 번만 출력
_redis_connection_failed_logged = False

class CacheManager:
    def __init__(self, host='localhost', port=6379, db=0, password=None):
        global _redis_connection_failed_logged
        if redis is None:
            if not _redis_connection_failed_logged:
                print("Redis 모듈이 설치되지 않았습니다. 캐시를 사용하지 않습니다.")
                _redis_connection_failed_logged = True
            self.redis_client = None
            return
            
        try:
            self.redis_client = redis.Redis(host=host, port=port, db=db, password=password, decode_responses=True)
            self.redis_client.ping()
            print("Redis 연결 성공")
        except Exception as e:
            if not _redis_connection_failed_logged:
                print("Redis에 연결할 수 없습니다 (Redis 서버가 실행 중이 아닐 수 있습니다). 캐시 없이 실행합니다.")
                _redis_connection_failed_logged = True
            self.redis_client = None
    
    def is_available(self) -> bool:
        return self.redis_client is not None
    
    def set_cache(self, key: str, value: Any, ttl: int = 3600) -> bool:
        client = self.redis_client
        if not self.is_available() or client is None:
            return False
        try:
            serialized_value = json.dumps(value, default=str)
            client.setex(key, ttl, serialized_value)
            return True
        except Exception as e:
            print(f"캐시 저장 실패: {e}")
            return False
    
    def get_cache(self, key: str) -> Optional[Any]:
        client = self.redis_client
        if not self.is_available() or client is None:
            return None
        try:
            cached_value = client.get(key)
            if cached_value is not None and isinstance(cached_value, (str, bytes, bytearray)):
                return json.loads(cached_value)
            return None
        except Exception as e:
            print(f"캐시 조회 실패: {e}")
            return None
    
    def generate_key(self, prefix: str, *args) -> str:
        return f"{prefix}:{':'.join(str(arg) for arg in args)}"
    
    # Riot API 전용 캐시 메서드
    def cache_puuid(self, game_name: str, tag_line: str, puuid: str):
        key = self.generate_key("puuid", game_name, tag_line)
        return self.set_cache(key, puuid, ttl=86400)
    
    def get_cached_puuid(self, game_name: str, tag_line: str) -> Optional[str]:
        key = self.generate_key("puuid", game_name, tag_line)
        return self.get_cache(key)
    
    def cache_league_info(self, puuid: str, league_data: List[Dict]):
        key = self.generate_key("league", puuid)
        return self.set_cache(key, league_data, ttl=3600)
    
    def get_cached_league_info(self, puuid: str) -> Optional[List[Dict]]:
        key = self.generate_key("league", puuid)
        return self.get_cache(key)
    
    def cache_match_ids(self, puuid: str, match_ids: List[str]):
        key = self.generate_key("match_ids", puuid)
        return self.set_cache(key, match_ids, ttl=1800)
    
    def get_cached_match_ids(self, puuid: str) -> Optional[List[str]]:
        key = self.generate_key("match_ids", puuid)
        return self.get_cache(key)
    
    def cache_recent_match_ids(self, puuid: str, count: int, match_ids: List[str]):
        """최근 매치 ID 목록 캐시 (10분)"""
        key = self.generate_key("recent_matches", puuid, count)
        return self.set_cache(key, match_ids, ttl=600)
    
    def get_cached_recent_match_ids(self, puuid: str, count: int) -> Optional[List[str]]:
        """캐시된 최근 매치 ID 목록 조회"""
        key = self.generate_key("recent_matches", puuid, count)
        return self.get_cache(key)
    
    def cache_match_detail(self, match_id: str, match_detail: Dict):
        """개별 매치 상세 정보 캐시 (24시간)"""
        key = self.generate_key("match_detail", match_id)
        return self.set_cache(key, match_detail, ttl=86400)
    
    def get_cached_match_detail(self, match_id: str) -> Optional[Dict]:
        """캐시된 매치 상세 정보 조회"""
        key = self.generate_key("match_detail", match_id)
        return self.get_cache(key)
