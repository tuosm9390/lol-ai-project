# LoL AI 매크로 코치

리그 오브 레전드 게임 데이터를 AI로 분석하여 사용자의 매크로 운영 능력과 멘탈 상태를 진단하는 웹 애플리케이션입니다.

## 🎯 주요 기능

- **사용자 분석**: Riot ID를 입력하여 소환사 정보와 티어 조회
- **매치 히스토리**: 최근 20게임의 상세 데이터 분석
- **AI 매크로 진단**: 게임 내 동선 분석을 통한 오브젝트 컨트롤 능력 평가
- **AI 멘탈 진단**: 데스 간격 분석을 통한 틸트(Tilt) 위험도 측정
- **상세 통계**: KDA, 시야 점수, CS, 골드 획득량 등 종합적인 게임 데이터 제공

## 🏗️ 프로젝트 구조

```
lol-ai-project/
├── backend/                 # FastAPI 백엔드
│   ├── main.py             # 메인 API 서버
│   ├── async_riot_api.py   # 비동기 Riot API 클라이언트
│   ├── riot_api.py         # 동기 Riot API 클라이언트
│   ├── analyzer.py         # 게임 데이터 분석 로직
│   └── cache_manager.py    # Redis 캐시 관리
├── frontend/               # Next.js 프론트엔드
│   └── src/
│       └── app/
│           └── page.tsx   # 메인 페이지
├── docker-compose.yml      # Redis 설정
└── requirements.txt         # Python 의존성
```

## 🚀 기술 스택

### Backend
- **FastAPI**: 고성능 웹 API 프레임워크
- **aiohttp**: 비동기 HTTP 클라이언트
- **Redis**: 데이터 캐싱 (선택사항)
- **numpy**: 수치 계산 및 데이터 분석

### Frontend
- **Next.js 16**: React 풀스택 프레임워크
- **TypeScript**: 타입 안전성
- **Tailwind CSS**: 스타일링
- **Recharts**: 데이터 시각화
- **Lucide React**: 아이콘 라이브러리

## 📋 설치 및 실행

### 1. 저장소 클론
```bash
git clone <repository-url>
cd lol-ai-project
```

### 2. 백엔드 설정
```bash
cd backend

# 가상환경 생성 (선택사항)
python -m venv venv

# 의존성 설치
pip install -r requirements.txt

# Redis 실행 (선택사항, 성능 향상을 위해 권장)
docker-compose up -d redis
```

### 3. 프론트엔드 설정
```bash
cd frontend

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

### 4. 백엔드 서버 실행
```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## 🔧 환경 설정

### Riot API 키
`backend/main.py` 파일에서 API 키를 설정해야 합니다:

```python
API_KEY = "RGAPI-YOUR_API_KEY_HERE"
```

Riot API 키는 [Riot Games Developer Portal](https://developer.riotgames.com/)에서 발급받을 수 있습니다.

## 📊 API 엔드포인트

### `GET /analyze-user/{riot_id}`
Riot ID 형식(`이름#태그`)으로 사용자 분석 데이터를 조회합니다.

**응답 데이터:**
- `user_info`: 사용자 기본 정보
- `league`: 리그 정보 및 티어
- `match_details`: 최근 20게임 상세 데이터
- `analysis`: AI 분석 결과 (매크로 점수, 멘탈 지수)

## 🧠 AI 분석 알고리즘

### 매크로 분석
- 게임 타임라인 데이터에서 플레이어 위치 정보 추출
- 주요 오브젝트(드래곤, 바론 등) 근처 체류 시간 분석
- 오브젝트 컨트롤 능력을 백분율로 평가

### 멘탈 분석
- 데스 타임스탬프 간격 분석
- 연속 데스 패턴 감지
- 표준 편차를 이용한 틸트 위험도 계산

## 🎨 UI/UX 특징

- **반응형 디자인**: 모든 기기에서 최적화된 화면 제공
- **실시간 로딩**: 진행 상황을 시각적으로 표시
- **상세 드롭다운**: 매치별 상세 정보 확인 가능
- **시각적 분석**: 미니맵 동선 시각화, 그래프 차트 제공

## 📝 개발 참고사항

### 캐시 전략
- Redis를 사용하여 API 호출 최소화
- PUUID, 리그 정보, 매치 데이터별로 다른 TTL 적용
- Redis가 없는 경우에도 정상 작동하도록 fallback 구현

### 비동기 처리
- `aiohttp`를 사용한 병렬 API 호출
- Rate Limit 준수를 위한 Semaphore 적용
- 동기/비동기 모드 자동 전환

### 에러 핸들링
- API 호출 실패 시 graceful degradation
- 사용자 친화적인 에러 메시지 제공
- 타임아웃 및 재시도 로직 구현

## 🤝 기여

이 프로젝트는 개인 학습용으로 개발되었습니다. 버그 리포트나 기능 제안은 환영합니다.

## 📄 라이선스

이 프로젝트는 개인용으로 사용됩니다. Riot API의 사용 약관을 준수해야 합니다.

## 🔗 관련 링크

- [Riot Games API Documentation](https://developer.riotgames.com/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)

