import os
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, parser_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Content, DownloadJob, DownloadHistory
from .utils.score import get_final_score
from .utils.fallback import get_fallback_content
from .utils.load_balancer import select_best_content
from django.http import FileResponse
from django.utils.timezone import now
from django.utils import timezone
from django.db import transaction
from .tasks import schedule_downloads
from urllib.parse import quote as urlquote

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
        fallback = get_fallback_content(
            scored_contents,
            int(failed_content_id),
            client_id=request.data.get('client_id'),
            requested_name=requested_name
        )

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

CHUNK_SIZE = 8 * 1024  # 8KB

@api_view(['GET'])
def download_proxy(request, content_id):

    content = get_object_or_404(Content, id=content_id)
    client_id = request.GET.get('client_id') or request.META.get('REMOTE_ADDR', 'client-x')

    tier = request.GET.get('tier', 'free')
    tier_priority = {'free': 0, 'standard': 1, 'premium': 2}
    priority = tier_priority.get(tier, 0)

    # 이미 요청한 작업이 있는지 확인
    job = DownloadJob.objects.filter(
        content=content,
        client_id=client_id,
        status__in=[
            DownloadJob.STATUS_PENDING,
            DownloadJob.STATUS_INPROGRESS
        ]
    ).first()

    if not job:
        job = DownloadJob.objects.create(
            content=content,
            client_id=client_id,
            priority=priority,
        )
        transaction.on_commit(lambda: schedule_downloads.delay())

    return Response({
        "job_id": job.id,
        "status": job.status,
        "message": "다운로드 작업이 큐에 등록되었습니다." if job.status == 'pending' else "이미 다운로드가 진행 중입니다."
    })

@api_view(['GET'])
def get_download_history(request, client_id):
    histories = (
        DownloadHistory.objects
        .filter(client_id=client_id)
        .order_by('-timestamp')[:20]  # 최근 20개만
    )
    data = [
        {
            "id": h.id,
            "content": h.content.name,
            "success": h.success,
            "timestamp": h.timestamp,
            "content_id": h.content.id
        }
        for h in histories
    ]
    return Response(data)

@api_view(['GET'])
def download_direct(request, content_id):
    content = get_object_or_404(Content, id=content_id)
    file_path = content.file.path
    filename = os.path.basename(file_path)

    response = FileResponse(open(file_path, 'rb'), content_type='application/octet-stream')
    response["Content-Disposition"] = f"attachment; filename*=UTF-8''{urlquote(filename)}"
    return response