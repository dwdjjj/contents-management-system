from content.models import DownloadHistory

def get_fallback_content(scored_contents: list, failed_content_id: int, client_id: str, requested_name: str):
    """
    - scored_contents: [(score, Content)] 점수순 정렬
    - failed_content_id: 실패한 콘텐츠 ID
    - client_id: 다운로드 요청한 클라이언트
    - requested_name: 요청한 콘텐츠 이름
    """
    from content.utils.score import get_dependent_contents

    for score, content in scored_contents:
        # 동일 콘텐츠는 제외
        if content.id == failed_content_id:
            continue

        # 요청한 name과 다른 콘텐츠는 제외 (안전성 보장)
        if content.name != requested_name:
            continue

        # 실패율 50% 이상이면 제외
        total = DownloadHistory.objects.filter(content=content, client_id=client_id).count()
        failed = DownloadHistory.objects.filter(content=content, client_id=client_id, success=False).count()
        if total > 0 and failed / total >= 0.5:
            continue

        # 의존성 있는 경우 필수 콘텐츠 존재 여부 검사
        required_ids = get_dependent_contents(content)
        if required_ids:
            for req_id in required_ids:
                if not DownloadHistory.objects.filter(content_id=req_id, client_id=client_id, success=True).exists():
                    break  # 의존 콘텐츠 미보유 → 이 콘텐츠도 사용 불가
            else:
                return content  # 의존성 만족 → fallback 성공
        else:
            return content  # 의존성 없음 → fallback 성공

    return None  # 모든 후보 실패