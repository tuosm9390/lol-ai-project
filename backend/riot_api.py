import time
import requests
from urllib import parse
from cache_manager import CacheManager
import os # <-- os 모듈 임포트 추가

class RiotAPI:
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = "https://asia.api.riotgames.com"
        self.headers = {"X-Riot-Token": self.api_key}

        # Redis 연결 정보 환경 변수에서 가져오기
        redis_host = os.environ.get("REDIS_HOST", "localhost")
        redis_port = int(os.environ.get("REDIS_PORT", 6379))
        redis_db = int(os.environ.get("REDIS_DB", 0))
        redis_password = os.environ.get("REDIS_PASSWORD", None)

        self.cache = CacheManager(
            host=redis_host,
            port=redis_port,
            db=redis_db,
            password=redis_password
        )

    def get_puuid_by_riot_id(self, game_name, tag_line):
        """1단계: 계정명#태그로 PUUID(고유 식별자) 가져오기"""
        # 캐시 확인
        cached_puuid = self.cache.get_cached_puuid(game_name, tag_line)
        if cached_puuid:
            return cached_puuid
        
        url = f"{self.base_url}/riot/account/v1/accounts/by-riot-id/{game_name}/{tag_line}"
        response = requests.get(url, headers=self.headers)
        if response.status_code == 200:
            puuid = response.json()['puuid']
            # 캐시 저장
            self.cache.cache_puuid(game_name, tag_line, puuid)
            return puuid
        return None

    def get_league_info(self, puuid):
        """2단계: Summoner ID로 티어, 랭크, 승률 정보 가져오기 (요청하신 코드 반영)"""
        # 캐시 확인
        cached_league = self.cache.get_cached_league_info(puuid)
        if cached_league:
            return cached_league
        
        url = f"https://kr.api.riotgames.com/lol/league/v4/entries/by-puuid/{puuid}"
        response = requests.get(url, headers=self.headers)
        if response.status_code == 200:
            league_data = response.json()
            # 캐시 저장
            self.cache.cache_league_info(puuid, league_data)
            return league_data
        return []

    def get_recent_match_ids(self, puuid, count=1):
        """3단계: PUUID로 최근 Match ID 리스트 가져오기"""
        # 캐시 확인
        cached_ids = self.cache.get_cached_recent_match_ids(puuid, count)
        if cached_ids:
            print(f"캐시된 매치 ID 사용: {cached_ids}")
            return cached_ids
        
        url = f"{self.base_url}/lol/match/v5/matches/by-puuid/{puuid}/ids?start=0&count={count}"
        print(f"API 호출: {url}")
        
        try:
            response = requests.get(url, headers=self.headers, timeout=10)
            print(f"API 응답 상태: {response.status_code}")
            
            if response.status_code == 200:
                match_ids = response.json()
                print(f"받은 매치 ID: {match_ids}")
                # 캐시 저장
                self.cache.cache_recent_match_ids(puuid, count, match_ids)
                return match_ids
            elif response.status_code == 403:
                print("API 키 만료 또는 권한 없음")
                return []
            elif response.status_code == 429:
                print("Rate Limit 초과")
                return []
            else:
                print(f"API 오류: {response.status_code} - {response.text}")
                return []
        except requests.exceptions.RequestException as e:
            print(f"요청 예외: {e}")
            return []

    def get_match_timeline(self, match_id):
        """4단계: Match ID로 상세 타임라인 데이터 가져오기"""
        url = f"{self.base_url}/lol/match/v5/matches/{match_id}/timeline"
        print(f"Timeline API 호출: {url}")
        
        try:
            response = requests.get(url, headers=self.headers, timeout=10)
            print(f"Timeline 응답 상태: {response.status_code}")
            
            if response.status_code == 200:
                timeline_data = response.json()
                print(f"Timeline 데이터 수신 성공")
                return timeline_data
            elif response.status_code == 403:
                print("Timeline API 키 만료 또는 권한 없음")
                return None
            elif response.status_code == 429:
                print("Timeline Rate Limit 초과")
                return None
            else:
                print(f"Timeline API 오류: {response.status_code} - {response.text}")
                return None
        except requests.exceptions.RequestException as e:
            print(f"Timeline 요청 예외: {e}")
            return None

    def _get_summoner_id_by_puuid(self, puuid):
        """PUUID로 Summoner ID 가져오기"""
        url = f"https://kr.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/{puuid}"
        response = requests.get(url, headers=self.headers)
        if response.status_code == 200:
            return response.json()['id'] # encryptedSummonerId
        return None

    def get_active_game_by_summoner_id(self, encrypted_summoner_id):
        """Summoner ID로 현재 진행 중인 게임 정보 가져오기"""
        url = f"https://kr.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/{encrypted_summoner_id}"
        response = requests.get(url, headers=self.headers)
        if response.status_code == 200:
            return response.json()
        elif response.status_code == 404: # Not in game
            return None 
        return None

    def get_all_match_ids(self, puuid, n_wins, n_losses):
        """모든 랭크 게임의 Match ID를 수집합니다."""
        # 캐시 확인
        cached_ids = self.cache.get_cached_match_ids(puuid)
        if cached_ids:
            return cached_ids
        
        n_total = n_wins + n_losses
        r = n_total // 100
        other = n_total % 100
        
        all_games_id = []
        
        # 100개씩 끊어서 호출
        for i in range(r + 1):
            start = i * 100
            count = 100 if i != r else other
            
            if count == 0: continue
            
            url = f"{self.base_url}/lol/match/v5/matches/by-puuid/{puuid}/ids"
            params = {"type": "", "start": start, "count": count}
            
            response = requests.get(url, headers=self.headers, params=params)
            
            if response.status_code == 200:
                all_games_id.extend(response.json())
                time.sleep(0.05)
            else:
                print(f"Match ID 수집 중 에러: {response.status_code}")
                break
        
        # 캐시 저장
        self.cache.cache_match_ids(puuid, all_games_id)
        return all_games_id

    def get_match_detail(self, match_id):
        """개별 매치의 상세 정보(KDA, 아이템, 결과 등)를 가져옵니다."""
        # 캐시 확인
        cached_detail = self.cache.get_cached_match_detail(match_id)
        if cached_detail:
            return cached_detail
        
        url = f"{self.base_url}/lol/match/v5/matches/{match_id}"
        response = requests.get(url, headers=self.headers)
        if response.status_code == 200:
            detail = response.json()
            # 캐시 저장
            self.cache.cache_match_detail(match_id, detail)
            return detail
        return None

    def get_match_details_batch(self, match_ids):
        """매치 ID 리스트를 받아 상세 정보 리스트를 반환합니다."""
        details = []
        for match_id in match_ids:
            detail = self.get_match_detail(match_id)
            if detail:
                # 분석에 필요한 핵심 정보만 추출 (메모리 절약)
                info = detail.get('info', {})
                details.append({
                    "matchId": match_id,
                    "gameMode": info.get("gameMode"),
                    "gameDuration": info.get("gameDuration"),
                    "participants": info.get("participants", []) # KDA, 챔피언 정보 등 포함
                })
            
            # Riot API 호출 제한을 준수하기 위해 약간의 지연을 둡니다 (0.05초)
            time.sleep(0.05) 
            
            # 너무 많은 데이터를 한 번에 처리하면 서버가 느려지므로 
            # 일단 테스트용으로 최근 20개 정도만 처리하도록 제한하는 것을 추천합니다.
            if len(details) >= 20: break 
            
        return details