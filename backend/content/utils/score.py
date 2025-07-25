# 기본 점수
def compute_compatibility_score(device, content_meta):
    
    chipset_score = 10 if content_meta.get('required_chipset') == device.get('chipset') else (
        5 if content_meta.get('required_chipset', '').split('8')[0] in device.get('chipset', '') else 0
    )

    memory_score = 10 if device.get('memory', 0) >= content_meta.get('min_memory', 0) + 2 else (
        5 if device.get('memory', 0) >= content_meta.get('min_memory', 0) else 0
    )

    resolution_score = 10 if content_meta.get('resolution') == device.get('resolution') else (
        5 if '720' in content_meta.get('resolution', '') and '1080' in device.get('resolution', '') else 0
    )

    return {
        'chipset': chipset_score,
        'memory': memory_score,
        'resolution': resolution_score
    }

def apply_success_penalty(content, client_id):
    from content.models import DownloadHistory
    total = DownloadHistory.objects.filter(content=content, client_id=client_id).count()
    failed = DownloadHistory.objects.filter(content=content, client_id=client_id, success=False).count()
    if total == 0:
        return 1.0
    rate = 1 - (failed / total)
    return max(rate, 0.6)  # 너무 낮으면 무시

def get_final_score(content, device_info, client_id):
    scores = compute_compatibility_score(device_info, content.meta_info)
    penalty = apply_success_penalty(content, client_id)

    final_score = (
        scores['chipset'] * 0.4 +
        scores['memory'] * 0.3 +
        scores['resolution'] * 0.3
    ) * penalty

    return final_score

def get_dependent_contents(main_content):
    return list(main_content.dependencies.values_list('required', flat=True))
