"use client";

import { useState } from 'react';
import ThemeToggleButton from '../components/ThemeToggleButton';
import Link from 'next/link';

interface CurrentGameParticipant {
  summonerName: string;
  championName: string;
  teamId: number;
  summonerSpell1: {
    id: string;
    name: string;
    icon: string;
  };
  summonerSpell2: {
    id: string;
    name: string;
    icon: string;
  };
}

interface CurrentGameInfo {
  status: "in_game" | "not_in_game";
  message?: string;
  gameId?: number;
  gameMode?: string;
  gameType?: string;
  gameStartTime?: number;
  mapId?: number;
  queueType?: string;
  participants?: CurrentGameParticipant[];
}

const CurrentGamePage: React.FC = () => {
  const [riotId, setRiotId] = useState('');
  const [currentGame, setCurrentGame] = useState<CurrentGameInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchCurrentGame = async () => {
    if (!riotId.includes('#')) {
      alert("Riot ID 형식(이름#태그)을 확인해주세요.");
      return;
    }

    setLoading(true);
    setError("");
    setCurrentGame(null);

    try {
      const encodedId = encodeURIComponent(riotId);
      const res = await fetch(`https://lol-ai-project.onrender.com/current-game/${encodedId}`); // Assuming your backend is deployed
      const data: CurrentGameInfo = await res.json();

      if (data.status === "not_in_game") {
        setCurrentGame(data);
      } else if (data.status === "in_game") {
        setCurrentGame(data);
      } else {
        setError(data.message || "알 수 없는 오류가 발생했습니다.");
      }
    } catch (err) {
      setError("서버와 통신 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const getTeamColor = (teamId: number) => {
    return teamId === 100 ? "text-blue-500" : "text-red-500";
  };

  const formatGameTime = (timestamp: number) => {
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - timestamp) / 1000);
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    return `${minutes}분 ${seconds}초`;
  };

  return (
    <div className="p-10 font-sans max-w-4xl mx-auto min-h-screen bg-background text-foreground">
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
      <h1 className="text-3xl font-bold mb-2">현재 게임 상태 확인</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">입력한 소환사가 현재 게임 중인지 확인합니다.</p>

      <div className="flex mb-8">
        <input
          className="border p-3 flex-1 mr-2 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          placeholder="예: 닉네임#KR1"
          value={riotId}
          onChange={(e) => setRiotId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchCurrentGame()}
        />
        <button
          className={`px-6 py-3 rounded-lg font-bold text-white transition ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
          onClick={fetchCurrentGame}
          disabled={loading}
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              확인 중...
            </div>
          ) : (
            '확인하기'
          )}
        </button>
      </div>

      {error && <div className="p-4 mb-5 bg-red-100 text-red-700 rounded-lg dark:bg-red-800 dark:text-red-100">{error}</div>}

      {currentGame && currentGame.status === "not_in_game" && (
        <div className="p-6 bg-yellow-100 text-yellow-800 rounded-lg dark:bg-yellow-900 dark:text-yellow-100">
          {currentGame.message}
        </div>
      )}

      {currentGame && currentGame.status === "in_game" && currentGame.participants && (
        <div className="p-6 bg-white border rounded-2xl shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
            {currentGame.queueType} 중 <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({formatGameTime(currentGame.gameStartTime || 0)})</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[100, 200].map(teamId => (
              <div key={teamId} className="border rounded-lg dark:border-gray-700">
                <div className={`p-3 font-bold text-white ${teamId === 100 ? 'bg-blue-600' : 'bg-red-600'}`}>
                  {teamId === 100 ? '블루팀' : '레드팀'}
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {currentGame.participants?.filter(p => p.teamId === teamId).map((participant, pIdx) => (
                    <div key={pIdx} className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <img
                        src={`https://ddragon.leagueoflegends.com/cdn/16.3.1/img/champion/${participant.championName}.png`} // Use dynamic version
                        alt={participant.championName}
                        className="w-10 h-10 rounded-full mr-3 border border-gray-300 dark:border-gray-600"
                      />
                      <div className="flex-1">
                        <span className={`font-bold text-gray-800 dark:text-gray-100 ${getTeamColor(participant.teamId)}`}>{participant.summonerName}</span>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{participant.championName}</p>
                      </div>
                      <div className="flex gap-1">
                        {participant.summonerSpell1 && participant.summonerSpell1.icon && (
                          <img
                            src={participant.summonerSpell1.icon}
                            alt={participant.summonerSpell1.name}
                            className="w-6 h-6 rounded"
                            title={participant.summonerSpell1.name}
                          />
                        )}
                        {participant.summonerSpell2 && participant.summonerSpell2.icon && (
                          <img
                            src={participant.summonerSpell2.icon}
                            alt={participant.summonerSpell2.name}
                            className="w-6 h-6 rounded"
                            title={participant.summonerSpell2.name}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CurrentGamePage;