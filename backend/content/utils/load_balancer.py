import random

def select_best_content(scored_contents):
    if not scored_contents:
        return None
    scored_contents.sort(key=lambda x: x[0], reverse=True)
    top_score = scored_contents[0][0]
    top_candidates = [c for c in scored_contents if c[0] == top_score]
    return random.choice(top_candidates)[1]
