from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, parser_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Content
from .utils.score import get_final_score
from .utils.fallback import get_fallback_content
from .utils.broadcast import broadcast_download
from .utils.load_balancer import select_best_content
from django.utils.timezone import now
from django.http import FileResponse
from django.utils import timezone
import time
from .models import DownloadJob, Content
from .tasks import schedule_downloads

# 클라이언트 요청 시, 디바이스 기반으로 콘텐츠 매칭해서 다운로드 URL 반환
@api_view(['POST'])
def get_best_content(request):
    device_info = request.data.get('device_info')
    requested_name = request.data.get('requested_content')
    failed_content_id = request.data.get('failed_content_id')

    if not device_info or not requested_name:
        return Response({'error': 'Invalid request'}, status=400)

    # 콘텐츠 조회: original 포함한 전체
    contents = Content.objects.filter(name=requested_name)

    # high/normal/low 타입이 있으면 original 제외
    if contents.exclude(type='original').exists():
        contents = contents.exclude(type='original')

    # 점수 계산 (호환성 + 실패율 패널티 포함)
    scored_contents = [
        (get_final_score(content, device_info, content.meta_info), content)
        for content in contents
    ]
    scored_contents.sort(key=lambda x: x[0], reverse=True)

    # fallback 요청인 경우
    if failed_content_id:
        fallback = get_fallback_content(scored_contents, int(failed_content_id))
        if fallback:
            return Response({
                'fallback': True,
                'id': fallback.id,
                'download_url': request.build_absolute_uri(fallback.file.url),
                'type': fallback.type,
                'version': fallback.version
            })
        else:
            return Response({'error': 'No fallback available'}, status=404)

    # 최초 요청인 경우: 로드밸런싱 알고리즘 선택
    best_content = select_best_content(scored_contents)

    if not best_content:
        return Response({'error': 'No content found'}, status=404)

    return Response({
        'fallback': False,
        'id': best_content.id,
        'download_url': request.build_absolute_uri(best_content.file.url),
        'type': best_content.type,
        'version': best_content.version
    })

@api_view(['GET'])
def list_all_contents(request):
    originals = Content.objects.filter(type='original').order_by('-uploaded_at')
    data = []
    for orig in originals:
        # parent가 orig인 자식 레코드를 직접 쿼리
        variants = Content.objects.filter(parent=orig)

        data.append({
            'id': orig.id,
            'name': orig.name,
            'type': orig.type,
            'version': orig.version,
            'uploaded_at': orig.uploaded_at,
            'conversion_status': orig.conversion_status,
            'variants': [
                {
                    'id': v.id,
                    'type': v.type,
                    'version': v.version,
                    'url': request.build_absolute_uri(v.file.url),
                } for v in orig.variants.all()
            ]
        })
    return Response(data)

# 콘텐츠 업로드
@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def upload_content(request):
    name = request.data.get('name')
    version = request.data.get('version', '1.0.0')
    content_type = request.data.get('type', 'original')
    file = request.FILES.get('file')
    meta_info = {
        'required_chipset': request.POST.get('chipset'),
        'min_memory': int(request.POST.get('min_memory', 0)),
        'resolution': request.POST.get('resolution')
    }

    if not file or not name:
        return Response({"error": "Missing required fields."}, status=400)

    if content_type == 'original':
        existing = Content.objects.filter(name=name, type='original').first()
        if existing:
            # 기존 original에 최신업로드한 콘텐츠 덮어쓰기
            existing.version = version
            existing.file = file
            existing.meta_info = meta_info
            existing.uploaded_at = timezone.now()
            existing.save()
            return Response({'message': f'"{name}" original 콘텐츠가 업데이트되었습니다.', 'id': existing.id})

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

@api_view(['GET'])
def download_proxy(request, content_id):
    # 콘텐츠 & 클라이언트 식별
    content = get_object_or_404(Content, id=content_id)
    client_id = request.GET.get('client_id')

    # 클라이언트 계층별 우선순위 매핑
    tier          = request.GET.get('tier', 'free')  # ?tier=standard 등으로 전달
    tier_priority = {'free': 0, 'standard': 1, 'premium': 2}
    priority      = tier_priority.get(tier, 0)

    # 다운로드 큐에 등록 (priority 반영)
    job = DownloadJob.objects.create(
        content=content,
        client_id=client_id,
        priority=priority,
    )
    # 큐 스케줄러 실행
    schedule_downloads.delay()

    request_id = f"{content.name}-{job.id}"

    # 25% 단위로 진행 상황 발행
    for progress in [0, 25, 50, 75, 100]:
        broadcast_download(request_id, content.name, client_id, progress)
        time.sleep(0.1)

    # 파일 스트리밍
    return FileResponse(
        content.file.open('rb'),
        as_attachment=True,
        filename=content.file.name
    )