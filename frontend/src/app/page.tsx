"use client";

import { useState } from 'react';

// 타입 정의
interface Participant {
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
}

interface MyStats {
  win: boolean;
  championName: string;
  kills: number;
  deaths: number;
  assists: number;
}

interface MatchDetail {
  matchId: string;
  gameDuration: number;
  my_stats: MyStats;
  participants: Participant[];
}

interface LeagueInfo {
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
}

interface Analysis {
  macro_score: number;
  tilt_index: number;
  positions: Array<{ x: number; y: number }>;
}

interface AnalysisData {
  user_info: {
    name: string;
    tag: string;
    puuid?: string;
  };
  league: LeagueInfo[];
  total_matches?: number;
  match_ids?: string[];
  analysis: Analysis;
  match_details: MatchDetail[];
}

// [1. Helper 함수들 - 컴포넌트 외부 선언]
const formatNumber = (num: number | undefined): string => (num ? num.toLocaleString() : '0');

const calculateTeamKDA = (participants: Participant[] | undefined): string => {
  if (!participants) return "0 / 0 / 0";
  const k = participants.reduce((acc: number, p: Participant) => acc + (p.kills || 0), 0);
  const d = participants.reduce((acc: number, p: Participant) => acc + (p.deaths || 0), 0);
  const a = participants.reduce((acc: number, p: Participant) => acc + (p.assists || 0), 0);
  return `${k} / ${d} / ${a}`;
};

