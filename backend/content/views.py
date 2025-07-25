from django.shortcuts import render
from rest_framework.decorators import api_view, parser_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Content
from .utils.compatibility import get_compatibility_score
from .utils.fallback import get_fallback_content
from .utils.broadcast import broadcast_download
from django.utils.timezone import now

# 클라이언트 요청 시, 디바이스 기반으로 콘텐츠 매칭해서 다운로드 URL 반환
@api_view(['POST'])
def get_best_content(request):
    device_info = request.data.get('device_info')
    requested_name = request.data.get('requested_content')
    failed_content_id = request.data.get('failed_content_id')

    if not device_info or not requested_name:
        return Response({'error': 'Invalid request'}, status=400)

    contents = Content.objects.filter(name=requested_name).exclude(type='original')
    scored_contents = [
        (get_compatibility_score(device_info, content.meta_info), content)
        for content in contents
    ]
    scored_contents.sort(key=lambda x: x[0], reverse=True)

    if failed_content_id:
        fallback = get_fallback_content(scored_contents, int(failed_content_id))
        if fallback:
            return Response({
                'fallback': True,
                'download_url': fallback.file.url,
                'type': fallback.type,
                'version': fallback.version
            })
        else:
            return Response({'error': 'No fallback available'}, status=404)

    from .utils.load_balancer import select_best_content
    best_content = select_best_content(scored_contents)

    if not best_content:
        return Response({'error': 'No content found'}, status=404)

    broadcast_download(best_content.name, device_info)

    return Response({
        'fallback': False,
        'download_url': best_content.file.url,
        'type': best_content.type,
        'version': best_content.version
    })

@api_view(['GET'])
def list_all_contents(request):
    contents = Content.objects.all().order_by('-uploaded_at')
    domain = request.build_absolute_uri('/')[:-1]  # ex) http://localhost:8000
    
    data = [
        {
            'id': c.id,
            'name': c.name,
            'type': c.type,
            'version': c.version,
            'uploaded_at': c.uploaded_at,
            'download_url': domain + c.file.url
        }
        for c in contents
    ]
    return Response(data)


# 관리자 콘텐츠 업로드용
@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def upload_content(request):
    name = request.data.get('name')
    version = request.data.get('version', '1.0.0')
    content_type = request.data.get('type', 'original')
    file = request.FILES.get('file')

    if not file or not name:
        return Response({"error": "Missing required fields."}, status=400)

    meta_info = {
        'required_chipset': request.data.get('chipset', ''),
        'min_memory': int(request.data.get('min_memory', 0)),
        'resolution': request.data.get('resolution', '1080p')
    }

    content = Content.objects.create(
        name=name,
        type=content_type,
        version=version,
        file=file,
        meta_info=meta_info,
        uploaded_at=now()
    )

    return Response({
        "message": "콘텐츠 업로드 완료",
        "id": content.id,
        "name": content.name,
        "type": content.type,
        "version": content.version
    })