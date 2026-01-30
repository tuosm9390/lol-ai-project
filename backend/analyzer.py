import numpy as np

def analyze_game(timeline_data, participant_id="1"):
    """게임 타임라인 데이터 분석"""
    try:
        if not timeline_data or 'info' not in timeline_data:
            print("타임라인 데이터가 없거나 형식이 잘못됨")
            return {
                "macro_score": 0,
                "tilt_index": 0,
                "positions": [],
                "error": "타임라인 데이터 없음"
            }
        
        frames = timeline_data['info']['frames']
        if not frames:
            print("프레임 데이터가 없음")
            return {
                "macro_score": 0,
                "tilt_index": 0,
                "positions": [],
                "error": "프레임 데이터 없음"
            }
        
        positions = []
        death_timestamps = []

        # 1. 데이터 파싱
        for frame in frames:
            p_frame = frame['participantFrames'].get(participant_id)
            if p_frame:
                positions.append(p_frame['position'])
            
            # 데스 이벤트 수집 (멘탈 분석용)
            for event in frame['events']:
                if event.get('type') == 'CHAMPION_SPECIAL_KILL' or event.get('type') == 'CHAMPION_KILL':
                    if event.get('victimId') == int(participant_id):
                        death_timestamps.append(event['timestamp'])

        # 2. 매크로 분석 (예: 오브젝트 근처 체류 시간)
        # 드래곤 둥지 좌표 대략 (9800, 4400)
        dragon_pos = np.array([9800, 4400])
        at_objective = 0
        for pos in positions:
            p = np.array([pos['x'], pos['y']])
            if np.linalg.norm(p - dragon_pos) < 2000:
                at_objective += 1

        # 3. 멘탈 분석 (데스 간격 표준 편차)
        tilt_score = 0
        if len(death_timestamps) > 2:
            intervals = np.diff(death_timestamps)
            tilt_score = np.std(intervals) / 1000 # 초 단위 변환

        result = {
            "macro_score": (at_objective / len(frames)) * 100 if frames else 0,
            "tilt_index": tilt_score,
            "positions": positions[:20] # 시각화용 샘플 데이터
        }
        
        print(f"분석 결과: {result}")
        return result
        
    except Exception as e:
        print(f"분석 중 오류 발생: {e}")
        return {
            "macro_score": 0,
            "tilt_index": 0,
            "positions": [],
            "error": str(e)
        }