// [2. TeamTable 컴포넌트 - 컴포넌트 외부 선언]
const TeamTable = ({ teamName, isWin, players, myPuuid }: { teamName: string; isWin: boolean; players: Participant[] | undefined; myPuuid?: string }) => (
  <div className={`mb-4 rounded-xl border overflow-hidden ${isWin ? 'border-blue-200' : 'border-red-200'}`}>
    <div className={`px-4 py-2 flex justify-between items-center ${isWin ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
      <span className="font-black text-sm uppercase">{teamName} ({isWin ? 'Victory' : 'Defeat'})</span>
      <div className="text-xs font-bold">
        <span className="opacity-70 mr-2">Total KDA</span>
        <span className="text-base">{calculateTeamKDA(players)}</span>
      </div>
    </div>
    <div className={`overflow-x-auto ${isWin ? 'bg-blue-50/30' : 'bg-red-50/30'}`}>
      <table className="w-full text-sm table-fixed">
        <thead className={`text-[10px] uppercase font-bold ${isWin ? 'text-blue-400' : 'text-red-400'}`}>
          <tr className="border-b border-gray-100">
            <th className="p-2 w-[25%] pl-4 text-left">Champion / Player</th>
            <th className="p-2 w-[20%] text-center">KDA</th>
            <th className="p-2 w-[20%] text-center">Damage</th>
            <th className="p-2 w-[15%] text-center">Vision</th>
            <th className="p-2 w-[20%] text-right pr-4">Resources</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {players?.map((p, idx) => (
            <tr key={idx} className={`hover:bg-white/50 ${p.puuid === myPuuid ? 'bg-yellow-100/50' : ''}`}>
              <td className="p-2 pl-4">
                <div className="flex items-center gap-2">
                  <img src={`https://ddragon.leagueoflegends.com/cdn/16.2.1/img/champion/${p.championName}.png`} className="w-7 h-7 rounded-full" alt="" />
                  <div className="flex flex-col truncate">
                    <span className="font-bold text-gray-700 text-[11px] truncate">{p.summonerName.split('#')[0]}</span>
                    <span className="text-[9px] text-gray-400 uppercase">{p.teamPosition}</span>
                  </div>
                </div>
              </td>
              <td className="p-2 text-center text-[11px]">
                <div className="font-bold">{p.kda_str}</div>
                <div className="text-[9px] text-gray-400">{p.kda_score?.toFixed(2)}</div>
              </td>
              <td className="p-2">
                <div className="w-full max-w-[60px] mx-auto text-center">
                  <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-red-400" style={{ width: `${Math.min((p.damage || 0) / 500, 100)}%` }}></div>
                  </div>
                  <span className="text-[9px] text-gray-500">{formatNumber(p.damage)}</span>
                </div>
              </td>
              <td className="p-2 text-center text-[11px] text-gray-500">{p.visionScore}</td>
              <td className="p-2 pr-4 text-right">
                <div className="text-[11px] font-bold text-yellow-600">{formatNumber(p.gold)}</div>
                <div className="text-[9px] text-gray-400">{p.cs} CS | {p.wards} W</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default function Home() {
  const [riotId, setRiotId] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState('');
  const [visibleMatches, setVisibleMatches] = useState(10);

  // 매치 클릭 시 토글 함수
  const toggleMatch = (id: string) => {
    setExpandedMatchId(prev => prev === id ? null : id);
  };

  const fetchAnalysis = async () => {
    if (!riotId.includes('#')) {
      alert("Riot ID 형식(이름#태그)을 확인해주세요.");
      return;
    }

    setLoading(true);
    setError("");
    setAnalysis(null);
    setLoadingProgress(0);
    setLoadingStage('사용자 정보 조회 중...');

    try {
      const encodedId = encodeURIComponent(riotId);

      // 진행 상황 시뮬레이션
      const progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev < 30) return prev + 5;
          if (prev < 60) return prev + 3;
          if (prev < 90) return prev + 2;
          return prev;
        });
      }, 200);

      const res = await fetch(`https://lol-ai-project.onrender.com/analyze-user/${encodedId}`);
      clearInterval(progressInterval);
      setLoadingProgress(90);
      setLoadingStage('데이터 분석 완료...');

      const data = await res.json();
      setLoadingProgress(100);

      if (data.error) {
        setError(data.error);
      } else {
        setAnalysis(data);
        setExpandedMatchId(null);
        setVisibleMatches(10); // 새 분석 시 보이는 매치 수 초기화
      }
    } catch (err) {
      setError("서버와 통신 중 오류가 발생했습니다.");
    } finally {
      setTimeout(() => {
        setLoading(false);
        setLoadingProgress(0);
        setLoadingStage('');
      }, 500);
    }
  };

  return (
    <div className="p-10 font-sans max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">LoL AI 매크로 코치</h1>
      <p className="text-gray-600 mb-6">최근 게임 데이터를 분석하여 당신의 운영과 멘탈을 진단합니다.</p>

      <div className="flex mb-8">
        <input
          className="border p-3 flex-1 mr-2 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="예: 닉네임#KR1"
          value={riotId}
          onChange={(e) => setRiotId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchAnalysis()}
        />
        <button
          className={`px-6 py-3 rounded-lg font-bold text-white transition ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
          onClick={fetchAnalysis}
          disabled={loading}
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              {loadingStage || '분석 중...'}
            </div>
          ) : (
            '분석하기'
          )}
        </button>
      </div>

      {error && <div className="p-4 mb-5 bg-red-100 text-red-700 rounded-lg">{error}</div>}

      {loading && (
        <div className="p-6 mb-5 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-700 font-medium">{loadingStage || '분석 중...'}</span>
            <span className="text-blue-600 text-sm">{loadingProgress}%</span>
          </div>
          <div className="w-full bg-blue-100 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${loadingProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {analysis && (
        <div className="space-y-6 animate-in fade-in duration-500">

          {/* 1. 유저 기본 정보 및 티어 카드 */}
          <div className="p-6 bg-white border rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-gray-800">
                {analysis.user_info.name} <span className="text-gray-400">#{analysis.user_info.tag}</span>
              </h2>
              {analysis.league && analysis.league[0] ? (
                <p className="text-blue-600 font-bold uppercase tracking-wider">
                  {analysis.league[0].tier} {analysis.league[0].rank} — {analysis.league[0].leaguePoints} LP
                </p>
              ) : (
                <p className="text-gray-400">Unranked</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-black font-medium">최근 승률</p>
              <p className="text-lg font-bold text-black">
                {analysis.league[0] ?
                  ((analysis.league[0].wins / (analysis.league[0].wins + analysis.league[0].losses)) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>

          {analysis && (
            <section className="mt-12 space-y-4">
              <h3 className="text-2xl font-bold mb-6">최근 20게임 상세 분석</h3>

              {analysis.match_details.slice(0, visibleMatches).map((match, matchIndex) => {
                const myStats = match.my_stats;
                const matchKey = String(match.matchId ?? `match-${matchIndex}`);

                // 팀별 데이터 분리 (순서 유지를 위해 filter 사용)
                const blueTeam = match.participants.slice(0, 5);
                const redTeam = match.participants.slice(5, 10);

                // 팀별 총 KDA 계산 함수
                const getTeamKDA = (players: Participant[]) => {
                  const k = players.reduce((acc: number, p: Participant) => acc + (p.kills || 0), 0);
                  const d = players.reduce((acc: number, p: Participant) => acc + (p.deaths || 0), 0);
                  const a = players.reduce((acc: number, p: Participant) => acc + (p.assists || 0), 0);
                  return `${k} / ${d} / ${a}`;
                };

                return (
                  <div key={matchKey} className="transition-all duration-300">

                    {/* [1. 매치 요약 카드 (클릭 가능)] */}
                    <div
                      onClick={() => toggleMatch(matchKey)}
                      className={`cursor-pointer z-10 bg-white p-5 rounded-2xl border-2 shadow-sm flex justify-between items-center transition-all
                    ${myStats?.win ? 'border-l-8 border-l-blue-500 hover:border-blue-300' : 'border-l-8 border-l-red-500 hover:border-red-300'}`}
                    >
                      <div className="flex items-center gap-4">
                        <img src={`https://ddragon.leagueoflegends.com/cdn/16.2.1/img/champion/${myStats?.championName}.png`} className="w-10 h-10" alt="" />
                        <span className="text-xl text-black font-bold">{myStats?.championName}</span>
                        {/* <span className="px-2 py-1 bg-gray-100 rounded text-[10px] font-bold text-gray-500">{match.matchId}</span> */}
                      </div>
                      <div className="font-bold text-lg">
                        {myStats?.kills} / <span className="text-red-500">{myStats?.deaths}</span> / {myStats?.assists}
                      </div>
                      <div className={`font-black ${myStats?.win ? 'text-blue-600' : 'text-red-600'}`}>
                        {myStats?.win ? 'VICTORY' : 'DEFEAT'}
                        <p className="text-[10px] text-gray-400 font-normal">{(match.gameDuration / 60).toFixed(0)}분 상세정보 {expandedMatchId === matchKey ? '▲' : '▼'}</p>
                      </div>
                    </div>

                    {/* [상세 드롭다운] */}
                    {/* {expandedMatchId === match.matchId && (
                      <div className="bg-white border-x border-b rounded-b-2xl p-4 shadow-inner animate-in slide-in-from-top duration-300">
                        <TeamTable teamName="Winner" isWin={true} players={winningTeam} myPuuid={analysis.user_info.puuid} />
                        <div className="flex items-center py-2 opacity-30">
                          <div className="flex-grow border-t border-gray-400"></div>
                          <span className="mx-4 text-[10px] font-black italic text-gray-400">VS</span>
                          <div className="flex-grow border-t border-gray-400"></div>
                        </div>
                        <TeamTable teamName="Loser" isWin={false} players={losingTeam} myPuuid={analysis.user_info.puuid} />
                      </div>
                    )} */}
                    {/* [상세 드롭다운 테이블] */}
                    {expandedMatchId === matchKey && (
                      <div className="bg-white border-x border-b rounded-b-2xl overflow-hidden shadow-inner animate-in fade-in slide-in-from-top-2 duration-300">
                        <table className="w-full text-sm table-fixed border-collapse">
                          <thead className="bg-gray-50 text-[11px] text-gray-400 uppercase font-bold border-b">
                            <tr>
                              <th className="p-3 w-[25%] text-left pl-6">Champion / Player</th>
                              <th className="p-3 w-[15%] text-center">KDA</th>
                              <th className="p-3 w-[20%] text-center">Damage</th>
                              <th className="p-3 w-[10%] text-center">Vision</th>
                              <th className="p-3 w-[30%] text-right pr-6">Resources (Gold/CS/Ward)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* 전체 참가자 10명을 순서대로 렌더링 */}
                            {match.participants.map((p, idx) => {
                              const isBlueTeam = idx < 5;
                              const isTeamFirstRow = idx === 0 || idx === 5;
                              const currentTeamPlayers = isBlueTeam ? blueTeam : redTeam;

                              return (
                                <>
                                  {/* 팀 구분 헤더 (1번째, 6번째 행 직전에 표시) */}
                                  {isTeamFirstRow && (
                                    <tr key={`header-${idx}`} className={`${p.win ? 'bg-blue-50/50' : 'bg-red-50/50'} border-y border-gray-100`}>
                                      <td colSpan={5} className="px-6 py-2">
                                        <div className="flex justify-between items-center">
                                          <span className={`font-black text-[11px] uppercase ${p.win ? 'text-blue-600' : 'text-red-600'}`}>
                                            {isBlueTeam ? 'Blue Team' : 'Red Team'} — {p.win ? 'Victory' : 'Defeat'}
                                          </span>
                                          <span className="text-[11px] font-bold text-gray-500">Team Total KDA: {getTeamKDA(currentTeamPlayers)}</span>
                                        </div>
                                      </td>
                                    </tr>
                                  )}

                                  {/* 플레이어 행 */}
                                  <tr
                                    key={p.puuid || idx}
                                    className={`transition-colors border-b border-gray-50 last:border-0
                                  ${p.win ? 'hover:bg-blue-50/30' : 'hover:bg-red-50/30'}
                                  ${p.puuid === analysis.user_info.puuid ? 'bg-yellow-50 font-semibold ring-inset ring-1 ring-yellow-200' : ''}`}
                                  >
                                    <td className="p-3 pl-6">
                                      <div className="flex items-center gap-3">
                                        <img
                                          src={`https://ddragon.leagueoflegends.com/cdn/16.2.1/img/champion/${p.championName}.png`}
                                          className="w-8 h-8 rounded-full shadow-sm border border-white"
                                          alt=""
                                        />
                                        <div className="flex flex-col truncate">
                                          <span className="text-gray-800 text-[12px] truncate">{p.summonerName.split('#')[0]}</span>
                                          <span className="text-[9px] text-gray-400 uppercase font-mono">{p.teamPosition || 'Unknown'}</span>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="p-3 text-center">
                                      <div className="text-[12px] font-bold text-gray-700">{p.kda_str}</div>
                                      <div className="text-[10px] text-gray-400">{p.kda_score?.toFixed(2)}</div>
                                    </td>
                                    <td className="p-3">
                                      <div className="w-full max-w-[80px] mx-auto text-center">
                                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-1">
                                          <div className="h-full bg-red-400" style={{ width: `${Math.min((p.damage || 0) / 500, 100)}%` }}></div>
                                        </div>
                                        <span className="text-[10px] text-gray-500 font-mono">{formatNumber(p.damage)}</span>
                                      </div>
                                    </td>
                                    <td className="p-3 text-center text-gray-600 font-medium text-[12px]">
                                      {p.visionScore}
                                    </td>
                                    <td className="p-3 pr-6 text-right">
                                      <div className="text-[12px] font-bold text-yellow-600">{formatNumber(p.gold)} G</div>
                                      <div className="text-[10px] text-gray-400">{p.cs} CS | Ward {p.wards}</div>
                                    </td>
                                  </tr>
                                </>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )
              })}
            </section>
          )}

          {analysis && analysis.match_details && analysis.match_details.length > visibleMatches && (
            <div className="mt-8 text-center">
              <button
                onClick={() => setVisibleMatches(prev => prev + 10)}
                className="px-8 py-3 rounded-lg font-bold text-white bg-gray-700 hover:bg-gray-800 transition-colors shadow-md"
              >
                더보기
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 2. 매크로 분석 카드 */}
            <div className="p-6 bg-white border rounded-2xl shadow-lg border-t-4 border-t-blue-500">
              <h3 className="text-lg font-bold mb-4 flex items-center">📍 AI 매크로 진단</h3>
              <div className="text-4xl font-black text-blue-600 mb-2">
                {analysis.analysis.macro_score.toFixed(1)}점
              </div>

              {/* 미니맵 동선 시각화 (간이 버전) */}
              <div className="relative w-full aspect-square bg-gray-100 rounded-lg overflow-hidden border">
                {/* 실제 미니맵 이미지를 배경으로 넣으면 좋습니다 */}
                <div className="absolute inset-0 opacity-20 bg-[url('https://raw.communitydragon.org/latest/game/data/menu/textures/experience_sequences/map_loop_summoners_rift.png')] bg-cover"></div>

                <svg viewBox="0 0 15000 15000" className="absolute inset-0 w-full h-full transform scale-y-[-1]">
                  <polyline
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="200"
                    strokeLinejoin="round"
                    points={analysis?.analysis?.positions.map(p => `${p.x},${p.y}`).join(' ')}
                  />
                  {/* 현재 위치 점 */}
                  {analysis.analysis.positions.length > 0 && (
                    <circle
                      cx={analysis.analysis.positions[analysis.analysis.positions.length - 1].x}
                      cy={analysis.analysis.positions[analysis.analysis.positions.length - 1].y}
                      r="400" fill="#2563eb"
                    />
                  )}
                </svg>
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">게임 초반 20분간의 동선 흐름</p>
            </div>

            {/* 3. 멘탈 분석 카드 */}
            <div className="p-6 bg-white border rounded-2xl shadow-lg border-t-4 border-t-red-500">
              <h3 className="text-lg font-bold mb-4">🧠 AI 멘탈 진단</h3>
              <div className="text-4xl font-black text-red-500 mb-2">
                {analysis.analysis.tilt_index > 100 ? "위험" : "안정"}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
                <div
                  className="bg-red-500 h-4 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(analysis.analysis.tilt_index, 100)}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                데스 간격 데이터 분석 결과, 현재 <strong>틸트(Tilt)</strong> 위험도가 높습니다.
                연속적인 교전 실패가 판단력에 영향을 주고 있을 가능성이 큽니다.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}