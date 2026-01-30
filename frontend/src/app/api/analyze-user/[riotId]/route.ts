import { NextRequest, NextResponse } from 'next/server';

// 백엔드 코드를 여기로 복사
interface AnalysisData {
  user_info: {
    name: string;
    tag: string;
    puuid?: string;
  };
  league: Array<{
    queueType: string;
    tier: string;
    rank: string;
    leaguePoints: number;
    wins: number;
    losses: number;
  }>;
  total_matches?: number;
  match_ids?: string[];
  analysis: {
    macro_score: number;
    tilt_index: number;
    positions: Array<{ x: number; y: number }>;
  };
  match_details: Array<{
    matchId: string;
    gameDuration: number;
    my_stats: {
      win: boolean;
      championName: string;
      kills: number;
      deaths: number;
      assists: number;
    };
    participants: Array<{
      puuid?: string;
      teamId?: number;
      win?: boolean;
      championName: string;
      teamPosition?: string;
      summonerName: string;
      kda_str: string;
      kda_score?: number;
      visionScore?: number;
      wards?: string;
      cs?: number;
      damage?: number;
      gold?: number;
      kills?: number;
      deaths?: number;
      assists?: number;
    }>;
  }>;
}

// Riot API 클라이언트 클래스
class RiotAPI {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = "https://asia.api.riotgames.com";
  }

  async get(url: string): Promise<any> {
    const response = await fetch(url, {
      headers: {
        "X-Riot-Token": this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

  async get_puuid_by_riot_id(gameName: string, tagLine: string): Promise<string | null> {
    try {
      const url = `${this.baseUrl}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
      const data = await this.get(url);
      return data.puuid;
    } catch (error) {
      console.error("Error getting PUUID:", error);
      return null;
    }
  }

  async get_league_info(puuid: string): Promise<any[]> {
    try {
      const url = `${this.baseUrl}/lol/league/v4/entries/by-puuid/${puuid}`;
      return await this.get(url);
    } catch (error) {
      console.error("Error getting league info:", error);
      return [];
    }
  }

  async get_recent_match_ids(puuid: string, count: number = 1): Promise<string[]> {
    try {
      const url = `${this.baseUrl}/lol/match/v5/matches/by-puuid/${puuid}/ids?count=${count}`;
      return await this.get(url);
    } catch (error) {
      console.error("Error getting recent match IDs:", error);
      return [];
    }
  }

  async get_match_timeline(matchId: string): Promise<any> {
    try {
      const url = `${this.baseUrl}/lol/match/v5/matches/${matchId}/timeline`;
      return await this.get(url);
    } catch (error) {
      console.error("Error getting match timeline:", error);
      return null;
    }
  }

  async get_all_match_ids(puuid: string, n_wins: number, n_losses: number): Promise<string[]> {
    try {
      const n_total = n_wins + n_losses;
      const url = `${this.baseUrl}/lol/match/v5/matches/by-puuid/${puuid}/ids?count=${n_total}`;
      return await this.get(url);
    } catch (error) {
      console.error("Error getting all match IDs:", error);
      return [];
    }
  }

  async get_match_details_batch(matchIds: string[]): Promise<any[]> {
    const details = [];
    
    for (const matchId of matchIds) {
      try {
        const url = `${this.baseUrl}/lol/match/v5/matches/${matchId}`;
        const data = await this.get(url);
        
        const info = data.get('info', {});
        details.push({
          "matchId": data.get("matchId"),
          "gameMode": info.get("gameMode"),
          "gameDuration": info.get("gameDuration"),
          "participants": info.get("participants", [])
        });
        
        // Rate limit
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.error(`Error getting match details for ${matchId}:`, error);
      }
    }
    
    return details;
  }
}

// 분석 함수
function analyze_game(timeline_data: any, participant_id: string = "1") {
  try {
    if (!timeline_data || !('info' in timeline_data)) {
      return {
        "macro_score": 0,
        "tilt_index": 0,
        "positions": [],
        "error": "타임라인 데이터 없음"
      };
    }
    
    const frames = timeline_data['info']['frames'];
    if (!frames) {
      return {
        "macro_score": 0,
        "tilt_index": 0,
        "positions": [],
        "error": "프레임 데이터 없음"
      };
    }
    
    const positions = [];
    const death_timestamps = [];

    // 데이터 파싱
    for (const frame of frames) {
      const p_frame = frame['participantFrames'].get(participant_id);
      if (p_frame) {
        positions.push(p_frame['position']);
      }
      
      // 데스 이벤트 수집
      for (const event of frame['events']) {
        if (event.get('type') === 'CHAMPION_SPECIAL_KILL' || event.get('type') === 'CHAMPION_KILL') {
          if (event.get('victimId') === parseInt(participant_id)) {
            death_timestamps.push(event['timestamp']);
          }
        }
      }
    }

    // 매크로 분석 (오브젝트 근처 체류 시간)
    const dragon_pos = [9800, 4400];
    let at_objective = 0;
    for (const pos of positions) {
      const distance = Math.sqrt(Math.pow(pos['x'] - dragon_pos[0], 2) + Math.pow(pos['y'] - dragon_pos[1], 2));
      if (distance < 2000) {
        at_objective += 1;
      }
    }

    // 멘탈 분석 (데스 간격 표준 편차)
    let tilt_score = 0;
    if (death_timestamps.length > 2) {
      const intervals = [];
      for (let i = 1; i < death_timestamps.length; i++) {
        intervals.push(death_timestamps[i] - death_timestamps[i-1]);
      }
      const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / intervals.length;
      tilt_score = Math.sqrt(variance) / 1000; // 초 단위 변환
    }

    return {
      "macro_score": frames.length > 0 ? (at_objective / frames.length) * 100 : 0,
      "tilt_index": tilt_score,
      "positions": positions.slice(0, 20) // 시각화용 샘플 데이터
    };
    
  } catch (error) {
    console.error("Analysis error:", error);
    return {
      "macro_score": 0,
      "tilt_index": 0,
      "positions": [],
      "error": String(error)
    };
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { riotId: string } }
) {
  try {
    const riotId = decodeURIComponent(params.riotId);
    const apiKey = process.env.RIOT_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "Riot API key not configured" }, { status: 500 });
    }

    // ID 분리
    if (!riotId.includes("#")) {
      return NextResponse.json({ error: "Riot ID 형식은 Name#Tag 여야 합니다." }, { status: 400 });
    }

    const [game_name, tag_line] = riotId.split("#");
    const riot_client = new RiotAPI(apiKey);

    // 계정 및 티어 정보 가져오기
    const puuid = await riot_client.get_puuid_by_riot_id(game_name, tag_line);
    if (!puuid) {
      return NextResponse.json({ error: "해당 Riot ID를 찾을 수 없습니다." }, { status: 404 });
    }

    const league_data = await riot_client.get_league_info(puuid);

    // 매치 분석 진행
    const match_ids = await riot_client.get_recent_match_ids(puuid, 1);
    if (!match_ids.length) {
      return NextResponse.json({ error: "최근 매치 기록이 없습니다." }, { status: 404 });
    }

    const timeline_data = await riot_client.get_match_timeline(match_ids[0]);
    if (!timeline_data) {
      return NextResponse.json({ error: "매치 타임라인 데이터를 가져올 수 없습니다." }, { status: 404 });
    }

    const analysis_result = analyze_game(timeline_data);

    // 솔랭 데이터 찾기
    const solo_rank = league_data.find((item: any) => item['queueType'] === 'RANKED_SOLO_5x5');
    if (solo_rank) {
      const n_total = solo_rank['wins'] + solo_rank['losses'];
      
      const all_ids = await riot_client.get_all_match_ids(puuid, solo_rank['wins'], solo_rank['losses']);
      const match_details = await riot_client.get_match_details_batch(all_ids.slice(0, 20));

      const processed_matches = [];
      for (const match of match_details) {
        // 내 정보 찾기
        const my_stats = match['participants'].find((p: any) => p['puuid'] === puuid);
        
        // 전체 참가자 10명 데이터 정제
        const participants_list = [];
        for (const p of match['participants']) {
          participants_list.push({
            "puuid": p.get("puuid"),
            "teamId": p.get("teamId"),
            "win": p.get("win"),
            "championName": p.get("championName"),
            "teamPosition": p.get("teamPosition"),
            "summonerName": `${p.get('riotIdGameName')}#${p.get('riotIdTagline')}`,
            "kda_str": `${p.get('kills')}/${p.get('deaths')}/${p.get('assists')}`,
            "kda_score": p.get("challenges", {}).get("kda", 0),
            "visionScore": p.get("visionScore"),
            "wards": `${p.get('wardsKilled')}/${p.get('wardsPlaced')}`,
            "cs": p.get("totalMinionsKilled") + (p.get("neutralMinionsKilled", 0)),
            "damage": p.get("totalDamageDealtToChampions"),
            "gold": p.get("goldEarned"),
            "kills": p.get('kills'),
            "deaths": p.get('deaths'),
            "assists": p.get('assists'),
          });
        }

        if (my_stats) {
          processed_matches.push({
            "matchId": match['matchId'],
            "gameDuration": match['gameDuration'],
            "my_stats": {
              "win": my_stats['win'],
              "championName": my_stats['championName'],
              "kills": my_stats['kills'],
              "deaths": my_stats['deaths'],
              "assists": my_stats['assists'],
            },
            "participants": participants_list
          });
        }
      }

      return NextResponse.json({
        "user_info": { "name": game_name, "tag": tag_line },
        "league": league_data,
        "total_matches": n_total,
        "match_ids": all_ids,
        "analysis": analysis_result,
        "match_details": processed_matches,
      });
    }

    return NextResponse.json({ error: "솔로 랭크 데이터를 찾을 수 없습니다." }, { status: 404 });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
