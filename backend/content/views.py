import os
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, parser_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Content, DownloadJob, DownloadHistory
from .utils.score import get_final_score
from .utils.fallback import get_fallback_content
from .utils.load_balancer import select_best_content
from django.http import FileResponse, HttpResponse, HttpResponseForbidden, Http404
from django.utils.timezone import now
from django.utils import timezone
from urllib.parse import quote as urlquote
from django.urls import reverse
from .permissions import can_download
from .utils.paths import rel_media_path

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
    client_id = request.data.get('client_id') or request.META.get('REMOTE_ADDR', 'client-x')
    scored_contents = [
        (get_final_score(content, device_info, client_id), content)
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
        'download_url': request.build_absolute_uri(
        reverse('download_direct', args=[best_content.id])
        ),
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
def download_job(request, content_id):

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

    created = False
    if not job:
        job = DownloadJob.objects.create(
            content=content, client_id=client_id, priority=priority
        )
        created = True
        # Celery 스케줄링 트리거
        from .tasks import schedule_downloads
        schedule_downloads.delay()

    message = ("다운로드 작업이 큐에 등록되었습니다." if created else "이미 다운로드가 진행 중입니다.")
    return Response({
        "job_id": job.id,
        "status": job.status,
        "percent": job.percent,  # 있으면 UI에 표시
        "secure_download_url": request.build_absolute_uri(
            reverse('download_secure', args=[content.id])
        ) + f"?job_id={job.id}",
        "message": message
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

# 보안 다운로드(권한/상태 확인 → X-Accel-Redirect)
@api_view(['GET'])
def download_secure(request, content_id):
    content = get_object_or_404(Content, id=content_id)
    job_id  = request.GET.get("job_id")

    # 준비 상태 확인
    if job_id:
        job = DownloadJob.objects.filter(id=job_id, content=content).first()
        if not job:
            return Response({"error": "invalid job"}, status=400)
        if job.status != DownloadJob.STATUS_SUCCESS:
            return Response({"status": job.status}, status=425)  # Too Early

    # 권한 판정
    if not can_download(request.user, content, job_id):
        return HttpResponseForbidden("no permission")

    # 실제 전송은 Nginx가
    if not content.file:
        raise Http404("file missing")

    rel = rel_media_path(content.file.path)
    filename = urlquote(os.path.basename(content.file.name))

    resp = HttpResponse()
    resp["Content-Type"] = "application/octet-stream"
    resp["Content-Disposition"] = f"attachment; filename*=UTF-8''{filename}"
    resp["X-Accel-Redirect"] = f"/protected/{rel}"
    return resp

# 개발/내부 테스트용 - 기존 direct는 유지(공개 배포용으로는 비권장)
@api_view(['GET'])
def download_direct(request, content_id):
    content = get_object_or_404(Content, id=content_id)
    file_path = content.file.path
    filename = os.path.basename(file_path)

    response = FileResponse(open(file_path, 'rb'), content_type='application/octet-stream')
    response["Content-Disposition"] = f"attachment; filename*=UTF-8''{urlquote(filename)}"
    return response