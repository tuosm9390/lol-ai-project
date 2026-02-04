import os
from pathlib import Path
# 로컬 .env 로드 (있으면 사용, 없어도 동작)
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent / ".env")
except Exception:
    pass
from fastapi import FastAPI
from riot_api import RiotAPI
try:
    from async_riot_api import AsyncRiotAPI
    import aiohttp
    ASYNC_AVAILABLE = True
except ImportError:
    ASYNC_AVAILABLE = False
    AsyncRiotAPI = None  # type: ignore[misc, assignment]
    aiohttp = None  # type: ignore[assignment]
    print("비동기 기능을 사용할 수 없습니다. 동기 모드로 실행합니다.")
from analyzer import analyze_game
from fastapi.middleware.cors import CORSMiddleware
import asyncio
from typing import Any

app = FastAPI()
# 프론트엔드(Next.js)와 통신 허용
app.add_middleware(
    CORSMiddleware, 
    allow_origins=[
        "https://lol-ai-project.vercel.app",
        "https://lol-ai-project-git-master-tuosm9390s-projects.vercel.app",
        "https://lol-ai-project-1hcl3k9ym-tuosm9390s-projects.vercel.app",
        "http://localhost:3000"  # 로컬 개발용
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"]
)

API_KEY = os.environ.get("RIOT_API_KEY", "")
riot_client = RiotAPI(API_KEY) if API_KEY else None
async_riot_client: Any = None
if API_KEY and ASYNC_AVAILABLE and AsyncRiotAPI is not None:
    async_riot_client = AsyncRiotAPI(API_KEY)

@app.get("/")
async def root():
    return {"message": "LoL AI Backend API", "docs": "/docs"}

@app.get("/analyze-user/{full_id}")
async def analyze_user(full_id: str):
    if not riot_client:
        return {"error": "RIOT_API_KEY가 설정되지 않았습니다."}
    try:
        # 1. ID 분리 (예: "가나다#KR1")
        if "#" not in full_id:
            return {"error": "Riot ID 형식은 Name#Tag 여야 합니다."}
        
        game_name, tag_line = full_id.split("#")
        
        # 1. 계정 및 티어 정보 가져오기
        puuid = riot_client.get_puuid_by_riot_id(game_name, tag_line)
        if not puuid:
            return {"error": "해당 Riot ID를 찾을 수 없습니다."}
        league_data = riot_client.get_league_info(puuid)

        # 3. 매치 분석 진행 (기존 로직)
        print(f"PUUUID: {puuid}")
        match_ids = riot_client.get_recent_match_ids(puuid, count=1)
        print(f"Match IDs: {match_ids}")
        if not match_ids: 
            return {"error": "최근 매치 기록이 없습니다."}
        
        print(f"Getting timeline for match: {match_ids[0]}")
        timeline_data = riot_client.get_match_timeline(match_ids[0])
        print(f"Timeline data received: {timeline_data is not None}")
        if not timeline_data:
            return {"error": "매치 타임라인 데이터를 가져올 수 없습니다."}
            
        analysis_result = analyze_game(timeline_data)
        print(f"Analysis completed: {analysis_result}")

        # 솔랭(RANKED_SOLO_5x5) 데이터 찾기
        solo_rank = next((item for item in league_data if item['queueType'] == 'RANKED_SOLO_5x5'), None)
        if solo_rank:
            n_total = solo_rank['wins'] + solo_rank['losses']
            
            if ASYNC_AVAILABLE and aiohttp is not None:
                # 비동기로 모든 매치 ID 가져오기 (성능 개선)
                async with aiohttp.ClientSession() as session:
                    all_ids = await async_riot_client.get_all_match_ids_async(session, puuid, solo_rank['wins'], solo_rank['losses'])
                    
                    # 비동기로 매치 상세 정보 가져오기 (최근 20개)
                    match_details = await async_riot_client.get_match_details_batch_async(session, all_ids[:20])
            else:
                # 동기 방식으로 fallback
                all_ids = riot_client.get_all_match_ids(puuid, solo_rank['wins'], solo_rank['losses'])
                match_details = riot_client.get_match_details_batch(all_ids[:20])
            #     if my_stats:
            #         processed_matches.append({
            #             "matchId": match['matchId'],
            #             "win": my_stats['win'],
            #             "championName": my_stats['championName'],
            #             "kills": my_stats['kills'],
            #             "deaths": my_stats['deaths'],
            #             "assists": my_stats['assists'],
            #             "gameDuration": match['gameDuration'],
            #             "participants": match['participants'],
            #         })

            processed_matches = []
            for match in match_details:
                # 1. 내 정보 찾기 (요약 카드용)
                my_stats = next((p for p in match['participants'] if p['puuid'] == puuid), None)
                
                # 2. 전체 참가자 10명 데이터 정제 (상세 드롭다운용)
                participants_list = []
                for p in match['participants']:
                    participants_list.append({
                        "puuid": p.get("puuid"), # 내 정보 하이라이트용
                        "teamId": p.get("teamId"),
                        "win": p.get("win"),
                        "championName": p.get("championName"),
                        "teamPosition": p.get("teamPosition"), # TOP, JUNGLE ...
                        "summonerName": f"{p.get('riotIdGameName')} #{p.get('riotIdTagline')}",
                        "kda_str": f"{p.get('kills')}/{p.get('deaths')}/{p.get('assists')}",
                        "kda_score": p.get("challenges", {}).get("kda", 0), # kda 점수
                        "visionScore": p.get("visionScore"),
                        "wards": f"{p.get('wardsKilled')}/{p.get('wardsPlaced')}",
                        "cs": p.get("totalMinionsKilled") + p.get("neutralMinionsKilled", 0), # 전체 CS
                        "damage": p.get("totalDamageDealtToChampions"),
                        "gold": p.get("goldEarned"),
                        "kills": p.get('kills'),
                        "deaths": p.get('deaths'),
                        "assists": p.get('assists'),
                    })

                if my_stats:
                    processed_matches.append({
                        "matchId": match['matchId'],
                        "gameMode": match['gameMode'], # Add gameMode here
                        "gameDuration": match['gameDuration'],
                        "my_stats": { # 기존 요약 카드에 쓸 데이터
                            "win": my_stats['win'],
                            "championName": my_stats['championName'],
                            "kills": my_stats['kills'],
                            "deaths": my_stats['deaths'],
                            "assists": my_stats['assists'],
                        },
                        "participants": participants_list # 10명 전체 데이터
                    })

            analysis_result = analyze_game(timeline_data)

            return {
                "user_info": {"name": game_name, "tag": tag_line},
                "league": league_data,
                "total_matches": n_total,
                "match_ids": all_ids, # 전체 매치 ID 리스트
                "analysis": analysis_result,
                "match_details": processed_matches,
                # "processed_matches": processed_matches,
            }
    except Exception as e:
        return {"error": str(e)}