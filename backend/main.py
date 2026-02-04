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
import requests # Added for Data Dragon
import json # Added for Data Dragon

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

# Data Dragon global variables
DDRAGON_VERSION: str = ""
SUMMONER_SPELLS: Dict[str, Any] = {}
ITEMS: Dict[str, Any] = {}

def get_latest_ddragon_version():
    try:
        response = requests.get("https://ddragon.leagueoflegends.com/api/versions.json")
        response.raise_for_status()
        return response.json()[0] # Get the latest version
    except requests.exceptions.RequestException as e:
        print(f"Error fetching Data Dragon version: {e}")
        return "13.24.1" # Fallback to a known version

def load_ddragon_data(version: str):
    global SUMMONER_SPELLS, ITEMS, DDRAGON_VERSION
    DDRAGON_VERSION = version
    base_url = f"https://ddragon.leagueoflegends.com/cdn/{version}/data/ko_KR" # Using Korean locale

    # Load Summoner Spells
    try:
        response = requests.get(f"{base_url}/summoner.json")
        response.raise_for_status()
        summoner_data = response.json().get("data", {})
        # Reformat for easier lookup by ID (integer)
        SUMMONER_SPELLS = {str(spell_info['id']): spell_info for spell_id, spell_info in summoner_data.items()}
        print(f"Loaded {len(SUMMONER_SPELLS)} summoner spells.")
    except requests.exceptions.RequestException as e:
        print(f"Error loading summoner spells: {e}")
        SUMMONER_SPELLS = {}

    # Load Items
    try:
        response = requests.get(f"{base_url}/item.json")
        response.raise_for_status()
        item_data = response.json().get("data", {})
        ITEMS = item_data
        print(f"Loaded {len(ITEMS)} items.")
    except requests.exceptions.RequestException as e:
        print(f"Error loading items: {e}")
        ITEMS = {}

# Load Data Dragon data on startup
latest_version = get_latest_ddragon_version()
load_ddragon_data(latest_version)


# Queue ID Mapping
QUEUE_MAPPING = {
    400: "일반 게임",
    420: "솔로 랭크",
    430: "일반 게임",
    440: "자유 랭크",
    450: "칼바람 나락",
    700: "격전",
    800: "AI 대전",
    810: "AI 대전",
    820: "AI 대전",
    830: "AI 대전",
    840: "AI 대전",
    850: "AI 대전",
    900: "URF",
    920: "포로 왕",
    1020: "단일 챔피언",
    1030: "오디세이",
    1040: "폭풍",
    1050: "최고의 팀",
    1060: "돌격! 넥서스",
    1070: "단일 챔피언",
    1090: "전략적 팀 전투",
    1100: "전략적 팀 전투 랭크",
    1110: "전략적 팀 전투 Hyper Roll",
    1111: "전략적 팀 전투 Double Up",
    1200: "넥서스 블리츠",
    1300: "돌격! 넥서스",
    1400: "궁극기 주문서",
    1900: "URF",
    2000: "튜토리얼",
    2010: "튜토리얼",
    2020: "튜토리얼",
}

