import asyncio
import aiohttp
import numpy
import time
from typing import List, Dict, Optional
from cache_manager import CacheManager

class AsyncRiotAPI:
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = "https://asia.api.riotgames.com"
        self.headers = {"X-Riot-Token": self.api_key}
        self.cache = CacheManager()
        self.rate_limiter = asyncio.Semaphore(10)  # 동시 요청 제한
    
    async def get_all_match_ids_async(self, session: aiohttp.ClientSession, puuid: str, n_wins: int, n_losses: int):
        """비동기로 모든 랭크 게임 Match ID 수집"""
        # 캐시 확인
        cached_ids = self.cache.get_cached_match_ids(puuid)
        if cached_ids:
            return cached_ids
        
        n_total = n_wins + n_losses
        r = n_total // 100
        other = n_total % 100
        
        tasks = []
        
        # 비동기 작업 생성
        for i in range(r + 1):
            start = i * 100
            count = 100 if i != r else other
            
            if count == 0:
                continue
                
            task = self._fetch_match_ids_page(session, puuid, start, count)
            tasks.append(task)
        
        # 병렬 실행
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        all_games_id = []
        for result in results:
            if isinstance(result, list):
                all_games_id.extend(result)
            else:
                print(f"매치 ID 수집 오류: {result}")
        
        # 캐시 저장
        self.cache.cache_match_ids(puuid, all_games_id)
        return all_games_id
    
    async def _fetch_match_ids_page(self, session: aiohttp.ClientSession, puuid: str, start: int, count: int):
        """단일 페이지 매치 ID 비동기 조회"""
        async with self.rate_limiter:
            url = f"{self.base_url}/lol/match/v5/matches/by-puuid/{puuid}/ids"
            params = {"type": "", "start": start, "count": count}
            
            try:
                async with session.get(url, headers=self.headers, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        await asyncio.sleep(0.05)  # Rate Limit 준수
                        return data
                    else:
                        print(f"API 오류: {response.status}")
                        return []
            except Exception as e:
                print(f"요청 실패: {e}")
                return []
    
    async def get_match_details_batch_async(self, session: aiohttp.ClientSession, match_ids: List[str], limit: int = 20):
        """비동기로 매치 상세 정보 배치 처리"""
        tasks = []
        for i, match_id in enumerate(match_ids[:limit]):
            task = self._fetch_match_detail_async(session, match_id)
            tasks.append(task)
        
        # 병렬 실행
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        details = []
        for result in results:
            if isinstance(result, dict) and result:
                info = result.get('info', {})
                participants_data = []
                for participant in info.get("participants", []):
                    participants_data.append({
                        "puuid": participant.get("puuid"),
                        "teamId": participant.get("teamId"),
                        "win": participant.get("win"),
                        "championName": participant.get("championName"),
                        "teamPosition": participant.get("teamPosition"),
                        "summonerName": participant.get("summonerName"),
                        "riotIdGameName": participant.get("riotIdGameName"),
                        "riotIdTagline": participant.get("riotIdTagline"),
                        "kills": participant.get("kills"),
                        "deaths": participant.get("deaths"),
                        "assists": participant.get("assists"),
                        "challenges": participant.get("challenges", {}),
                        "visionScore": participant.get("visionScore"),
                        "wardsKilled": participant.get("wardsKilled"),
                        "wardsPlaced": participant.get("wardsPlaced"),
                        "totalMinionsKilled": participant.get("totalMinionsKilled"),
                        "neutralMinionsKilled": participant.get("neutralMinionsKilled", 0),
                        "totalDamageDealtToChampions": participant.get("totalDamageDealtToChampions"),
                        "goldEarned": participant.get("goldEarned"),
                        "summoner1Id": participant.get("summoner1Id"), # Add summoner spell 1 ID
                        "summoner2Id": participant.get("summoner2Id"), # Add summoner spell 2 ID
                        "item0": participant.get("item0"),
                        "item1": participant.get("item1"),
                        "item2": participant.get("item2"),
                        "item3": participant.get("item3"),
                        "item4": participant.get("item4"),
                        "item5": participant.get("item5"),
                        "item6": participant.get("item6"), # Trinket slot
                    })

                details.append({
                    "matchId": result.get("metadata", {}).get("matchId"),
                    "gameMode": info.get("gameMode"),
                    "queueId": info.get("queueId"),
                    "gameDuration": info.get("gameDuration"),
                    "participants": participants_data, # Use the processed participant data
                    "teams": info.get("teams", []) # Add teams data here
                })
        
        return details
    
    async def _fetch_match_detail_async(self, session: aiohttp.ClientSession, match_id: str):
        """개별 매치 상세 정보 비동기 조회"""
        # 캐시 확인
        cached_detail = self.cache.get_cached_match_detail(match_id)
        if cached_detail:
            return cached_detail
        
        async with self.rate_limiter:
            url = f"{self.base_url}/lol/match/v5/matches/{match_id}"
            
            try:
                async with session.get(url, headers=self.headers) as response:
                    if response.status == 200:
                        data = await response.json()
                        # 캐시 저장
                        self.cache.cache_match_detail(match_id, data)
                        await asyncio.sleep(0.05)  # Rate Limit 준수
                        return data
                    else:
                        print(f"매치 상세 정보 오류: {response.status}")
                        return None
            except Exception as e:
                print(f"매치 상세 정보 요청 실패: {e}")
                return None
