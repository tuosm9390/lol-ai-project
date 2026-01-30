# FastAPI 백엔드 배포 가이드

배포 전에 **환경 변수 `RIOT_API_KEY`**를 반드시 설정하세요. (Riot Developer Portal에서 발급)

---

## 방법 1: Render (무료 티어, 추천)

1. **https://render.com** 가입 후 로그인.
2. **Dashboard** → **New +** → **Web Service**.
3. **Connect a repository**에서 GitHub 저장소 `tuosm9390/lol-ai-project` 연결.
4. 설정:
   - **Name**: `lol-ai-backend` (원하는 이름)
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. **Environment** 탭에서 변수 추가:
   - Key: `RIOT_API_KEY`  
   - Value: (발급받은 Riot API 키)
6. **Create Web Service** 클릭.

배포가 끝나면 `https://lol-ai-backend.onrender.com` 같은 URL이 부여됩니다.  
(무료 플랜은 15분 미사용 시 슬립되며, 첫 요청 시 수십 초 걸릴 수 있습니다.)

---

## 방법 2: Railway

1. **https://railway.app** 가입 후 로그인.
2. **New Project** → **Deploy from GitHub repo** → `tuosm9390/lol-ai-project` 선택.
3. 생성된 서비스 클릭 → **Settings**:
   - **Root Directory**: `backend`
   - **Build Command**: (비워두거나 `pip install -r requirements.txt`)
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. **Variables** 탭에서:
   - `RIOT_API_KEY` = (발급받은 API 키)
5. **Deploy** 후 **Settings** → **Generate Domain**으로 URL 생성.

---

## 방법 3: Fly.io

1. **https://fly.io** 가입 후 로컬에 [flyctl 설치](https://fly.io/docs/hands-on/install-flyctl/).
2. 터미널에서:
   ```bash
   cd backend
   fly launch
   ```
   - App name 입력, Region 선택, PostgreSQL 등은 No.
3. `fly.toml`이 생성되면 **Build** 섹션에 다음 추가:
   ```toml
   [build]
     [build.args]
   ```
   그리고 **Services** 섹션에:
   ```toml
   [env]
     PORT = "8080"
   ```
   (Fly는 기본 8080 사용.)
4. 시크릿 설정:
   ```bash
   fly secrets set RIOT_API_KEY=여기에_API_키
   ```
5. 배포:
   ```bash
   fly deploy
   ```

---

## 배포 후 확인

- 브라우저에서 `https://(배포된-URL)/` → `{"message":"LoL AI Backend API", "docs":"/docs"}` 확인.
- `https://(배포된-URL)/docs` 에서 Swagger UI로 API 테스트 가능.

---

## 프론트엔드에서 백엔드 URL 연결

백엔드를 별도 URL로 배포한 경우, **프론트엔드**가 그 URL을 쓰도록 설정해야 합니다.

- **Vercel(Next.js API 라우트)만 쓰는 경우**: 현재처럼 API 라우트에서 Riot API를 직접 호출하면 백엔드 배포는 필요 없습니다.
- **Next.js에서 이 FastAPI 백엔드를 호출하도록 한 경우**:  
  프론트엔드의 API 호출 주소를 `https://(백엔드-배포-URL)` 로 바꾸고, CORS는 이미 `allow_origins=["*"]` 이므로 동일 도메인/다른 도메인 모두 요청 가능합니다.

---

## 로컬에서 환경 변수 쓰기

배포와 동일하게 `RIOT_API_KEY`를 쓰려면:

**Windows (PowerShell):**
```powershell
$env:RIOT_API_KEY = "RGAPI-xxxx"
cd backend
uvicorn main:app --reload --port 8000
```

**또는 `.env` 파일 (backend 폴더에):**
```
RIOT_API_KEY=RGAPI-xxxx
```
그리고 `pip install python-dotenv` 후 `main.py` 상단에:
```python
from dotenv import load_dotenv
load_dotenv()
```
를 추가하면 로컬에서도 `.env` 값이 적용됩니다.