@app.get("/")
async def root():
            return {"message": "LoL AI Backend API", "docs": "/docs"}
    
    @app.get("/current-game/{full_id}")
    async def get_current_game(full_id: str):
        if not riot_client:
            return {"error": "RIOT_API_KEY가 설정되지 않았습니다."}
        
        if "#" not in full_id:
                return {"error": "Riot ID 형식은 Name#Tag 여야 합니다."}
            
        game_name, tag_line = full_id.split("#")
        
        puuid = riot_client.get_puuid_by_riot_id(game_name, tag_line)
        if not puuid:
            return {"error": "해당 Riot ID를 찾을 수 없습니다."}
        
        encrypted_summoner_id = riot_client._get_summoner_id_by_puuid(puuid)
        if not encrypted_summoner_id:
            return {"error": "소환사 ID를 찾을 수 없습니다."}
        
        active_game_data = riot_client.get_active_game_by_summoner_id(encrypted_summoner_id)
        
        if active_game_data is None:
            return {"status": "not_in_game", "message": f"{game_name}#{tag_line}님은 현재 게임 중이 아닙니다."}
        
        # Process active game data for frontend display
        processed_participants = []
        for p in active_game_data.get("participants", []):
            # Summoner Spells
            summoner_spell_1_id = str(p.get("spell1Id"))
            summoner_spell_2_id = str(p.get("spell2Id"))
            
            spell1_info = SUMMONER_SPELLS.get(summoner_spell_1_id)
            spell2_info = SUMMONER_SPELLS.get(summoner_spell_2_id)
    
            processed_spell1 = {
                "id": summoner_spell_1_id,
                "name": spell1_info['name'] if spell1_info else "Unknown",
                "icon": f"https://ddragon.leagueoflegends.com/cdn/{DDRAGON_VERSION}/img/spell/{spell1_info['image']['full']}" if spell1_info else ""
            }
            processed_spell2 = {
                "id": summoner_spell_2_id,
                "name": spell2_info['name'] if spell2_info else "Unknown",
                "icon": f"https://ddragon.leagueoflegends.com/cdn/{DDRAGON_VERSION}/img/spell/{spell2_info['image']['full']}" if spell2_info else ""
            }
    
            processed_participants.append({
                "summonerName": p.get("summonerName"),
                "championName": p.get("championName"),
                "teamId": p.get("teamId"),
                "summonerSpell1": processed_spell1,
                "summonerSpell2": processed_spell2,
                # Add other relevant active game participant data
            })
    
        return {
            "status": "in_game",
            "gameId": active_game_data.get("gameId"),
            "gameMode": active_game_data.get("gameMode"),
            "gameType": active_game_data.get("gameType"),
            "gameStartTime": active_game_data.get("gameStartTime"),
            "mapId": active_game_data.get("mapId"),
            "queueType": QUEUE_MAPPING.get(active_game_data.get("gameQueueConfigId"), "알 수 없는 모드"),
            "participants": processed_participants,
        }
    
    @app.get("/analyze-user/{full_id}")
    async def analyze_user(full_id: str):
        if not riot_client:
            return {"error": "RIOT_API_KEY가 설정되지 않았습니다."}    try:
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
            
            processed_matches = []
            for match in match_details:
                # 1. 내 정보 찾기 (요약 카드용)
                my_stats = next((p for p in match['participants'] if p['puuid'] == puuid), None)
                
                # 2. 전체 참가자 10명 데이터 정제 (상세 드롭다운용)
                participants_list = []
                for p in match['participants']:
                    # Summoner Spells
                    summoner_spell_1_id = str(p.get("summoner1Id"))
                    summoner_spell_2_id = str(p.get("summoner2Id"))
                    
                    spell1_info = SUMMONER_SPELLS.get(summoner_spell_1_id)
                    spell2_info = SUMMONER_SPELLS.get(summoner_spell_2_id)

                    processed_spell1 = {
                        "id": summoner_spell_1_id,
                        "name": spell1_info['name'] if spell1_info else "Unknown",
                        "icon": f"https://ddragon.leagueoflegends.com/cdn/{DDRAGON_VERSION}/img/spell/{spell1_info['image']['full']}" if spell1_info else ""
                    }
                    processed_spell2 = {
                        "id": summoner_spell_2_id,
                        "name": spell2_info['name'] if spell2_info else "Unknown",
                        "icon": f"https://ddragon.leagueoflegends.com/cdn/{DDRAGON_VERSION}/img/spell/{spell2_info['image']['full']}" if spell2_info else ""
                    }

                    # Items
                    item_ids = [p.get(f"item{i}") for i in range(7)]
                    processed_items = []
                    for item_id in item_ids:
                        if item_id and item_id != 0: # 0 is often for empty item slots
                            item_info = ITEMS.get(str(item_id))
                            if item_info:
                                processed_items.append({
                                    "id": item_id,
                                    "name": item_info.get('name'),
                                    "icon": f"https://ddragon.leagueoflegends.com/cdn/{DDRAGON_VERSION}/img/item/{item_id}.png"
                                })
                            else:
                                processed_items.append({"id": item_id, "name": "Unknown Item", "icon": ""})
                        else:
                            processed_items.append(None) # Represent empty slot

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
                        "summonerSpell1": processed_spell1, # Add processed spell 1
                        "summonerSpell2": processed_spell2, # Add processed spell 2
                        "items": processed_items, # Add processed items
                    })

                if my_stats:
                    processed_matches.append({
                        "matchId": match['matchId'],
                        "gameMode": match['gameMode'],
                        "queueId": match['queueId'], # Add queueId here
                        "queueType": QUEUE_MAPPING.get(match['queueId'], "알 수 없는 모드"), # Map queueId to human-readable
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