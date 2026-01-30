# Windows에서 Redis 실행하기

백엔드 캐시를 사용하려면 Redis 서버가 **localhost:6379**에서 실행 중이어야 합니다.

- **Docker가 없다면** → 아래 **방법 2: Memurai**로 5분 안에 설치 후 바로 사용 가능합니다.
- **Docker가 있다면** → **방법 1: Docker**로 `docker compose up -d redis` 한 번이면 됩니다.

## 방법 1: Docker (Docker Desktop 설치된 경우)

1. **Docker Desktop for Windows** 설치: https://www.docker.com/products/docker-desktop/
2. Docker Desktop 실행 후, 프로젝트 루트(`lol-ai-project`)에서 터미널을 엽니다.
3. 다음 중 하나를 실행합니다.

   ```powershell
   # PowerShell (프로젝트 루트에서)
   docker compose up -d redis
   ```

   또는 백엔드 스크립트 사용:

   ```powershell
   cd backend\scripts
   .\start-redis.ps1
   ```

4. Redis가 **6379** 포트로 올라갑니다. 백엔드 서버를 실행하면 "Redis 연결 성공"이 표시됩니다.

---

## 방법 2: Memurai (Redis 호환, Windows 네이티브)

Docker를 쓰지 않을 때 사용할 수 있는 Windows용 Redis 호환 서버입니다.

1. **Memurai Developer** 다운로드: https://www.memurai.com/get-memurai  
   (개발용 무료)
2. 설치 후 Memurai 서비스가 자동으로 실행됩니다. 기본 포트는 **6379**입니다.
3. (선택) 서비스가 꺼져 있다면:  
   `서비스` 앱에서 "Memurai"를 찾아 시작합니다.

---

## 방법 3: WSL2에서 Redis 실행

1. WSL2가 설치되어 있다고 가정합니다.
2. WSL 터미널에서:

   ```bash
   sudo apt update
   sudo apt install redis-server -y
   redis-server --daemonize yes
   ```

3. WSL2의 localhost는 Windows에서 그대로 접근 가능하므로, 백엔드에서 `localhost:6379`로 연결하면 됩니다.

---

## 연결 확인

- Redis(Docker/Memurai/WSL) 실행 후 백엔드 서버를 띄우면 터미널에 **"Redis 연결 성공"**이 한 번 출력됩니다.
- 에러가 계속 나오면:
  - Redis(또는 Memurai) 서비스/컨테이너가 실제로 실행 중인지 확인하고,
  - 방화벽에서 **6379** 포트가 막히지 않았는지 확인하세요.
