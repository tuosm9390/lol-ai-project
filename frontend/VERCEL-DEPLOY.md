# Vercel로 배포하기

이 프로젝트는 **Next.js 프론트엔드 + API 라우트**로 구성되어 있어, **Python 백엔드 없이** Vercel만으로 배포할 수 있습니다. (API 라우트에서 Riot API를 직접 호출합니다.)

---

## 1. GitHub에 코드 푸시

먼저 프로젝트를 GitHub 저장소에 올려두세요.

```bash
git add .
git commit -m "Prepare for Vercel deploy"
git push origin main
```

---

## 2. Vercel에서 프로젝트 가져오기

1. **https://vercel.com** 접속 후 로그인 (GitHub 계정 연동 권장).
2. **Add New...** → **Project** 클릭.
3. **Import Git Repository**에서 `tuosm9390/lol-ai-project` 선택 후 **Import**.
4. **Root Directory** 설정:
   - **Edit** 클릭 후 `frontend` 입력.
   - (프론트엔드 코드가 `frontend` 폴더에 있으므로 반드시 설정.)

---

## 3. 환경 변수 설정 (Riot API 키)

1. 프로젝트 Import 화면에서 **Environment Variables** 섹션으로 이동.
2. **Name**: `RIOT_API_KEY`  
   **Value**: [Riot Developer Portal](https://developer.riotgames.com/)에서 발급한 API 키.
3. **Environment**: Production, Preview, Development 모두 체크 후 **Save**.

---

## 4. 배포 실행

1. **Deploy** 버튼 클릭.
2. 빌드가 끝나면 **Visit** 로 접속해 동작 확인.

---

## 5. 이후 업데이트 배포

GitHub에 `main`(또는 연결한 브랜치)에 푸시하면 Vercel이 자동으로 다시 배포합니다.

```bash
git add .
git commit -m "Update"
git push origin main
```

---

## 참고

- **도메인**: Vercel이 `프로젝트명.vercel.app` 형태의 URL을 자동 부여합니다.
- **커스텀 도메인**: Vercel 대시보드 → Project → Settings → Domains에서 추가 가능.
- **API 키 보안**: `RIOT_API_KEY`는 Vercel 환경 변수에만 넣고, 코드/README에는 넣지 마세요.
