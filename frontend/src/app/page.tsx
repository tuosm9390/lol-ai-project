"use client";

import { useState } from 'react';
import ThemeToggleButton from './components/ThemeToggleButton';
import Link from 'next/link'; // Import Link

// 타입 정의

interface Spell {
  id: string;
  name: string;
  icon: string;
}

interface Item {
  id: number;
  name: string;
  icon: string;
}

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
  summonerSpell1: Spell; // Add summoner spell 1
  summonerSpell2: Spell; // Add summoner spell 2
  items: (Item | null)[]; // Add items
}

interface MyStats {
  win: boolean;
  championName: string;
  kills: number;
  deaths: number;
  assists: number;
}

interface Ban {
  championId: number;
  pickTurn: number;
  championName?: string; // Add championName
}

interface Objective {
  first: boolean;
  kills: number;
}

interface Objectives {
  baron: Objective;
  dragon: Objective;
  tower: Objective;
  // Add other objectives if needed
}

interface TeamDetail {
  teamId: number;
  win: boolean;
  bans: Ban[];
  objectives: Objectives;
}

interface MatchDetail {
  matchId: string;
  gameMode: string;
  queueId: number; // Add queueId
  queueType: string; // Add queueType
  gameDuration: number;
  my_stats: MyStats;
  participants: Participant[];
  teams: TeamDetail[]; // Add teams data
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

const formatGameMode = (gameMode: string, queueType: string): string => {
  if (gameMode === 'CLASSIC') {
    return queueType; // Use the human-readable queueType provided by the backend
  }
  switch (gameMode) {
    case 'ARAM':
      return '무작위 총력전';
    case 'TFT':
      return '전략적 팀 전투';
    case 'URF':
      return 'U.R.F. 모드';
    // Add more cases as needed
    default:
      return gameMode;
  }
};

// [2. TeamTable 컴포넌트 - 컴포넌트 외부 선언]
const TeamTable = ({ teamName, isWin, players, myPuuid }: { teamName: string; isWin: boolean; players: Participant[] | undefined; myPuuid?: string }) => (
  <div className={`mb-4 rounded-xl border overflow-hidden ${isWin ? 'border-blue-200 dark:border-blue-700' : 'border-red-200 dark:border-red-700'}`}>
    <div className={`px-4 py-2 flex justify-between items-center ${isWin ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200'}`}>
      <span className="font-black text-sm uppercase">{teamName} ({isWin ? 'Victory' : 'Defeat'})</span>
      <div className="text-xs font-bold">
        <span className="opacity-70 mr-2">Total KDA</span>
        <span className="text-base">{calculateTeamKDA(players)}</span>
      </div>
    </div>
    <div className={`overflow-x-auto ${isWin ? 'bg-blue-50/30 dark:bg-blue-900/10' : 'bg-red-50/30 dark:bg-red-900/10'}`}>
      <table className="w-full text-sm table-fixed">
        <thead className={`text-[10px] uppercase font-bold ${isWin ? 'text-blue-400 dark:text-blue-300' : 'text-red-400 dark:text-red-300'}`}>
          <tr className="border-b border-gray-100 dark:border-gray-700">
            <th className="p-2 w-[25%] pl-4 text-left">Champion / Player</th>
            <th className="p-2 w-[20%] text-center">KDA</th>
            <th className="p-2 w-[20%] text-center">Damage</th>
            <th className="p-2 w-[15%] text-center">Vision</th>
            <th className="p-2 w-[10%] text-center">Spells</th>
            <th className="p-2 w-[30%] text-right pr-4">Items</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {players?.map((p, idx) => (
            <tr key={idx} className={`hover:bg-white/50 dark:hover:bg-gray-700/50 ${p.puuid === myPuuid ? 'bg-yellow-100/50 dark:bg-yellow-900/50' : ''}`}>
              <td className="p-2 pl-4">
                <div className="flex items-center gap-2">
                  <img src={`https://ddragon.leagueoflegends.com/cdn/16.3.1/img/champion/${p.championName}.png`} className="w-7 h-7 rounded-full" alt="" />
                  <div className="flex flex-col truncate">
                    <span className="font-bold text-gray-700 text-[11px] truncate dark:text-gray-200">{p.summonerName.split('#')[0]}</span>
                    <span className="text-[9px] text-gray-400 uppercase dark:text-gray-500">{p.teamPosition}</span>
                  </div>
                </div>
              </td>
              <td className="p-2 text-center text-[11px]">
                <div className="font-bold text-gray-700 dark:text-gray-200">{p.kda_str}</div>
                <div className="text-[9px] text-gray-400 dark:text-gray-500">{p.kda_score?.toFixed(2)}</div>
              </td>
              <td className="p-2">
                <div className="w-full max-w-[60px] mx-auto text-center">
                  <div className="h-1 bg-gray-200 rounded-full overflow-hidden dark:bg-gray-600">
                    <div className="h-full bg-red-400" style={{ width: `${Math.min((p.damage || 0) / 500, 100)}%` }}></div>
                  </div>
                  <span className="text-[9px] text-gray-500 dark:text-gray-400">{formatNumber(p.damage)}</span>
                </div>
              </td>
              <td className="p-2 text-center text-[11px] text-gray-500 dark:text-gray-400">{p.visionScore}</td>
              <td className="p-2 text-center">
                <div className="flex flex-col items-center gap-1">
                  {p.summonerSpell1 && p.summonerSpell1.icon && (
                    <img src={p.summonerSpell1.icon} alt={p.summonerSpell1.name} className="w-5 h-5 rounded" />
                  )}
                  {p.summonerSpell2 && p.summonerSpell2.icon && (
                    <img src={p.summonerSpell2.icon} alt={p.summonerSpell2.name} className="w-5 h-5 rounded" />
                  )}
                </div>
              </td>
              <td className="p-2 pr-4 text-right">
                <div className="flex flex-wrap justify-end gap-1">
                  {p.items?.map((item, itemIdx) => (
                    item ? (
                      <img key={itemIdx} src={item.icon} alt={item.name} className="w-6 h-6 rounded" />
                    ) : (
                      <div key={itemIdx} className="w-6 h-6 rounded bg-gray-200 dark:bg-gray-700"></div>
                    )
                  ))}
                </div>
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
      <div className="flex justify-between items-center mb-4">
        <nav className="flex gap-4">
          <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline">
            분석
          </Link>
          <Link href="/current-game" className="text-blue-600 dark:text-blue-400 hover:underline">
            현재 게임
          </Link>
        </nav>
        <ThemeToggleButton />
      </div>
      <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100">LoL AI 매크로 코치</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">최근 게임 데이터를 분석하여 당신의 운영과 멘탈을 진단합니다.</p>

      <div className="flex mb-8">
        <input
          className="border p-3 flex-1 mr-2 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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

      {error && <div className="p-4 mb-5 bg-red-100 text-red-700 rounded-lg dark:bg-red-800 dark:text-red-100">{error}</div>}

      {loading && (
        <div className="p-6 mb-5 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900 dark:border-blue-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-700 font-medium dark:text-blue-200">{loadingStage || '분석 중...'}</span>
            <span className="text-blue-600 text-sm dark:text-blue-300">{loadingProgress}%</span>
          </div>
          <div className="w-full bg-blue-100 rounded-full h-2 dark:bg-blue-800">
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
          <div className="p-6 bg-white border rounded-2xl shadow-sm flex items-center justify-between dark:bg-gray-800 dark:border-gray-700">
            <div className="flex items-center gap-4"> {/* flex container for image and text */}
              {(() => {
                const userTier = analysis.league?.[0]?.tier;
                // 'UNRANKED' 값이 백엔드에서 오지 않을 수도 있으므로, league[0] 자체가 없거나 tier 값이 없으면 UNRANKED로 처리
                const tierToDisplay = (analysis.league?.[0] && userTier && userTier !== 'UNRANKED') ? userTier.toUpperCase() : 'UNRANKED';
                const imageUrl = `/public/Ranked_Emblems_Latest/Rank=${tierToDisplay}.png`;

                console.log(`[DEBUG_TIER] User Tier: ${userTier}, Processed Tier: ${tierToDisplay}, Image URL: ${imageUrl}`);
                
                return (
                  <img
                    src={imageUrl}
                    alt={`${tierToDisplay} tier emblem`}
                    className="w-16 h-16 object-contain"
                  />
                );
              })()}
              <div>
                <h2 className="text-2xl font-black text-gray-800 dark:text-gray-100">
                  {analysis.user_info.name} <span className="text-gray-400 dark:text-gray-500">#{analysis.user_info.tag}</span>
                </h2>
                {analysis.league && analysis.league[0] ? (
                  <p className="text-blue-600 font-bold uppercase tracking-wider dark:text-blue-400">
                    {analysis.league[0].tier} {analysis.league[0].rank} — {analysis.league[0].leaguePoints} LP
                  </p>
                ) : (
                  <p className="text-gray-400 dark:text-gray-500">Unranked</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-black font-medium dark:text-gray-200">최근 승률</p>
              <p className="text-lg font-bold text-black dark:text-gray-100">
                {analysis.league[0] ?
                  ((analysis.league[0].wins / (analysis.league[0].wins + analysis.league[0].losses)) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>

          {analysis && (
            <section className="mt-12 space-y-4">
              <h3 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">최근 20게임 상세 분석</h3>

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
                      className={`cursor-pointer z-10 bg-white dark:bg-gray-800 p-5 rounded-2xl border-2 shadow-sm flex justify-between items-center transition-all
                    ${myStats?.win ? 'border-l-8 border-l-blue-500 hover:border-blue-300 dark:hover:border-blue-600' : 'border-l-8 border-l-red-500 hover:border-red-300 dark:hover:border-red-600'}`}
                    >
                      <div className="flex items-center gap-4">
                        <img src={`https://ddragon.leagueoflegends.com/cdn/16.3.1/img/champion/${myStats?.championName}.png`} className="w-10 h-10" alt="" />
                        <div>
                          <span className="text-xl text-black dark:text-gray-100 font-bold">{myStats?.championName}</span>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{formatGameMode(match.gameMode, match.queueType)}</p>
                        </div>
                      </div>
                      <div className="font-bold text-lg text-gray-900 dark:text-gray-100">
                        {myStats?.kills} / <span className="text-red-500 dark:text-red-400">{myStats?.deaths}</span> / {myStats?.assists}
                      </div>
                      <div className={`font-black ${myStats?.win ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                        {myStats?.win ? 'VICTORY' : 'DEFEAT'}
                        <p className="text-[10px] text-gray-400 font-normal dark:text-gray-500">{(match.gameDuration / 60).toFixed(0)}분 상세정보 {expandedMatchId === matchKey ? '▲' : '▼'}</p>
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
                      <div className="bg-white dark:bg-gray-800 border-x border-b rounded-b-2xl overflow-hidden shadow-inner animate-in fade-in slide-in-from-top-2 duration-300">
                        {match.teams?.map((team) => (
                          <div key={team.teamId} className={`p-4 ${team.win ? 'bg-blue-50/50 dark:bg-blue-900/50' : 'bg-red-50/50 dark:bg-red-900/50'} border-b dark:border-gray-700`}>
                            <h4 className={`text-sm font-bold ${team.win ? 'text-blue-700 dark:text-blue-200' : 'text-red-700 dark:text-red-200'} mb-2`}>
                              {team.teamId === 100 ? '블루팀' : '레드팀'} — {team.win ? '승리' : '패배'}
                            </h4>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs text-gray-600 dark:text-gray-400">밴:</span>
                              {team.bans.map((ban, banIdx) => (
                                ban.championId !== -1 && ban.championName !== "Unknown" ? (
                                  <img
                                    key={banIdx}
                                    src={`https://ddragon.leagueoflegends.com/cdn/16.3.1/img/champion/${ban.championName}.png`} // Use championName
                                    alt={ban.championName || `Ban ${banIdx + 1}`}
                                    className="w-5 h-5 rounded-full border border-gray-300 dark:border-gray-600"
                                  />
                                ) : (
                                  <div key={banIdx} className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600"></div>
                                )
                              ))}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-700 dark:text-gray-300">
                              <span>
                                <span className="font-bold">Baron:</span> {team.objectives.baron.kills} ({team.objectives.baron.first ? 'First' : ''})
                              </span>
                              <span>
                                <span className="font-bold">Dragon:</span> {team.objectives.dragon.kills} ({team.objectives.dragon.first ? 'First' : ''})
                              </span>
                              <span>
                                <span className="font-bold">Tower:</span> {team.objectives.tower.kills} ({team.objectives.tower.first ? 'First' : ''})
                              </span>
                            </div>
                          </div>
                        ))}
                        <table className="w-full text-sm table-fixed border-collapse">
                          <thead className="bg-gray-50 dark:bg-gray-700 text-[11px] text-gray-400 uppercase font-bold border-b dark:border-gray-600">
                            <tr>
                              <th className="p-3 w-[25%] text-left pl-6">Champion / Player</th>
                              <th className="p-3 w-[12%] text-center">KDA</th>
                              <th className="p-3 w-[10%] text-center">Spells</th>
                              <th className="p-3 w-[20%] text-right pr-6">Items</th>
                              <th className="p-3 w-[12%] text-center">Damage</th>
                              <th className="p-3 w-[21%] text-center">Stats (Gold/CS/Vision)</th>
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
                                    <tr key={`header-${idx}`} className={`${p.win ? 'bg-blue-50/50 dark:bg-blue-900/50' : 'bg-red-50/50 dark:bg-red-900/50'} border-y border-gray-100 dark:border-gray-700`}>
                                      <td colSpan={6} className="px-6 py-2">
                                        <div className="flex justify-between items-center">
                                          <span className={`font-black text-[11px] uppercase ${p.win ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                                            {isBlueTeam ? 'Blue Team' : 'Red Team'} — {p.win ? 'Victory' : 'Defeat'}
                                          </span>
                                          <span className="text-[11px] font-bold text-gray-500 dark:text-gray-300">Team Total KDA: {getTeamKDA(currentTeamPlayers)}</span>
                                        </div>
                                      </td>
                                    </tr>
                                  )}

                                  {/* 플레이어 행 */}
                                  <tr
                                    key={p.puuid || idx}
                                    className={`transition-colors border-b border-gray-50 last:border-0 dark:border-gray-700
                                  ${p.win ? 'hover:bg-blue-50/30 dark:hover:bg-blue-900/30' : 'hover:bg-red-50/30 dark:hover:bg-red-900/30'}
                                  ${p.puuid === analysis.user_info.puuid ? 'bg-yellow-50 font-semibold ring-inset ring-1 ring-yellow-200 dark:bg-yellow-900/30 dark:ring-yellow-700' : ''}`}
                                  >
                                    <td className="p-3 pl-6 w-[25%]"> {/* Adjusted width */}
                                      <div className="flex items-center gap-3">
                                        <img
                                          src={`https://ddragon.leagueoflegends.com/cdn/16.3.1/img/champion/${p.championName}.png`}
                                          className="w-8 h-8 rounded-full shadow-sm border border-white dark:border-gray-600"
                                          alt=""
                                        />
                                        <div className="flex flex-col truncate">
                                          <span className="text-gray-800 text-[12px] truncate dark:text-gray-100">{p.summonerName}</span>
                                          <span className="text-[9px] text-gray-400 uppercase font-mono dark:text-gray-500">{p.teamPosition || 'Unknown'}</span>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="p-3 text-center w-[12%]"> {/* KDA */}
                                      <div className="text-[12px] font-bold text-gray-700 dark:text-gray-200">{p.kda_str}</div>
                                      <div className="text-[10px] text-gray-400 dark:text-gray-500">{p.kda_score?.toFixed(2)}</div>
                                    </td>
                                    <td className="p-3 text-center w-[10%]"> {/* Spells */}
                                      <div className="flex flex-col items-center gap-1">
                                        {p.summonerSpell1 && p.summonerSpell1.icon && (
                                          <img src={p.summonerSpell1.icon} alt={p.summonerSpell1.name} className="w-5 h-5 rounded" />
                                        )}
                                        {p.summonerSpell2 && p.summonerSpell2.icon && (
                                          <img src={p.summonerSpell2.icon} alt={p.summonerSpell2.name} className="w-5 h-5 rounded" />
                                        )}
                                      </div>
                                    </td>
                                    <td className="p-3 pr-6 text-right w-[20%]"> {/* Items */}
                                      <div className="grid grid-cols-3 gap-1 justify-items-end"> {/* Modified for 3x2 grid */}
                                        {Array.from({ length: 6 }).map((_, itemIdx) => {
                                          const item = p.items?.[itemIdx];
                                          return item ? (
                                            <img key={itemIdx} src={item.icon} alt={item.name} className="w-6 h-6 rounded" />
                                          ) : (
                                            <div key={itemIdx} className="w-6 h-6 rounded bg-gray-200 dark:bg-gray-700"></div>
                                          );
                                        })}
                                      </div>
                                    </td>
                                    <td className="p-3 w-[12%]"> {/* Damage */}
                                      <div className="w-full max-w-[80px] mx-auto text-center">
                                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-1 dark:bg-gray-600">
                                          <div className="h-full bg-red-400" style={{ width: `${Math.min((p.damage || 0) / 500, 100)}%` }}></div>
                                        </div>
                                        <span className="text-[10px] text-gray-500 font-mono dark:text-gray-400">{formatNumber(p.damage)}</span>
                                      </div>
                                    </td>
                                    <td className="p-3 text-center w-[21%] text-gray-600 font-medium text-[12px] dark:text-gray-300">
                                      {/* Combined Stats */}
                                      <div className="flex flex-col gap-1 items-center">
                                        <div className="text-[10px]">💰 {formatNumber(p.gold)}</div>
                                        <div className="text-[10px]">🔪 {formatNumber(p.cs)} (
                                          {p.cs && match.gameDuration && match.gameDuration > 0
                                            ? (p.cs / (match.gameDuration / 60)).toFixed(1)
                                            : '0'}
                                          )
                                        </div>
                                        <div className="text-[10px]">👁️ {p.visionScore} ({p.wards})</div>
                                      </div>
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
            <div className="p-6 bg-white border rounded-2xl shadow-lg border-t-4 border-t-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:border-t-blue-700">
              <h3 className="text-lg font-bold mb-4 flex items-center text-gray-900 dark:text-gray-100">📍 AI 매크로 진단</h3>
              <div className="text-4xl font-black text-blue-600 mb-2 dark:text-blue-400">
                {analysis.analysis.macro_score.toFixed(1)}점
              </div>

              {/* 미니맵 동선 시각화 (간이 버전) */}
              <div className="relative w-full aspect-square bg-gray-100 rounded-lg overflow-hidden border dark:bg-gray-900 dark:border-gray-700">
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
              <p className="text-xs text-gray-400 mt-2 text-center dark:text-gray-500">게임 초반 20분간의 동선 흐름</p>
            </div>

            {/* 3. 멘탈 분석 카드 */}
            <div className="p-6 bg-white border rounded-2xl shadow-lg border-t-4 border-t-red-500 dark:bg-gray-800 dark:border-gray-700 dark:border-t-red-700">
              <h3 className="text-lg font-bold mb-4 flex items-center text-gray-900 dark:text-gray-100">🧠 AI 멘탈 진단</h3>
              <div className="text-4xl font-black text-red-500 mb-2 dark:text-red-400">
                {analysis.analysis.tilt_index > 100 ? "위험" : "안정"}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 mb-4 dark:bg-gray-600">
                <div
                  className="bg-red-500 h-4 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(analysis.analysis.tilt_index, 100)}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed dark:text-gray-300">
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