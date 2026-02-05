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
  private championData: { [key: string]: any } | null = null; // Add championData property

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = "https://asia.api.riotgames.com";
  }

  // New method to ensure champion data is loaded
  private async ensureChampionData() {
    if (!this.championData) {
      try {
        // Get latest DDragon version dynamically
        const versionsResponse = await fetch(`https://ddragon.leagueoflegends.com/api/versions.json`);
        const versions = await versionsResponse.json();
        const latestVersion = versions[0]; // Latest version is always the first one

        const url = `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/champion.json`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch champion data: ${response.statusText}`);
        }
        const data = await response.json();
        this.championData = data.data;
        console.log(`[DEBUG] Loaded champion data from DDragon version: ${latestVersion}`);
      } catch (error) {
        console.error("Error fetching champion data:", error);
        this.championData = {};
      }
    }
  }

  // New method to get champion name by ID
  public async getChampionNameById(championId: number): Promise<string> {
    await this.ensureChampionData(); // Ensure data is loaded
    if (this.championData) {
      for (const champName in this.championData) {
        if (this.championData[champName].key == championId) {
          console.log(`[DEBUG] Mapping Champion ID: ${championId} to Name: ${this.championData[champName].id}`); // Debug log
          return this.championData[champName].id; // 'id' is the champion name in DDragon data
        }
      }
    }
    console.log(`[DEBUG] Failed to map Champion ID: ${championId}. Returning "Unknown".`); // Debug log
    return "Unknown"; // Fallback for unknown champion IDs
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
        
        const info = data.info || {};
        details.push({
          "matchId": data.matchId,
          "gameMode": info.gameMode,
          "gameDuration": info.gameDuration,
          "participants": info.participants || [],
          "teams": info.teams || [] // Add teams data
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
      const p_frame = frame['participantFrames'][participant_id];
      if (p_frame) {
        positions.push(p_frame['position']);
      }
      
      // 데스 이벤트 수집
      for (const event of frame['events']) {
        if (event.type === 'CHAMPION_SPECIAL_KILL' || event.type === 'CHAMPION_KILL') {
          if (event.victimId === parseInt(participant_id)) {
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
  { params }: { params: Promise<{ riotId: string }> }
) {
  try {
    const { riotId } = await params;
    const decodedRiotId = decodeURIComponent(riotId);
    const apiKey = process.env.RIOT_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "Riot API key not configured" }, { status: 500 });
    }

    // ID 분리
    if (!decodedRiotId.includes("#")) {
      return NextResponse.json({ error: "Riot ID 형식은 Name#Tag 여야 합니다." }, { status: 400 });
    }

    const [game_name, tag_line] = decodedRiotId.split("#");
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

    // 랭크 데이터 찾기 (솔랭优先, 없으면 자유랭크)
    let ranked_data = league_data.find((item: any) => item['queueType'] === 'RANKED_SOLO_5x5');
    let queue_type = '솔로 랭크';
    
    if (!ranked_data) {
      ranked_data = league_data.find((item: any) => item['queueType'] === 'RANKED_FLEX_SR');
      queue_type = '자유 랭크';
    }
    
    if (ranked_data) {
      const n_total = ranked_data['wins'] + ranked_data['losses'];
      
      // 최소 10게임 이상인 경우에만 상세 분석
      const games_to_analyze = Math.max(10, Math.min(n_total, 20));
      const all_ids = await riot_client.get_all_match_ids(puuid, ranked_data['wins'], ranked_data['losses']);
      const match_details = await riot_client.get_match_details_batch(all_ids.slice(0, games_to_analyze));

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
            "participants": participants_list,
            "teams": await Promise.all(match['teams'].map(async (team: any) => {
              const processed_bans = await Promise.all(team['bans'].map(async (ban: any) => {
                return {
                  ...ban,
                  championName: ban.championId !== -1 ? await riot_client.getChampionNameById(ban.championId) : "Unknown"
                };
              }));
              return {
                ...team,
                bans: processed_bans
              };
            }))
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
        "queue_type": queue_type
      });
    }

    // 랭크 데이터가 없는 경우: 최근 일반 게임으로 기본 분석 제공
    const recent_matches = await riot_client.get_recent_match_ids(puuid, 10);
    if (recent_matches.length > 0) {
      const match_details = await riot_client.get_match_details_batch(recent_matches.slice(0, 5));
      
      const processed_matches = [];
      for (const match of match_details) {
        const my_stats = match['participants'].find((p: any) => p['puuid'] === puuid);
        
        if (my_stats) {
          const participants_list = [];
          for (const p of match['participants']) {
            participants_list.push({
              "puuid": p.puuid,
              "teamId": p.teamId,
              "win": p.win,
              "championName": p.championName,
              "teamPosition": p.teamPosition,
              "summonerName": `${p.riotIdGameName}#${p.riotIdTagline}`,
              "kda_str": `${p.kills}/${p.deaths}/${p.assists}`,
              "kda_score": p.challenges?.kda || 0,
              "visionScore": p.visionScore,
              "wards": `${p.wardsKilled}/${p.wardsPlaced}`,
              "cs": p.totalMinionsKilled + (p.neutralMinionsKilled || 0),
              "damage": p.totalDamageDealtToChampions,
              "gold": p.goldEarned,
              "kills": p.kills,
              "deaths": p.deaths,
              "assists": p.assists,
            });
          }

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
            "participants": participants_list,
            "teams": await Promise.all(match['teams'].map(async (team: any) => {
              const processed_bans = await Promise.all(team['bans'].map(async (ban: any) => {
                return {
                  ...ban,
                  championName: ban.championId !== -1 ? await riot_client.getChampionNameById(ban.championId) : "Unknown"
                };
              }));
              return {
                ...team,
                bans: processed_bans
              };
            }))
          });
        }
      }

      return NextResponse.json({
        "user_info": { "name": game_name, "tag": tag_line },
        "league": league_data,
        "total_matches": recent_matches.length,
        "match_ids": recent_matches,
        "analysis": analysis_result,
        "match_details": processed_matches,
        "queue_type": "일반 게임",
        "message": "랭크 기록이 없어 최근 일반 게임을 분석합니다."
      });
    }

    return NextResponse.json({ 
      error: "랭크 데이터를 찾을 수 없습니다.",
      message: "랭크 게임 기록이 없습니다. 랭크 게임을 플레이한 후 다시 시도해주세요.",
      user_info: { "name": game_name, "tag": tag_line },
      league: league_data,
      analysis: analysis_result
    }, { status: 200 });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
