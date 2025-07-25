def get_fallback_content(scored_contents: list, failed_content_id: int):
    """
    scored_contents: [(score, Content), ...]  ← 호환성 점수순으로 정렬
    failed_content_id: 실패한 콘텐츠 ID
    """
    for score, content in scored_contents:
        if content.id != failed_content_id:
            return content
    return None  # fallback 불가
