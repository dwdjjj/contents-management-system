def get_compatibility_score(device_info: dict, content_meta: dict) -> int:
    """
    device_info: {
        'chipset': 'snapdragon888',
        'memory': 6,
        'resolution': '1080p'
    }
    content_meta: {
        'required_chipset': 'snapdragon888',
        'min_memory': 4,
        'resolution': '1080p'
    }
    """
    score = 0

    if content_meta.get('required_chipset') in device_info.get('chipset', ''):
        score += 5
    if device_info.get('memory', 0) >= content_meta.get('min_memory', 0):
        score += 3
    if content_meta.get('resolution') == device_info.get('resolution'):
        score += 2

    return score