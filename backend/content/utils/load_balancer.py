import random

def select_best_content(scored_contents):
    if not scored_contents:
        return None

    # 최고 점수만 필터링
    top_score = scored_contents[0][0]
    top_candidates = [c for s, c in scored_contents if s == top_score]

    # 랜덤 선택
    return random.choice(top_candidates)