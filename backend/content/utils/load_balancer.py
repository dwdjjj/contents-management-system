PREFERENCE = {'high': 3, 'normal': 2, 'low': 1}

def select_best_content(scored_contents):
    """
    scored_contents: [(score, Content), ...] 이미 score 내림차순 정렬됨
    점수 같을시 high -> low 순으로
    """
    if not scored_contents:
        return None

    top_score = scored_contents[0][0]
    top_items = [c for (s,c) in scored_contents if s == top_score]

    if len(top_items) == 1:
        return top_items[0]

    # type별 우선순위 역정렬
    top_items.sort(key=lambda content: PREFERENCE.get(content.type, 0), reverse=True)
    return top_items[0]